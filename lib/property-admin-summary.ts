import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const CRAWLER_SCOPE_FILTER = "crawler_source_id.not.is.null,crawl_status.in.(candidate,checked,test_reverted,rejected)";

export type PropertyAdminSummary = {
  totalProperties: number;
  publishedCount: number;
  draftCount: number;
  soldCount: number;
  crawlerCandidateCount: number;
  approvalPendingCount: number;
  recentDetectedCount: number;
  recentCrawlErrorCount: number;
  lastCrawlerRun: {
    sourceKey: string | null;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    foundCount: number;
    candidateCount: number;
    insertedCount: number;
    updatedCount: number;
    skippedCount: number;
    failedCount: number;
  } | null;
  errorMessage: string | null;
};

export async function getPropertyAdminSummary(): Promise<PropertyAdminSummary> {
  const supabase = createSupabaseServiceRoleClient();
  const fallback = emptySummary();

  if (!supabase) {
    return {
      ...fallback,
      errorMessage: "Supabase service role client is not configured."
    };
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const errors: string[] = [];

  const [
    totalProperties,
    publishedCount,
    draftCount,
    soldCount,
    crawlerCandidateCount,
    approvalPendingCount,
    recentDetectedCount,
    recentCrawlErrorCount,
    lastCrawlerRun
  ] = await Promise.all([
    countRows("properties total", () => supabase.from("properties").select("id", { count: "exact", head: true }), errors),
    countRows("properties published", () => supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "published"), errors),
    countRows("properties draft", () => supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "draft"), errors),
    countRows("properties sold", () => supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "sold"), errors),
    countRows("crawler candidates", () => supabase.from("properties").select("id", { count: "exact", head: true }).or(CRAWLER_SCOPE_FILTER), errors),
    countRows(
      "approval pending",
      () => supabase.from("properties").select("id", { count: "exact", head: true }).eq("publication_permission", "pending").or(CRAWLER_SCOPE_FILTER),
      errors
    ),
    countRows("recent detected", () => supabase.from("properties").select("id", { count: "exact", head: true }).gte("first_detected_at", sevenDaysAgo), errors),
    countRows("recent crawl errors", () => supabase.from("property_crawl_errors").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo), errors),
    fetchLastCrawlerRun(supabase, errors)
  ]);

  return {
    totalProperties,
    publishedCount,
    draftCount,
    soldCount,
    crawlerCandidateCount,
    approvalPendingCount,
    recentDetectedCount,
    recentCrawlErrorCount,
    lastCrawlerRun,
    errorMessage: errors.length ? errors.join(" / ") : null
  };
}

function emptySummary(): PropertyAdminSummary {
  return {
    totalProperties: 0,
    publishedCount: 0,
    draftCount: 0,
    soldCount: 0,
    crawlerCandidateCount: 0,
    approvalPendingCount: 0,
    recentDetectedCount: 0,
    recentCrawlErrorCount: 0,
    lastCrawlerRun: null,
    errorMessage: null
  };
}

async function countRows(label: string, buildQuery: () => PromiseLike<{ count: number | null; error: { message?: string } | null }>, errors: string[]) {
  const { count, error } = await buildQuery();
  if (error) {
    errors.push(`${label}: ${error.message ?? "unknown error"}`);
    return 0;
  }
  return count ?? 0;
}

async function fetchLastCrawlerRun(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient> extends infer T ? NonNullable<T> : never,
  errors: string[]
): Promise<PropertyAdminSummary["lastCrawlerRun"]> {
  const { data, error } = await supabase
    .from("property_crawl_runs")
    .select("source_key,status,started_at,finished_at,found_count,candidate_count,inserted_count,updated_count,skipped_count,failed_count")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    errors.push(`last crawler run: ${error.message ?? "unknown error"}`);
    return null;
  }

  if (!data) return null;

  return {
    sourceKey: data.source_key ?? null,
    status: String(data.status ?? "unknown"),
    startedAt: String(data.started_at),
    finishedAt: data.finished_at ? String(data.finished_at) : null,
    foundCount: Number(data.found_count ?? 0),
    candidateCount: Number(data.candidate_count ?? 0),
    insertedCount: Number(data.inserted_count ?? 0),
    updatedCount: Number(data.updated_count ?? 0),
    skippedCount: Number(data.skipped_count ?? 0),
    failedCount: Number(data.failed_count ?? 0)
  };
}
