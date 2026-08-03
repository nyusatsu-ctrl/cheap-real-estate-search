import "server-only";

import { cookies } from "next/headers";
import { createDiagnosisSupabaseServiceRoleClient } from "@/lib/supabase/diagnosis-server";
import type { DiagnosisV2AnswerMap, DiagnosisV2SectionId } from "./questions";
import type { ShortDiagnosisResultSnapshot } from "./short-result";
import type { GrowthStrategyResult } from "./strategy";
import type { OrderModel, PrimaryTrade, PublicWorkIntent } from "./specialty-questions";

export { classifyDiagnosisClient } from "./client-info";

export const DIAGNOSIS_V22_SESSION_COOKIE = "construction_management_diagnosis_v2_2_session";

export type DiagnosisV22Session = {
  id: string;
  diagnosis_id: string | null;
  diagnosis_version: string;
  lead_source: string;
  source_campaign: string | null;
  primary_trade: PrimaryTrade;
  order_model: OrderModel;
  employee_range: string;
  sales_range: string;
  public_work_intent: PublicWorkIntent;
  short_answers: DiagnosisV2AnswerMap;
  short_scores: Record<string, number>;
  short_axis_scores: Partial<Record<DiagnosisV2SectionId, number>>;
  short_total_score: number | null;
  short_critical_flags: string[];
  short_result: ShortDiagnosisResultSnapshot | null;
  short_started_at: string;
  short_last_step: number;
  short_completed_at: string | null;
  detailed_started_at: string | null;
  detailed_last_step: number | null;
  detailed_answers: DiagnosisV2AnswerMap;
  detailed_completed_at: string | null;
  diagnosis_status: "short_in_progress" | "short_completed" | "strategy_in_progress" | "strategy_completed" | "detailed_in_progress" | "detailed_completed" | "abandoned" | "expired";
  resume_token_hash: string | null;
  resume_token_expires_at: string | null;
  resume_token_created_at: string | null;
  resume_count: number;
  last_saved_at: string | null;
  detailed_total_questions: number;
  detailed_answered_count: number;
  detailed_last_question_id: string | null;
  detailed_current_step: number;
  detailed_answer_labels: Record<string, string>;
  strategy_question_ids: string[];
  strategy_question_reasons: Record<string, string>;
  strategy_low_score_sections: DiagnosisV2SectionId[];
  strategy_critical_sections: DiagnosisV2SectionId[];
  strategy_answers: DiagnosisV2AnswerMap;
  strategy_total_questions: number;
  strategy_answered_count: number;
  strategy_started_at: string | null;
  strategy_last_question_id: string | null;
  strategy_last_saved_at: string | null;
  strategy_completed_at: string | null;
  strategy_result: GrowthStrategyResult | null;
  abandoned_stage: string | null;
  abandoned_question_id: string | null;
  device_type: string;
  browser_family: string;
  created_at: string;
  updated_at: string;
};

export type DiagnosisV22FunnelSummary = {
  started: number;
  shortCompleted: number;
  shortCompletionRate: number;
  detailedStarted: number;
  detailedCompleted: number;
  strategyStarted: number;
  strategyCompleted: number;
  strategyConversionRate: number;
  consultationRequested: number;
  propertyWaitlist: number;
  activeAnonymous: number;
  abandonedQuestions: Array<{ label: string; count: number }>;
  tradeStats: Array<{ label: string; started: number; completed: number; rate: number }>;
  deviceStats: Array<{ label: string; started: number; completed: number; rate: number }>;
};

export type PropertySearchWaitlistEntry = {
  id: string;
  company_name: string;
  email: string;
  primary_trade: PrimaryTrade;
  interest_level: "notify" | "details";
  interest_topics: string[];
  source: string;
  created_at: string;
};

export async function setDiagnosisV22SessionCookie(id: string) {
  const cookieStore = await cookies();
  cookieStore.set(DIAGNOSIS_V22_SESSION_COOKIE, id, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 14,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

export async function hasDiagnosisV22Session(id: string) {
  const cookieStore = await cookies();
  return cookieStore.get(DIAGNOSIS_V22_SESSION_COOKIE)?.value === id;
}

export async function getDiagnosisV22Session(id: string, requireCookie = true) {
  if (requireCookie && !await hasDiagnosisV22Session(id)) return null;
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("construction_diagnosis_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return normalizeSession(data as DiagnosisV22Session);
}

export async function markDiagnosisV22DetailedStarted(id: string) {
  if (!await hasDiagnosisV22Session(id)) return;
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) return;
  const now = new Date().toISOString();
  await supabase
    .from("construction_diagnosis_sessions")
    .update({ detailed_started_at: now, diagnosis_status: "detailed_in_progress", abandoned_stage: "detailed", abandoned_question_id: null, last_saved_at: now })
    .eq("id", id)
    .is("detailed_started_at", null);
  await supabase
    .from("construction_diagnoses")
    .update({ detailed_started_at: now, diagnosis_status: "detailed_in_progress", abandoned_stage: "detailed", abandoned_question_id: null, last_saved_at: now })
    .eq("id", id)
    .is("detailed_started_at", null);
}

export async function markGrowthStrategyStarted(id: string) {
  if (!await hasDiagnosisV22Session(id)) return;
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) return;
  const now = new Date().toISOString();
  await supabase
    .from("construction_diagnosis_sessions")
    .update({
      strategy_started_at: now,
      diagnosis_status: "strategy_in_progress",
      abandoned_stage: "strategy",
      abandoned_question_id: null,
      strategy_last_saved_at: now,
      last_saved_at: now
    })
    .eq("id", id)
    .is("strategy_started_at", null);
}

export async function getDiagnosisV22FunnelSummary(): Promise<DiagnosisV22FunnelSummary | null> {
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("construction_diagnosis_sessions")
    .select("primary_trade, device_type, browser_family, short_completed_at, detailed_started_at, detailed_completed_at, strategy_started_at, strategy_completed_at, abandoned_stage, abandoned_question_id, diagnosis_id");
  if (error || !data) return null;

  const started = data.length;
  const shortCompleted = data.filter((row) => row.short_completed_at).length;
  const detailedStarted = data.filter((row) => row.detailed_started_at).length;
  const detailedCompleted = data.filter((row) => row.detailed_completed_at).length;
  const strategyStarted = data.filter((row) => row.strategy_started_at).length;
  const strategyCompleted = data.filter((row) => row.strategy_completed_at).length;
  const diagnosisIds = data.flatMap((row) => row.diagnosis_id ? [String(row.diagnosis_id)] : []);
  const [{ count: consultationRequested }, { count: propertyWaitlist }] = await Promise.all([
    diagnosisIds.length > 0
      ? supabase.from("construction_diagnoses").select("id", { count: "exact", head: true }).in("id", diagnosisIds).eq("consultation_requested", true)
      : Promise.resolve({ count: 0 }),
    supabase.from("property_search_waitlist").select("id", { count: "exact", head: true })
  ]);

  return {
    started,
    shortCompleted,
    shortCompletionRate: percentage(shortCompleted, started),
    detailedStarted,
    detailedCompleted,
    strategyStarted,
    strategyCompleted,
    strategyConversionRate: percentage(strategyStarted, shortCompleted),
    consultationRequested: consultationRequested ?? 0,
    propertyWaitlist: propertyWaitlist ?? 0,
    activeAnonymous: data.filter((row) => !row.diagnosis_id).length,
    abandonedQuestions: topCounts(data
      .filter((row) => row.abandoned_stage)
      .map((row) => `${row.abandoned_stage} / ${row.abandoned_question_id ?? "質問前"}`)),
    tradeStats: groupedCompletion(data, (row) => row.primary_trade || "未選択"),
    deviceStats: groupedCompletion(data, (row) => `${row.device_type || "不明"} / ${row.browser_family || "不明"}`)
  };
}

export async function getPropertySearchWaitlist(): Promise<PropertySearchWaitlistEntry[]> {
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("property_search_waitlist").select("id, company_name, email, primary_trade, interest_level, interest_topics, source, created_at").order("created_at", { ascending: false }).limit(200);
  if (error || !data) return [];
  return data.map((row) => ({
    ...row,
    primary_trade: row.primary_trade as PrimaryTrade,
    interest_level: row.interest_level as "notify" | "details",
    interest_topics: Array.isArray(row.interest_topics) ? row.interest_topics.map(String) : []
  }));
}

function normalizeSession(session: DiagnosisV22Session): DiagnosisV22Session {
  return {
    ...session,
    short_answers: session.short_answers ?? {},
    short_scores: session.short_scores ?? {},
    short_axis_scores: session.short_axis_scores ?? {},
    short_critical_flags: Array.isArray(session.short_critical_flags) ? session.short_critical_flags : [],
    short_result: session.short_result ?? null,
    detailed_answers: session.detailed_answers ?? {},
    diagnosis_status: session.diagnosis_status ?? (session.detailed_completed_at ? "detailed_completed" : session.detailed_started_at ? "detailed_in_progress" : session.short_completed_at ? "short_completed" : "short_in_progress"),
    resume_token_hash: session.resume_token_hash ?? null,
    resume_token_expires_at: session.resume_token_expires_at ?? null,
    resume_token_created_at: session.resume_token_created_at ?? null,
    resume_count: Number(session.resume_count ?? 0),
    last_saved_at: session.last_saved_at ?? session.updated_at ?? null,
    detailed_total_questions: Number(session.detailed_total_questions ?? 0),
    detailed_answered_count: Number(session.detailed_answered_count ?? 0),
    detailed_last_question_id: session.detailed_last_question_id ?? session.abandoned_question_id ?? null,
    detailed_current_step: Number(session.detailed_current_step ?? session.detailed_last_step ?? 0),
    detailed_answer_labels: session.detailed_answer_labels ?? {},
    strategy_question_ids: Array.isArray(session.strategy_question_ids) ? session.strategy_question_ids : [],
    strategy_question_reasons: session.strategy_question_reasons ?? {},
    strategy_low_score_sections: Array.isArray(session.strategy_low_score_sections) ? session.strategy_low_score_sections : [],
    strategy_critical_sections: Array.isArray(session.strategy_critical_sections) ? session.strategy_critical_sections : [],
    strategy_answers: session.strategy_answers ?? {},
    strategy_total_questions: Number(session.strategy_total_questions ?? 0),
    strategy_answered_count: Number(session.strategy_answered_count ?? 0),
    strategy_started_at: session.strategy_started_at ?? null,
    strategy_last_question_id: session.strategy_last_question_id ?? null,
    strategy_last_saved_at: session.strategy_last_saved_at ?? null,
    strategy_completed_at: session.strategy_completed_at ?? null,
    strategy_result: session.strategy_result ?? null
  };
}

function percentage(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

function topCounts(labels: string[]) {
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 10);
}

function groupedCompletion<T extends { short_completed_at: string | null }>(rows: T[], getLabel: (row: T) => string) {
  const groups = new Map<string, { started: number; completed: number }>();
  for (const row of rows) {
    const label = getLabel(row);
    const group = groups.get(label) ?? { started: 0, completed: 0 };
    group.started += 1;
    if (row.short_completed_at) group.completed += 1;
    groups.set(label, group);
  }
  return [...groups.entries()]
    .map(([label, group]) => ({ label, ...group, rate: percentage(group.completed, group.started) }))
    .sort((left, right) => right.started - left.started);
}
