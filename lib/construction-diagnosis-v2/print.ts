import "server-only";

import { cookies } from "next/headers";
import { getCurrentDiagnosisAdmin } from "@/lib/diagnosis-admin";
import { createDiagnosisSupabaseServiceRoleClient } from "@/lib/supabase/diagnosis-server";
import {
  getConstructionManagementDiagnosis,
  type ConstructionManagementDiagnosis
} from "./data";
import {
  createDiagnosisPrintToken,
  getDiagnosisPrintExpiry,
  hashDiagnosisPrintToken,
  isDiagnosisPrintToken,
  isDiagnosisPrintTokenExpired
} from "./print-token";
import { DIAGNOSIS_V22_SESSION_COOKIE } from "./sessions";

export const DIAGNOSIS_PRINT_COOKIE = "construction_management_diagnosis_print";
export const DIAGNOSIS_V2_RESULT_SESSION_COOKIE = "construction_management_diagnosis_v2_session";

type PrintTokenRecord = {
  diagnosis_id: string;
  token_hash: string;
  expires_at: string;
  view_count: number;
};

export async function issueDiagnosisPrintToken(diagnosisId: string) {
  if (!isUuid(diagnosisId) || !await canIssuePrintToken(diagnosisId)) {
    throw new Error("診断結果を確認できませんでした。");
  }

  const diagnosis = await getConstructionManagementDiagnosis(diagnosisId);
  if (!diagnosis?.detailed_completed_at) {
    throw new Error("詳細診断が完了していないため、印刷画面を作成できません。");
  }

  const supabase = requireDiagnosisClient();
  const token = createDiagnosisPrintToken();
  const tokenHash = hashDiagnosisPrintToken(token);
  const now = new Date();
  const expiresAt = getDiagnosisPrintExpiry(now).toISOString();
  const { error } = await supabase
    .from("construction_diagnosis_print_tokens")
    .upsert({
      diagnosis_id: diagnosisId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_at: now.toISOString(),
      last_used_at: null,
      view_count: 0
    }, { onConflict: "diagnosis_id" });
  if (error) throw new Error("印刷用画面を準備できませんでした。");

  await setDiagnosisPrintCookie(token);
  return {
    token,
    expiresAt,
    path: "/diagnosis/print",
    sharePath: `/diagnosis/print/${token}`
  };
}

export async function validateDiagnosisPrintToken(token: string, trackView = false) {
  if (!isDiagnosisPrintToken(token)) return { ok: false as const, reason: "invalid" as const };
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) return { ok: false as const, reason: "unavailable" as const };
  const tokenHash = hashDiagnosisPrintToken(token);
  const { data, error } = await supabase
    .from("construction_diagnosis_print_tokens")
    .select("diagnosis_id, token_hash, expires_at, view_count")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error || !data) return { ok: false as const, reason: "invalid" as const };

  const record = data as PrintTokenRecord;
  if (isDiagnosisPrintTokenExpired(record.expires_at)) {
    return { ok: false as const, reason: "expired" as const };
  }
  const diagnosis = await getConstructionManagementDiagnosis(record.diagnosis_id);
  if (!diagnosis?.detailed_completed_at) return { ok: false as const, reason: "invalid" as const };

  if (trackView) {
    await supabase
      .from("construction_diagnosis_print_tokens")
      .update({ last_used_at: new Date().toISOString(), view_count: Number(record.view_count ?? 0) + 1 })
      .eq("token_hash", tokenHash);
  }
  return { ok: true as const, diagnosis };
}

export async function getDiagnosisForPrint(): Promise<ConstructionManagementDiagnosis | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(DIAGNOSIS_PRINT_COOKIE)?.value;
  if (!token) return null;
  const result = await validateDiagnosisPrintToken(token);
  return result.ok ? result.diagnosis : null;
}

export async function setDiagnosisPrintCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(DIAGNOSIS_PRINT_COOKIE, token, getPrintCookieOptions());
}

export function getPrintCookieOptions() {
  return {
    httpOnly: true,
    maxAge: DIAGNOSIS_PRINT_TOKEN_DAYS_IN_SECONDS,
    path: "/diagnosis/print",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production"
  };
}

async function canIssuePrintToken(diagnosisId: string) {
  const cookieStore = await cookies();
  if (cookieStore.get(DIAGNOSIS_V22_SESSION_COOKIE)?.value === diagnosisId) return true;
  if (cookieStore.get(DIAGNOSIS_V2_RESULT_SESSION_COOKIE)?.value === diagnosisId) return true;
  return Boolean(await getCurrentDiagnosisAdmin());
}

function requireDiagnosisClient() {
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) throw new Error("診断用データベースへ接続できません。");
  return supabase;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const DIAGNOSIS_PRINT_TOKEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 30;
