import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

export async function upsertCandidates({ source, candidates, commit }) {
  if (!commit) {
    return { inserted: 0, updated: 0, skipped: candidates.length };
  }

  loadEnvFile(".env.local");
  const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const propertySourceId = await ensurePropertySource(supabase, source);
  const crawlerSourceId = await ensureCrawlerSourceIfAvailable(supabase, source);
  let inserted = 0;
  let updated = 0;

  for (const candidate of candidates) {
    const existing = await findExistingProperty(supabase, candidate);
    const now = new Date().toISOString();
    const payload = {
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
      last_changed_at: existing?.content_hash && existing.content_hash !== candidate.content_hash ? now : existing?.last_changed_at ?? now,
      has_updates: Boolean(existing?.content_hash && existing.content_hash !== candidate.content_hash),
      previous_snapshot_hash: candidate.content_hash,
      price_band: candidate.price_band,
      risk_tags: candidate.risk_tags,
      remarks: candidate.remarks,
      publication_permission: "pending",
      status: "draft",
      published_at: null,
      crawler_source_id: crawlerSourceId,
      source_external_id: candidate.source_external_id,
      source_listing_url: candidate.source_listing_url,
      raw_price_text: candidate.raw_price_text,
      title_normalized: candidate.title_normalized,
      area_block: candidate.area_block,
      duplicate_key: candidate.duplicate_key,
      content_hash: candidate.content_hash,
      changed_fields: [],
      crawl_status: "candidate"
    };

    if (existing?.id) {
      const { error } = await supabase.from("properties").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
      updated += 1;
    } else {
      const { error } = await supabase.from("properties").insert(payload);
      if (error) throw new Error(error.message);
      inserted += 1;
    }
  }

  return { inserted, updated, skipped: 0 };
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
  const byUrl = await supabase
    .from("properties")
    .select("id,first_detected_at,last_changed_at,content_hash")
    .eq("source_url", candidate.source_url)
    .limit(1)
    .maybeSingle();
  if (byUrl.error) throw new Error(byUrl.error.message);
  if (byUrl.data) return byUrl.data;

  const byDuplicate = await supabase
    .from("properties")
    .select("id,first_detected_at,last_changed_at,content_hash")
    .eq("duplicate_key", candidate.duplicate_key)
    .limit(1)
    .maybeSingle();
  if (byDuplicate.error) return null;
  return byDuplicate.data ?? null;
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
