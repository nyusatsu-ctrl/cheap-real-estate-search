import "server-only";

import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getCurrentDiagnosisAdmin } from "@/lib/diagnosis-admin";
import { createDiagnosisSupabaseServiceRoleClient } from "@/lib/supabase/diagnosis-server";
import { CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION } from "./questions";

export const DIAGNOSIS_PRECHECK_COOKIE = "construction_management_diagnosis_precheck_access";

export async function issueDiagnosisPrecheckToken(diagnosisId: string) {
  const supabase = requireClient();
  const { data } = await supabase.from("construction_diagnoses").select("id, diagnosis_version, anonymous_session_id").eq("id", diagnosisId).maybeSingle();
  if (!data || data.diagnosis_version !== CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION || !data.anonymous_session_id) throw new Error("v2.3診断を確認できません。");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  const update = { precheck_token_hash: hash(token), precheck_token_expires_at: expiresAt };
  const [{ error: diagnosisError }, { error: sessionError }] = await Promise.all([
    supabase.from("construction_diagnoses").update(update).eq("id", diagnosisId),
    supabase.from("construction_diagnosis_sessions").update(update).eq("id", data.anonymous_session_id)
  ]);
  if (diagnosisError || sessionError) throw new Error("事前確認用URLを保存できませんでした。");
  return { path: `/diagnosis/precheck/${token}`, expiresAt };
}

export async function validateDiagnosisPrecheckToken(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) return null;
  const { data } = await supabase.from("construction_diagnoses").select("id, anonymous_session_id, precheck_token_expires_at").eq("precheck_token_hash", hash(token)).maybeSingle();
  if (!data?.anonymous_session_id || !data.precheck_token_expires_at || new Date(data.precheck_token_expires_at).getTime() <= Date.now()) return null;
  const now = new Date().toISOString();
  await Promise.all([
    supabase.from("construction_diagnoses").update({ precheck_started_at: now }).eq("id", data.id).is("precheck_started_at", null),
    supabase.from("construction_diagnosis_sessions").update({ precheck_started_at: now, abandoned_stage: "precheck", last_saved_at: now }).eq("id", data.anonymous_session_id).is("precheck_started_at", null)
  ]);
  return { diagnosisId: String(data.id), sessionId: String(data.anonymous_session_id) };
}

export async function canAccessDiagnosisPrecheck(diagnosisId: string) {
  const cookieStore = await cookies();
  if (cookieStore.get(DIAGNOSIS_PRECHECK_COOKIE)?.value === diagnosisId) return true;
  return Boolean(await getCurrentDiagnosisAdmin());
}

function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
function requireClient() { const client = createDiagnosisSupabaseServiceRoleClient(); if (!client) throw new Error("診断用データベースへ接続できません。"); return client; }
