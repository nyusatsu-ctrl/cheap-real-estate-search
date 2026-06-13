import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

export async function upsertCandidates({ source, candidates, commit }) {
  if (!commit) {
    return { inserted: 0, updated: 0, skipped: candidates.length };
  }

  return persistCrawlResult({ source, candidates, commit });
}

export async function persistCrawlResult({
  source,
  candidates,
  commit,
  found = candidates.length,
  skipped = 0,
  failed = 0,
  errors = [],
  startedAt = new Date().toISOString()
}) {
  if (!commit) {
    return { inserted: 0, updated: 0, skipped: candidates.length, failed: 0 };
  }

  loadEnvFile(".env.local");
  const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const propertySourceId = await ensurePropertySource(supabase, source);
  const crawlerSourceId = await ensureCrawlerSourceIfAvailable(supabase, source);
  const runId = await createCrawlRun(supabase, {
    source,
    crawlerSourceId,
    startedAt,
    found,
    candidates: candidates.length
  });
  let inserted = 0;
  let updated = 0;
  let saveFailed = 0;

  for (const candidate of candidates) {
    try {
      const existing = await findExistingProperty(supabase, candidate);
      const now = new Date().toISOString();
      const changedFields = existing ? getChangedFields(existing, candidate) : [];
      const contentChanged = Boolean(existing?.content_hash && existing.content_hash !== candidate.content_hash);
      const payload = buildPropertyPayload({
        candidate,
        propertySourceId,
        crawlerSourceId,
        existing,
        now,
        changedFields,
        contentChanged
      });
      let propertyId = existing?.id ?? null;

      if (existing?.id) {
        const { data, error } = await supabase
          .from("properties")
          .update(payload)
          .eq("id", existing.id)
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        propertyId = data.id;
        updated += 1;
      } else {
        const { data, error } = await supabase
          .from("properties")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        propertyId = data.id;
        inserted += 1;
      }

      await insertSnapshot(supabase, {
        candidate,
        propertyId,
        runId,
        crawlerSourceId,
        operation: existing?.id ? "update" : "insert",
        changedFields
      });
    } catch (error) {
      saveFailed += 1;
      await insertCrawlError(supabase, {
        source,
        crawlerSourceId,
        runId,
        url: candidate.source_url,
        errorType: error.name ?? "SaveError",
        message: error.message ?? String(error)
      });
    }
  }

  for (const error of errors) {
    await insertCrawlError(supabase, {
      source,
      crawlerSourceId,
      runId,
      url: error.url,
      errorType: error.errorType,
      statusCode: error.statusCode,
      message: error.message
    });
  }

  const totalFailed = failed + saveFailed;
  await finishCrawlRun(supabase, {
    runId,
    found,
    candidates: candidates.length,
    inserted,
    updated,
    skipped,
    failed: totalFailed,
    status: statusForRun({ inserted, updated, skipped, failed: totalFailed, errors })
  });

  return { inserted, updated, skipped, failed: saveFailed };
}

async function ensurePropertySource(supabase, source) {
  const { data: existing, error: selectError } = await supabase
    .from("property_sources")
    .select("id")
    .eq("name", source.name)
    .limit(1)
    .maybeSingle();
  if (selectError) throw new Error(selectError.message);
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("property_sources")
    .insert({ name: source.name, website_url: source.baseUrl })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

async function ensureCrawlerSourceIfAvailable(supabase, source) {
  const payload = {
    source_key: source.id,
    name: source.name,
    url: source.baseUrl,
    list_url: source.listUrl,
    category: source.category,
    rank: source.rank,
    crawl_method: source.crawlMethod,
    adapter_name: source.adapterName,
    crawl_policy: source.crawlPolicy,
    robots_status: source.robotsStatus ?? "unknown",
    terms_note: source.termsNote ?? null,
    is_active: source.enabled !== false,
    crawl_frequency: source.crawlFrequency ?? "manual",
    rate_limit_ms: source.rateLimitMs ?? 2000,
    notes: source.notes ?? null
  };

  const { data, error } = await supabase
    .from("property_crawl_sources")
    .upsert(payload, { onConflict: "source_key" })
    .select("id")
    .single();

  if (error) {
    console.log(`WARN property_crawl_sources not available yet: ${error.message}`);
    return null;
  }

  return data.id;
}

async function findExistingProperty(supabase, candidate) {
  const selectColumns = [
    "id",
    "title",
    "price_yen",
    "prefecture",
    "city",
    "address_display",
    "property_type",
    "property_category",
    "land_area_m2",
    "building_area_m2",
    "source_url",
    "remarks",
    "status",
    "publication_permission",
    "published_at",
    "first_detected_at",
    "last_changed_at",
    "content_hash",
    "previous_snapshot_hash"
  ].join(",");

  const byUrl = await supabase
    .from("properties")
    .select(selectColumns)
    .eq("source_url", candidate.source_url)
    .limit(1)
    .maybeSingle();
  if (byUrl.error) throw new Error(byUrl.error.message);
  if (byUrl.data) return byUrl.data;

  const byDuplicate = await supabase
    .from("properties")
    .select(selectColumns)
    .eq("duplicate_key", candidate.duplicate_key)
    .limit(1)
    .maybeSingle();
  if (byDuplicate.error) return null;
  return byDuplicate.data ?? null;
}

function buildPropertyPayload({ candidate, propertySourceId, crawlerSourceId, existing, now, changedFields, contentChanged }) {
  const isExisting = Boolean(existing?.id);
  return {
    title: candidate.title,
    property_type: candidate.property_type,
    property_category: candidate.property_category,
    price_yen: candidate.price_yen,
    prefecture: candidate.prefecture,
    city: candidate.city,
    address_display: candidate.address_display,
    land_area_m2: candidate.land_area_m2,
    building_area_m2: candidate.building_area_m2,
    construction_year: candidate.construction_year,
    latitude: null,
    longitude: null,
    source_id: propertySourceId,
    source_url: candidate.source_url,
    transaction_type: candidate.transaction_type,
    listed_at: candidate.source_published_at,
    source_published_at: candidate.source_published_at,
    source_updated_at: candidate.source_updated_at,
    scraped_at: now,
    first_detected_at: existing?.first_detected_at ?? now,
    last_checked_at: now,
    last_changed_at: contentChanged ? now : existing?.last_changed_at ?? now,
    has_updates: contentChanged,
    previous_snapshot_hash: contentChanged ? existing?.content_hash ?? null : existing?.previous_snapshot_hash ?? null,
    price_band: candidate.price_band,
    risk_tags: candidate.risk_tags,
    remarks: candidate.remarks,
    publication_permission: isExisting ? existing.publication_permission ?? "pending" : "pending",
    status: isExisting ? existing.status ?? "draft" : "draft",
    published_at: isExisting ? existing.published_at ?? null : null,
    crawler_source_id: crawlerSourceId,
    source_external_id: candidate.source_external_id,
    source_listing_url: candidate.source_listing_url,
    raw_price_text: candidate.raw_price_text,
    title_normalized: candidate.title_normalized,
    area_block: candidate.area_block,
    duplicate_key: candidate.duplicate_key,
    content_hash: candidate.content_hash,
    changed_fields: changedFields,
    crawl_status: isExisting ? "checked" : "candidate"
  };
}

async function createCrawlRun(supabase, { source, crawlerSourceId, startedAt, found, candidates }) {
  const { data, error } = await supabase
    .from("property_crawl_runs")
    .insert({
      source_id: crawlerSourceId,
      source_key: source.id,
      mode: "commit",
      status: "running",
      started_at: startedAt,
      found_count: found,
      candidate_count: candidates
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

async function finishCrawlRun(supabase, { runId, found, candidates, inserted, updated, skipped, failed, status }) {
  const { error } = await supabase
    .from("property_crawl_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      found_count: found,
      candidate_count: candidates,
      inserted_count: inserted,
      updated_count: updated,
      skipped_count: skipped,
      failed_count: failed
    })
    .eq("id", runId);
  if (error) throw new Error(error.message);
}

async function insertSnapshot(supabase, { candidate, propertyId, runId, crawlerSourceId, operation, changedFields }) {
  const { error } = await supabase.from("property_snapshots").insert({
    property_id: propertyId,
    crawl_run_id: runId,
    source_id: crawlerSourceId,
    source_key: candidate.source_key,
    source_url: candidate.source_url,
    duplicate_key: candidate.duplicate_key,
    content_hash: candidate.content_hash,
    title: candidate.title,
    title_normalized: candidate.title_normalized,
    price_yen: candidate.price_yen,
    raw_price_text: candidate.raw_price_text,
    prefecture: candidate.prefecture,
    city: candidate.city,
    address_display: candidate.address_display,
    property_type: candidate.property_type,
    property_category: candidate.property_category,
    land_area_m2: candidate.land_area_m2,
    building_area_m2: candidate.building_area_m2,
    source_published_at: candidate.source_published_at,
    source_updated_at: candidate.source_updated_at,
    summary: {
      operation,
      changedFields,
      priceBand: candidate.price_band,
      riskTags: candidate.risk_tags,
      transactionType: candidate.transaction_type
    }
  });
  if (error) throw new Error(error.message);
}

async function insertCrawlError(supabase, { source, crawlerSourceId, runId, url, errorType, message, statusCode = null }) {
  const { error } = await supabase.from("property_crawl_errors").insert({
    source_id: crawlerSourceId,
    crawl_run_id: runId,
    source_key: source.id,
    url: url ?? source.listUrl ?? source.baseUrl,
    error_type: errorType ?? "unknown",
    error_message: message ?? "unknown error",
    status_code: statusCode,
    metadata: {}
  });
  if (error) console.log(`WARN property_crawl_errors insert failed: ${error.message}`);
}

function statusForRun({ inserted, updated, skipped, failed, errors }) {
  if (failed > 0 || errors.length > 0) {
    return inserted > 0 || updated > 0 || skipped > 0 ? "partial_success" : "failed";
  }
  return "success";
}

function getChangedFields(existing, candidate) {
  const checks = [
    ["title", existing.title, candidate.title],
    ["price_yen", existing.price_yen, candidate.price_yen],
    ["prefecture", existing.prefecture, candidate.prefecture],
    ["city", existing.city, candidate.city],
    ["address_display", existing.address_display, candidate.address_display],
    ["property_type", existing.property_type, candidate.property_type],
    ["property_category", existing.property_category, candidate.property_category],
    ["land_area_m2", existing.land_area_m2, candidate.land_area_m2],
    ["building_area_m2", existing.building_area_m2, candidate.building_area_m2],
    ["source_url", existing.source_url, candidate.source_url],
    ["remarks", existing.remarks, candidate.remarks]
  ];

  return checks
    .filter(([, currentValue, nextValue]) => normalizeComparable(currentValue) !== normalizeComparable(nextValue))
    .map(([field]) => field);
}

function normalizeComparable(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number(value).toFixed(2);
  if (typeof value === "string" && value !== "" && Number.isFinite(Number(value))) {
    return Number(value).toFixed(2);
  }
  return String(value).replace(/\s+/g, " ").trim();
}

function loadEnvFile(fileName) {
  const path = resolve(process.cwd(), fileName);
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function createSupabaseClient(url, key) {
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください。");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
