import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const AUTO_PUBLISH_EXCLUDED_TITLE_WORDS = [
  "成約済",
  "売却済",
  "受付終了",
  "募集終了",
  "掲載終了",
  "取引終了",
  "終了しました",
  "商談中",
  "商談成立",
  "交渉中",
  "交渉終了"
];

const UNCONFIRMED_LOCATION_VALUES = new Set([
  "",
  "不明",
  "未確認",
  "都道府県未確認",
  "市区町村未確認"
]);

export async function upsertCandidates({ source, candidates, commit }) {
  if (!commit) {
    return createSaveCounts({ skipped: candidates.length });
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
  startedAt = new Date().toISOString(),
  autoPublishSafe = false,
  robotsStatus = null
}) {
  if (!commit) {
    return createSaveCounts({ skipped: candidates.length });
  }

  loadEnvFile(".env.local");
  const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const runtimeSource = { ...source, robotsStatus: robotsStatus ?? source.robotsStatus };
  const propertySourceId = await ensurePropertySource(supabase, runtimeSource);
  const crawlerSourceId = await ensureCrawlerSourceIfAvailable(supabase, runtimeSource);
  const runId = await createCrawlRun(supabase, {
    source: runtimeSource,
    crawlerSourceId,
    startedAt,
    found,
    candidates: candidates.length,
    autoPublishSafe
  });
  let inserted = 0;
  let updated = 0;
  let saveFailed = 0;
  let autoPublished = 0;
  let keptPending = 0;
  let duplicatesUpdated = 0;
  let rejectedByRule = 0;

  for (const candidate of candidates) {
    try {
      const existing = await findExistingProperty(supabase, candidate, { crawlerSourceId });
      const now = new Date().toISOString();
      const changedFields = existing ? getChangedFields(existing, candidate) : [];
      const contentChanged = Boolean(existing?.content_hash && existing.content_hash !== candidate.content_hash);
      const autoPublishDecision = evaluateAutoPublishCandidate(candidate, {
        source: runtimeSource,
        robotsStatus,
        autoPublishSafe,
        isDuplicateUpdate: Boolean(existing?.id)
      });
      const payload = buildPropertyPayload({
        candidate,
        propertySourceId,
        crawlerSourceId,
        existing,
        now,
        changedFields,
        contentChanged,
        autoPublishDecision
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
        duplicatesUpdated += 1;
      } else {
        const { data, error } = await supabase
          .from("properties")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        propertyId = data.id;
        inserted += 1;
        if (autoPublishDecision.canAutoPublish) {
          autoPublished += 1;
        } else {
          keptPending += 1;
          if (autoPublishSafe) rejectedByRule += 1;
        }
      }

      await insertSnapshot(supabase, {
        candidate,
        propertyId,
        runId,
        crawlerSourceId,
        operation: existing?.id ? "update" : "insert",
        changedFields,
        autoPublishDecision,
        duplicateUpdated: Boolean(existing?.id)
      });
    } catch (error) {
      saveFailed += 1;
      await insertCrawlError(supabase, {
        source: runtimeSource,
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
      source: runtimeSource,
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
    status: statusForRun({ inserted, updated, skipped, failed: totalFailed, errors }),
    autoPublishSafe,
    autoPublished,
    keptPending,
    duplicatesUpdated,
    rejectedByRule
  });

  return createSaveCounts({
    inserted,
    updated,
    skipped,
    failed: saveFailed,
    autoPublished,
    keptPending,
    duplicatesUpdated,
    rejectedByRule
  });
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

async function findExistingProperty(supabase, candidate, { crawlerSourceId = null } = {}) {
  const selectColumns = [
    "id",
    "title",
    "title_normalized",
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
    "crawler_source_id",
    "source_external_id",
    "duplicate_key",
    "first_detected_at",
    "last_changed_at",
    "content_hash",
    "previous_snapshot_hash"
  ].join(",");

  const byUrl = await selectFirstProperty(
    supabase.from("properties").select(selectColumns).eq("source_url", candidate.source_url)
  );
  if (byUrl) return byUrl;

  if (candidate.source_external_id) {
    if (crawlerSourceId) {
      const byExternalAndCrawler = await selectFirstProperty(
        supabase
          .from("properties")
          .select(selectColumns)
          .eq("source_external_id", candidate.source_external_id)
          .eq("crawler_source_id", crawlerSourceId)
      );
      if (byExternalAndCrawler) return byExternalAndCrawler;
    }

    const byExternal = await selectFirstProperty(
      supabase.from("properties").select(selectColumns).eq("source_external_id", candidate.source_external_id)
    );
    if (byExternal) return byExternal;
  }

  if (candidate.duplicate_key) {
    const byDuplicate = await selectFirstProperty(
      supabase.from("properties").select(selectColumns).eq("duplicate_key", candidate.duplicate_key)
    );
    if (byDuplicate) return byDuplicate;
  }

  return findNearDuplicateProperty(supabase, candidate, selectColumns);
}

async function selectFirstProperty(query) {
  const { data, error } = await query.limit(1);
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] ?? null : data ?? null;
}

async function findNearDuplicateProperty(supabase, candidate, selectColumns) {
  if (!candidate.prefecture || !candidate.city || candidate.price_yen === null || candidate.price_yen === undefined) {
    return null;
  }

  const { data, error } = await supabase
    .from("properties")
    .select(selectColumns)
    .eq("prefecture", candidate.prefecture)
    .eq("city", candidate.city)
    .eq("price_yen", candidate.price_yen)
    .limit(100);

  if (error) throw new Error(error.message);

  const possibleMatches = Array.isArray(data) ? data : [];
  return (
    possibleMatches.find((property) => isLocationDuplicate(property, candidate)) ??
    possibleMatches.find((property) => isTitleDuplicate(property, candidate)) ??
    null
  );
}

function isLocationDuplicate(existing, candidate) {
  return addressesLookSame(existing, candidate) && areasLookClose(existing, candidate);
}

function isTitleDuplicate(existing, candidate) {
  return titlesLookSimilar(existing.title_normalized ?? existing.title, candidate.title_normalized ?? candidate.title) && areasLookClose(existing, candidate);
}

function addressesLookSame(existing, candidate) {
  const current = normalizeAddressForDuplicate(existing.address_display, existing.prefecture, existing.city);
  const next = normalizeAddressForDuplicate(candidate.address_display, candidate.prefecture, candidate.city);
  if (!current || !next) return false;
  return current === next || current.includes(next) || next.includes(current);
}

function areasLookClose(existing, candidate) {
  return areaValueClose(existing.land_area_m2, candidate.land_area_m2) && areaValueClose(existing.building_area_m2, candidate.building_area_m2);
}

function areaValueClose(current, next) {
  if (current === null || current === undefined || current === "" || next === null || next === undefined || next === "") return true;
  const currentNumber = Number(current);
  const nextNumber = Number(next);
  if (!Number.isFinite(currentNumber) || !Number.isFinite(nextNumber)) return true;
  return Math.abs(currentNumber - nextNumber) <= 1;
}

function normalizeAddressForDuplicate(value, prefecture, city) {
  const normalized = normalizeDuplicateText(value)
    .replace(normalizeDuplicateText(prefecture), "")
    .replace(normalizeDuplicateText(city), "");
  return normalized.length >= 3 ? normalized : "";
}

function titlesLookSimilar(current, next) {
  const currentTitle = normalizeDuplicateText(current);
  const nextTitle = normalizeDuplicateText(next);
  if (!currentTitle || !nextTitle) return false;
  if (currentTitle === nextTitle) return true;
  if (currentTitle.length >= 10 && nextTitle.length >= 10 && (currentTitle.includes(nextTitle) || nextTitle.includes(currentTitle))) {
    return true;
  }
  return diceCoefficient(currentTitle, nextTitle) >= 0.72;
}

function diceCoefficient(current, next) {
  const currentBigrams = buildBigrams(current);
  const nextBigrams = buildBigrams(next);
  if (currentBigrams.length === 0 || nextBigrams.length === 0) return 0;

  const counts = new Map();
  for (const bigram of currentBigrams) counts.set(bigram, (counts.get(bigram) ?? 0) + 1);

  let overlap = 0;
  for (const bigram of nextBigrams) {
    const count = counts.get(bigram) ?? 0;
    if (count <= 0) continue;
    overlap += 1;
    counts.set(bigram, count - 1);
  }

  return (2 * overlap) / (currentBigrams.length + nextBigrams.length);
}

function buildBigrams(value) {
  const chars = [...value];
  if (chars.length < 2) return chars;
  return chars.slice(0, -1).map((char, index) => `${char}${chars[index + 1]}`);
}

function normalizeDuplicateText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[【】［］\[\]（）()「」『』"'’‘“”`´〜~・,\s、。./／\\|｜:：;；\-−ー―_＿]/g, "")
    .trim();
}

function evaluateAutoPublishCandidate(candidate, { source, robotsStatus, autoPublishSafe, isDuplicateUpdate }) {
  const reasons = [];

  if (!autoPublishSafe) reasons.push("auto_publish_safe_disabled");
  if (isDuplicateUpdate) reasons.push("duplicate_or_existing");
  if (source.crawlPolicy === "manual_only" || source.crawlPolicy === "disallow") reasons.push(`crawl_policy_${source.crawlPolicy}`);
  if (robotsStatus === "disallowed") reasons.push("robots_disallowed");
  if (!Number.isFinite(candidate.price_yen) || candidate.price_yen < 0 || candidate.price_yen > 3000000) reasons.push("price_out_of_range");
  if (isUnconfirmedLocation(candidate.prefecture)) reasons.push("prefecture_missing");
  if (isUnconfirmedLocation(candidate.city)) reasons.push("city_missing");
  if (!isValidHttpUrl(candidate.source_url)) reasons.push("source_url_invalid");
  if (!candidate.property_type || candidate.property_type === "unknown") reasons.push("property_type_unknown");
  if (!candidate.property_category || candidate.property_category === "unknown") reasons.push("property_category_unknown");
  if (!candidate.duplicate_key) reasons.push("duplicate_key_missing");
  if (!candidate.content_hash) reasons.push("content_hash_missing");
  if ((candidate.parse_warnings ?? []).length > 0) reasons.push("parse_warning");
  if (AUTO_PUBLISH_EXCLUDED_TITLE_WORDS.some((word) => String(candidate.title ?? "").includes(word))) reasons.push("excluded_title_word");

  return {
    canAutoPublish: reasons.length === 0,
    reasons
  };
}

function isUnconfirmedLocation(value) {
  return UNCONFIRMED_LOCATION_VALUES.has(String(value ?? "").trim());
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function buildPropertyPayload({
  candidate,
  propertySourceId,
  crawlerSourceId,
  existing,
  now,
  changedFields,
  contentChanged,
  autoPublishDecision
}) {
  const isExisting = Boolean(existing?.id);
  const shouldAutoPublishNew = !isExisting && autoPublishDecision?.canAutoPublish;
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
    publication_permission: isExisting ? existing.publication_permission ?? "pending" : shouldAutoPublishNew ? "permitted" : "pending",
    status: isExisting ? existing.status ?? "draft" : shouldAutoPublishNew ? "published" : "draft",
    published_at: isExisting ? existing.published_at ?? null : shouldAutoPublishNew ? now : null,
    crawler_source_id: crawlerSourceId,
    source_external_id: candidate.source_external_id,
    source_listing_url: candidate.source_listing_url,
    raw_price_text: candidate.raw_price_text,
    title_normalized: candidate.title_normalized,
    area_block: candidate.area_block,
    duplicate_key: candidate.duplicate_key,
    content_hash: candidate.content_hash,
    changed_fields: changedFields,
    crawl_status: isExisting || shouldAutoPublishNew ? "checked" : "candidate"
  };
}

async function createCrawlRun(supabase, { source, crawlerSourceId, startedAt, found, candidates, autoPublishSafe }) {
  const { data, error } = await supabase
    .from("property_crawl_runs")
    .insert({
      source_id: crawlerSourceId,
      source_key: source.id,
      mode: "commit",
      status: "running",
      started_at: startedAt,
      found_count: found,
      candidate_count: candidates,
      metadata: {
        autoPublishSafe
      }
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

async function finishCrawlRun(supabase, {
  runId,
  found,
  candidates,
  inserted,
  updated,
  skipped,
  failed,
  status,
  autoPublishSafe,
  autoPublished,
  keptPending,
  duplicatesUpdated,
  rejectedByRule
}) {
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
      failed_count: failed,
      metadata: {
        autoPublishSafe,
        autoPublished,
        keptPending,
        duplicatesUpdated,
        rejectedByRule
      }
    })
    .eq("id", runId);
  if (error) throw new Error(error.message);
}

async function insertSnapshot(supabase, {
  candidate,
  propertyId,
  runId,
  crawlerSourceId,
  operation,
  changedFields,
  autoPublishDecision,
  duplicateUpdated
}) {
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
      autoPublishDecision,
      duplicateUpdated,
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

function createSaveCounts(overrides = {}) {
  return {
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    autoPublished: 0,
    keptPending: 0,
    duplicatesUpdated: 0,
    rejectedByRule: 0,
    ...overrides
  };
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
