import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  EXPECTED_DIAGNOSIS_PROJECT_REF,
  createDiagnosisSupabaseServiceRoleClient,
  getDiagnosisAnonKeyFormat,
  getDiagnosisProjectRef,
  getDiagnosisServiceRoleKeyFormat,
  type DiagnosisKeyFormat
} from "@/lib/supabase/diagnosis-server";

const CRAWLER_SCOPE_FILTER = "crawler_source_id.not.is.null,crawl_status.in.(candidate,checked,test_reverted,rejected)";

export type AdminSystemCheck = {
  env: {
    nextPublicSupabaseUrl: boolean;
    nextPublicSupabaseAnonKey: boolean;
    serviceRoleKey: boolean;
    diagnosisSupabaseUrl: boolean;
    diagnosisSupabaseAnonKey: boolean;
    diagnosisServiceRoleKey: boolean;
    realEstateProjectRef: string | null;
    realEstateProjectRefMasked: string | null;
    diagnosisProjectRef: string | null;
    diagnosisProjectRefMasked: string | null;
    diagnosisProjectRefMatchesExpected: boolean;
    diagnosisAnonKeyFormat: DiagnosisKeyFormat;
    diagnosisServiceRoleKeyFormat: DiagnosisKeyFormat;
  };
  connection: {
    ok: boolean;
    message: string;
  };
  diagnosisConnection: {
    ok: boolean;
    message: string;
  };
  counts: {
    properties: number | null;
    crawlerCandidates: number | null;
    publishedProperties: number | null;
    nonPublishedProperties: number | null;
    recentDetectedProperties: number | null;
    constructionDiagnoses: number | null;
  };
  errors: string[];
};

export async function getAdminSystemCheck(): Promise<AdminSystemCheck> {
  const realEstateProjectRef = extractProjectRef(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  const diagnosisProjectRef = getDiagnosisProjectRef();
  const result: AdminSystemCheck = {
    env: {
      nextPublicSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      nextPublicSupabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      serviceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      diagnosisSupabaseUrl: Boolean(process.env.DIAGNOSIS_SUPABASE_URL),
      diagnosisSupabaseAnonKey: Boolean(process.env.DIAGNOSIS_SUPABASE_ANON_KEY),
      diagnosisServiceRoleKey: Boolean(process.env.DIAGNOSIS_SUPABASE_SERVICE_ROLE_KEY),
      realEstateProjectRef,
      realEstateProjectRefMasked: maskProjectRef(realEstateProjectRef),
      diagnosisProjectRef,
      diagnosisProjectRefMasked: maskProjectRef(diagnosisProjectRef),
      diagnosisProjectRefMatchesExpected: diagnosisProjectRef === EXPECTED_DIAGNOSIS_PROJECT_REF,
      diagnosisAnonKeyFormat: getDiagnosisAnonKeyFormat(),
      diagnosisServiceRoleKeyFormat: getDiagnosisServiceRoleKeyFormat()
    },
    connection: {
      ok: false,
      message: "未確認"
    },
    diagnosisConnection: {
      ok: false,
      message: "未確認"
    },
    counts: {
      properties: null,
      crawlerCandidates: null,
      publishedProperties: null,
      nonPublishedProperties: null,
      recentDetectedProperties: null,
      constructionDiagnoses: null
    },
    errors: []
  };

  const realEstateSupabase = createSupabaseServiceRoleClient();
  if (!realEstateSupabase) {
    result.connection.message = "不動産サーチ用Supabase接続に必要なサーバー側設定が不足しています。";
    result.errors.push("Real estate Supabase service role client is not configured.");
  } else {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const realEstateErrors: string[] = [];
    result.counts.properties = await countRows(
      "properties",
      () => realEstateSupabase.from("properties").select("id", { count: "exact", head: true }),
      realEstateErrors
    );
    result.counts.crawlerCandidates = await countRows(
      "crawler candidates",
      () => realEstateSupabase.from("properties").select("id", { count: "exact", head: true }).or(CRAWLER_SCOPE_FILTER),
      realEstateErrors
    );
    result.counts.publishedProperties = await countRows(
      "published properties",
      () => realEstateSupabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "published"),
      realEstateErrors
    );
    result.counts.nonPublishedProperties = await countRows(
      "non published properties",
      () => realEstateSupabase.from("properties").select("id", { count: "exact", head: true }).neq("status", "published"),
      realEstateErrors
    );
    result.counts.recentDetectedProperties = await countRows(
      "recent detected properties",
      () => realEstateSupabase.from("properties").select("id", { count: "exact", head: true }).gte("first_detected_at", sevenDaysAgo),
      realEstateErrors
    );

    result.errors.push(...realEstateErrors);
    result.connection.ok = result.counts.properties !== null && realEstateErrors.length === 0;
    result.connection.message = result.connection.ok
      ? "不動産サーチ用Supabaseに接続できています。"
      : "不動産サーチ用Supabase接続または件数取得でエラーがあります。";
  }

  const diagnosisSupabase = createDiagnosisSupabaseServiceRoleClient();
  if (!diagnosisSupabase) {
    result.diagnosisConnection.message = "construction_diagnoses確認に必要な診断用サーバー側設定が不足しています。";
    result.errors.push("Diagnosis Supabase service role client is not configured.");
  } else {
    const diagnosisErrors: string[] = [];
    result.counts.constructionDiagnoses = await countRows(
      "construction diagnoses",
      () => diagnosisSupabase.from("construction_diagnoses").select("id", { count: "exact", head: true }),
      diagnosisErrors
    );

    result.errors.push(...diagnosisErrors);
    result.diagnosisConnection.ok = result.counts.constructionDiagnoses !== null && diagnosisErrors.length === 0;
    result.diagnosisConnection.message = result.diagnosisConnection.ok
      ? "construction_diagnoses に接続できています。"
      : "construction_diagnoses の接続または件数取得でエラーがあります。";
  }

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
