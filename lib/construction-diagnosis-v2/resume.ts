import "server-only";

import { cookies } from "next/headers";
import { getCurrentDiagnosisAdmin } from "@/lib/diagnosis-admin";
import { createDiagnosisSupabaseServiceRoleClient } from "@/lib/supabase/diagnosis-server";
import { buildDetailedProgress } from "./progress";
import { type DiagnosisV22Session } from "./sessions";
import {
  createDiagnosisResumeToken,
  getDiagnosisResumeExpiry,
  hashDiagnosisResumeToken,
  isDiagnosisResumeExpired,
  isDiagnosisResumeToken
} from "./resume-token";

export const DIAGNOSIS_RESUME_COOKIE = "construction_management_diagnosis_resume_tokens";
const MAX_DEVICE_TOKENS = 5;

export type DiagnosisResumeCandidate = {
  token: string;
  diagnosisId: string;
  companyName: string;
  status: string;
  answeredCount: number;
  totalQuestions: number;
  remainingCount: number;
  lastSavedAt: string;
  startedAt: string;
  continueHref: string;
  quickResultHref: string;
};

export async function issueDiagnosisResumeToken(sessionId: string, persistOnDevice = true) {
  const supabase = requireDiagnosisClient();
  const { data, error } = await supabase
    .from("construction_diagnosis_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (error || !data) throw new Error("再開対象の診断を確認できませんでした。");

  const session = data as DiagnosisV22Session;
  if (!session.diagnosis_id) throw new Error("会社情報が保存されていないため、再開リンクを発行できません。");
  if (session.detailed_completed_at) throw new Error("完了済みの診断には再開リンクを発行できません。");

  const progress = getDetailedProgress(session);
  const token = createDiagnosisResumeToken();
  const tokenHash = hashDiagnosisResumeToken(token);
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = getDiagnosisResumeExpiry(now).toISOString();
  const status = session.detailed_started_at ? "detailed_in_progress" : "short_completed";
  const update = {
    diagnosis_status: status,
    resume_token_hash: tokenHash,
    resume_token_created_at: nowIso,
    resume_token_expires_at: expiresAt,
    last_saved_at: session.last_saved_at ?? session.updated_at ?? nowIso,
    detailed_total_questions: progress.total,
    detailed_answered_count: progress.answered,
    detailed_last_question_id: progress.lastQuestionId,
    detailed_current_step: Math.max(0, Number(session.detailed_current_step ?? session.detailed_last_step ?? 0)),
    detailed_answer_labels: progress.labels
  };

  const { error: sessionError } = await supabase
    .from("construction_diagnosis_sessions")
    .update(update)
    .eq("id", sessionId);
  if (sessionError) throw new Error("再開リンクを保存できませんでした。");

  const { error: diagnosisError } = await supabase
    .from("construction_diagnoses")
    .update(update)
    .eq("id", session.diagnosis_id);
  if (diagnosisError) throw new Error("診断レコードへ再開情報を保存できませんでした。");

  if (persistOnDevice) await addResumeTokenToDevice(token);
  return {
    token,
    expiresAt,
    path: `/diagnosis/resume/${token}`
  };
}

export async function getDiagnosisResumeCandidates(): Promise<DiagnosisResumeCandidate[]> {
  const tokens = await readDeviceResumeTokens();
  if (tokens.length === 0) return [];
  const hashToToken = new Map(tokens.map((token) => [hashDiagnosisResumeToken(token), token]));
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) return [];
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("construction_diagnosis_sessions")
    .select("*")
    .in("resume_token_hash", [...hashToToken.keys()])
    .is("detailed_completed_at", null)
    .gt("resume_token_expires_at", now)
    .order("last_saved_at", { ascending: false });
  if (error || !data?.length) return [];

  const diagnosisIds = data.flatMap((row) => row.diagnosis_id ? [String(row.diagnosis_id)] : []);
  const { data: diagnoses } = diagnosisIds.length > 0
    ? await supabase.from("construction_diagnoses").select("id, company_name").in("id", diagnosisIds)
    : { data: [] as Array<{ id: string; company_name: string }> };
  const companies = new Map((diagnoses ?? []).map((row) => [String(row.id), String(row.company_name || "会社名未入力")]));

  return data.flatMap((row) => {
    const token = hashToToken.get(String(row.resume_token_hash));
    if (!token || !row.diagnosis_id) return [];
    const progress = getDetailedProgress(row as DiagnosisV22Session);
    const total = Number(row.detailed_total_questions) || progress.total;
    const answered = Math.min(total, Number(row.detailed_answered_count) || progress.answered);
    return [{
      token,
      diagnosisId: String(row.diagnosis_id),
      companyName: companies.get(String(row.diagnosis_id)) ?? "会社名未入力",
      status: String(row.diagnosis_status || "detailed_in_progress"),
      answeredCount: answered,
      totalQuestions: total,
      remainingCount: Math.max(0, total - answered),
      lastSavedAt: String(row.last_saved_at || row.updated_at),
      startedAt: String(row.detailed_started_at || row.short_started_at || row.created_at),
      continueHref: `/diagnosis/resume/${token}`,
      quickResultHref: `/diagnosis/resume/${token}?view=quick`
    }];
  });
}

export async function validateDiagnosisResumeToken(token: string) {
  if (!isDiagnosisResumeToken(token)) return { ok: false as const, reason: "invalid" as const };
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) return { ok: false as const, reason: "unavailable" as const };
  const tokenHash = hashDiagnosisResumeToken(token);
  const { data, error } = await supabase
    .from("construction_diagnosis_sessions")
    .select("*")
    .eq("resume_token_hash", tokenHash)
    .maybeSingle();
  if (error || !data) return { ok: false as const, reason: "invalid" as const };
  if (data.detailed_completed_at) return { ok: false as const, reason: "completed" as const };
  if (isDiagnosisResumeExpired(data.resume_token_expires_at)) {
    await Promise.all([
      supabase.from("construction_diagnosis_sessions").update({ diagnosis_status: "expired" }).eq("id", data.id),
      data.diagnosis_id
        ? supabase.from("construction_diagnoses").update({ diagnosis_status: "expired" }).eq("id", data.diagnosis_id)
        : Promise.resolve()
    ]);
    return { ok: false as const, reason: "expired" as const };
  }
  if (!data.diagnosis_id) return { ok: false as const, reason: "invalid" as const };

  const nextCount = Number(data.resume_count ?? 0) + 1;
  await Promise.all([
    supabase.from("construction_diagnosis_sessions").update({ resume_count: nextCount }).eq("id", data.id),
    supabase.from("construction_diagnoses").update({ resume_count: nextCount }).eq("id", data.diagnosis_id)
  ]);
  return {
    ok: true as const,
    sessionId: String(data.id),
    diagnosisId: String(data.diagnosis_id),
    detailedStarted: Boolean(data.detailed_started_at)
  };
}

export function mergeDiagnosisResumeCookieValue(encoded: string | undefined, token: string) {
  const tokens = decodeResumeTokens(encoded).filter((candidate) => candidate !== token);
  return Buffer.from(JSON.stringify([token, ...tokens].slice(0, MAX_DEVICE_TOKENS))).toString("base64url");
}

export async function getCurrentDiagnosisResumePath(sessionId: string) {
  const tokens = await readDeviceResumeTokens();
  if (tokens.length === 0) return null;
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("construction_diagnosis_sessions")
    .select("resume_token_hash, resume_token_expires_at, detailed_completed_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!data?.resume_token_hash || data.detailed_completed_at) return null;
  if (isDiagnosisResumeExpired(data.resume_token_expires_at)) return null;
  const token = tokens.find((candidate) => hashDiagnosisResumeToken(candidate) === data.resume_token_hash);
  return token ? `/diagnosis/resume/${token}` : null;
}

export async function removeDiagnosisResumeTokenFromDevice(token: string) {
  const tokens = (await readDeviceResumeTokens()).filter((candidate) => candidate !== token);
  await writeDeviceResumeTokens(tokens);
}

export async function canAccessDiagnosisV22(id: string) {
  const cookieStore = await cookies();
  if (cookieStore.get("construction_management_diagnosis_v2_2_session")?.value === id) return true;
  return Boolean(await getCurrentDiagnosisAdmin());
}

function getDetailedProgress(session: DiagnosisV22Session) {
  const context = {
    primaryTrade: session.primary_trade,
    publicWorkIntent: session.public_work_intent,
    includeSpecialty: true
  };
  const progress = buildDetailedProgress(session.short_answers ?? {}, session.detailed_answers ?? {}, context, session.detailed_last_question_id ?? session.abandoned_question_id);
  return {
    total: progress.total,
    answered: progress.answered,
    lastQuestionId: progress.lastQuestionId,
    labels: progress.labels
  };
}

function requireDiagnosisClient() {
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) throw new Error("診断用データベースへ接続できません。");
  return supabase;
}

async function addResumeTokenToDevice(token: string) {
  const tokens = (await readDeviceResumeTokens()).filter((candidate) => candidate !== token);
  await writeDeviceResumeTokens([token, ...tokens].slice(0, MAX_DEVICE_TOKENS));
}

async function readDeviceResumeTokens() {
  const cookieStore = await cookies();
  return decodeResumeTokens(cookieStore.get(DIAGNOSIS_RESUME_COOKIE)?.value);
}

function decodeResumeTokens(encoded: string | undefined) {
  if (!encoded) return [];
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((token): token is string => typeof token === "string" && isDiagnosisResumeToken(token)).slice(0, MAX_DEVICE_TOKENS)
      : [];
  } catch {
    return [];
  }
}

async function writeDeviceResumeTokens(tokens: string[]) {
  const cookieStore = await cookies();
  if (tokens.length === 0) {
    cookieStore.delete(DIAGNOSIS_RESUME_COOKIE);
    return;
  }
  cookieStore.set(DIAGNOSIS_RESUME_COOKIE, Buffer.from(JSON.stringify(tokens)).toString("base64url"), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/diagnosis",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}
