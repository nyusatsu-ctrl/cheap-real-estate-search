#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const url = process.env.TENDER_SUPABASE_URL;
const serviceRoleKey = process.env.TENDER_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.log(JSON.stringify({
    event: "tender_db_summary",
    skipped: true,
    reason: "TENDER_SUPABASE_URL or TENDER_SUPABASE_SERVICE_ROLE_KEY is missing."
  }));
  process.exit(0);
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

const counts = {
  sources: await countRows("tender_sources"),
  crawlReadySources: await countRows("tender_sources", (query) => query.eq("is_active", true).eq("crawl_ready", true).neq("crawler_type", "manual_only")),
  tenders: await countRows("tenders"),
  publishedTenders: await countRows("tenders", (query) => query.eq("status", "published")),
  candidates: await countRows("tender_candidates"),
  pendingCandidates: await countRows("tender_candidates", (query) => query.eq("review_status", "pending")),
  crawlLogs: await countRows("tender_crawl_logs"),
  sourceErrors: await countRows("tender_source_errors")
};

const latestLogs = await selectRows(
  "tender_crawl_logs",
  "id, started_at, status, fetched_count, created_count, updated_count, duplicate_count, skipped_count, error_count",
  (query) => query.order("started_at", { ascending: false }).limit(5)
);
const latestErrors = await selectRows(
  "tender_source_errors",
  "id, occurred_at, error_type, status_code, source_url",
  (query) => query.order("occurred_at", { ascending: false }).limit(5)
);

console.log(JSON.stringify({
  event: "tender_db_summary",
  skipped: false,
  project_ref: projectRef(url),
  counts,
  latest_logs: latestLogs,
  latest_errors: latestErrors
}, null, 2));

async function countRows(table, configure) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (configure) query = configure(query);
  const { count, error } = await query;
  if (error) return { ok: false, count: null, error: error.message };
  return { ok: true, count: count ?? 0, error: null };
}

async function selectRows(table, columns, configure) {
  let query = supabase.from(table).select(columns);
  if (configure) query = configure(query);
  const { data, error } = await query;
  if (error) return { ok: false, rows: [], error: error.message };
  return { ok: true, rows: data ?? [], error: null };
}

function projectRef(value) {
  try {
    return new URL(value).hostname.split(".")[0] || "unknown";
  } catch {
    return "unknown";
  }
}
