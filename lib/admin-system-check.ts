import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const CRAWLER_SCOPE_FILTER = "crawler_source_id.not.is.null,crawl_status.in.(candidate,checked,test_reverted,rejected)";

export type AdminSystemCheck = {
  env: {
    nextPublicSupabaseUrl: boolean;
    nextPublicSupabaseAnonKey: boolean;
    serviceRoleKey: boolean;
  };
  connection: {
    ok: boolean;
    message: string;
  };
  counts: {
    properties: number | null;
    crawlerCandidates: number | null;
    publishedProperties: number | null;
    nonPublishedProperties: number | null;
    recentDetectedProperties: number | null;
  };
  errors: string[];
};

export async function getAdminSystemCheck(): Promise<AdminSystemCheck> {
  const result: AdminSystemCheck = {
    env: {
      nextPublicSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      nextPublicSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      serviceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    },
    connection: {
      ok: false,
      message: "未確認"
    },
    counts: {
      properties: null,
      crawlerCandidates: null,
      publishedProperties: null,
      nonPublishedProperties: null,
      recentDetectedProperties: null
    },
    errors: []
  };

  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    result.connection.message = "Supabase接続に必要なサーバー側設定が不足しています。";
    result.errors.push("Supabase service role client is not configured.");
    return result;
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  result.counts.properties = await countRows("properties", () => supabase.from("properties").select("id", { count: "exact", head: true }), result.errors);
  result.counts.crawlerCandidates = await countRows(
    "crawler candidates",
    () => supabase.from("properties").select("id", { count: "exact", head: true }).or(CRAWLER_SCOPE_FILTER),
    result.errors
  );
  result.counts.publishedProperties = await countRows(
    "published properties",
    () => supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "published"),
    result.errors
  );
  result.counts.nonPublishedProperties = await countRows(
    "non published properties",
    () => supabase.from("properties").select("id", { count: "exact", head: true }).neq("status", "published"),
    result.errors
  );
  result.counts.recentDetectedProperties = await countRows(
    "recent detected properties",
    () => supabase.from("properties").select("id", { count: "exact", head: true }).gte("first_detected_at", sevenDaysAgo),
    result.errors
  );

  result.connection.ok = result.counts.properties !== null && result.errors.length === 0;
  result.connection.message = result.connection.ok ? "Supabaseに接続できています。" : "Supabase接続または件数取得でエラーがあります。";
  return result;
}

async function countRows(
  label: string,
  buildQuery: () => PromiseLike<{ count: number | null; error: { message?: string } | null }>,
  errors: string[]
) {
  const { count, error } = await buildQuery();
  if (error) {
    errors.push(`${label}: ${error.message ?? "unknown error"}`);
    return null;
  }
  return count ?? 0;
}
