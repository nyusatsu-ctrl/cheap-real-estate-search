import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const CRAWLER_SCOPE_FILTER = "crawler_source_id.not.is.null,crawl_status.in.(candidate,checked,test_reverted,rejected)";

export type AdminSystemCheck = {
  env: {
    nextPublicSupabaseUrl: boolean;
    nextPublicSupabaseAnonKey: boolean;
    serviceRoleKey: boolean;
    projectRefMasked: string | null;
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
      serviceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      projectRefMasked: maskProjectRef(extractProjectRef(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL))
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

function extractProjectRef(value?: string) {
  if (!value) return null;
  try {
    const host = new URL(value).hostname;
    const suffix = ".supabase.co";
    if (!host.endsWith(suffix)) return null;
    const projectRef = host.slice(0, -suffix.length);
    return projectRef || null;
  } catch {
    return null;
  }
}

function maskProjectRef(projectRef: string | null) {
  if (!projectRef) return null;
  if (projectRef.length <= 8) return `${projectRef.slice(0, 2)}...${projectRef.slice(-2)}`;
  return `${projectRef.slice(0, 4)}...${projectRef.slice(-4)}`;
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
