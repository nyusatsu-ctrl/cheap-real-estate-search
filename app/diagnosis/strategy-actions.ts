"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createDiagnosisSupabaseServiceRoleClient } from "@/lib/supabase/diagnosis-server";
import { canAccessDiagnosisPrecheck } from "@/lib/construction-diagnosis-v2/precheck";
import { CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION, type DiagnosisV2AnswerMap } from "@/lib/construction-diagnosis-v2/questions";
import { getAdditionalDetailedQuestions } from "@/lib/construction-diagnosis-v2/short-questions";
import { getDiagnosisV22Session, hasDiagnosisV22Session } from "@/lib/construction-diagnosis-v2/sessions";
import { buildGrowthStrategyResult, getStrategyQuestions } from "@/lib/construction-diagnosis-v2/strategy";
import { getPrimaryTradeLabel } from "@/lib/construction-diagnosis-v2/specialty-questions";
import { recordDiagnosisEvent } from "@/lib/construction-diagnosis-v2/monitoring";

export type StrategyActionState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
  saved?: boolean;
};

const EMPTY: StrategyActionState = { fieldErrors: {} };

export async function submitGrowthStrategyAction(
  _state: StrategyActionState,
  formData: FormData
): Promise<StrategyActionState> {
  const id = value(formData, "session_id");
  if (!id || !await hasDiagnosisV22Session(id)) return { ...EMPTY, formError: "診断セッションを確認できません。最初からもう一度お試しください。" };
  const session = await getDiagnosisV22Session(id);
  if (!session?.short_completed_at || session.diagnosis_version !== CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION) {
    return { ...EMPTY, formError: "3分診断の結果を確認できません。" };
  }
  const questions = getStrategyQuestions(session.strategy_question_ids, {
    primaryTrade: session.primary_trade,
    publicWorkIntent: session.public_work_intent
  });
  const answers: DiagnosisV2AnswerMap = {};
  const fieldErrors: Record<string, string> = {};
  for (const question of questions) {
    const answer = value(formData, question.id);
    if (!question.options.some((option) => option.value === answer)) fieldErrors[question.id] = "回答を選択してください";
    else answers[question.id] = answer;
  }
  if (questions.length < 8 || questions.length > 10) return { ...EMPTY, formError: "追加質問の準備に失敗しました。3分診断結果からもう一度お進みください。" };
  if (Object.keys(fieldErrors).length > 0) return { formError: "未回答の質問があります。", fieldErrors };
  const result = buildGrowthStrategyResult({
    answers,
    questionIds: session.strategy_question_ids,
    axisScores: session.short_axis_scores,
    criticalFlags: session.short_critical_flags,
    lowScoreSections: session.strategy_low_score_sections,
    primaryTrade: session.primary_trade,
    publicWorkIntent: session.public_work_intent
  });
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) return { ...EMPTY, formError: "再成長戦略を保存できませんでした。時間をおいてもう一度押してください。" };
  const now = new Date().toISOString();
  const update = {
    strategy_answers: answers,
    strategy_answered_count: questions.length,
    strategy_last_question_id: questions.at(-1)?.id ?? null,
    strategy_last_saved_at: now,
    strategy_completed_at: now,
    strategy_result: result,
    diagnosis_status: "strategy_completed",
    detailed_completed_at: now,
    detailed_answers: answers,
    detailed_total_questions: questions.length,
    detailed_answered_count: questions.length,
    detailed_last_question_id: questions.at(-1)?.id ?? null,
    last_saved_at: now,
    abandoned_stage: null,
    abandoned_question_id: null,
    updated_at: now
  };
  const { error } = await supabase.from("construction_diagnosis_sessions").update(update).eq("id", id);
  if (error) {
    console.error("[diagnosis-v2.3] strategy_submit_failed", safeError(error));
    return { ...EMPTY, formError: "再成長戦略を保存できませんでした。入力内容はこの画面に残っています。もう一度押してください。" };
  }
  after(() => recordDiagnosisEvent({
    eventName: "detailed_diagnosis_completed",
    sessionId: id,
    source: session.lead_source,
    stepNumber: questions.length,
    totalSteps: questions.length,
    notify: true
  }));
  redirect(`/diagnosis/strategy-results/${id}`);
}

export async function saveGrowthStrategyResultAction(
  _state: StrategyActionState,
  formData: FormData
): Promise<StrategyActionState> {
  const id = value(formData, "session_id");
  const intent = value(formData, "intent");
  if (!id || !["save", "consultation"].includes(intent) || !await hasDiagnosisV22Session(id)) {
    return { ...EMPTY, formError: "診断結果を確認できません。" };
  }
  const session = await getDiagnosisV22Session(id);
  if (!session?.strategy_completed_at || !session.strategy_result) return { ...EMPTY, formError: "再成長戦略が完了していません。" };
  const fieldErrors: Record<string, string> = {};
  const companyName = required(formData, "company_name", "会社名", fieldErrors);
  const email = required(formData, "email", "メールアドレス", fieldErrors);
  const contactName = value(formData, "contact_name");
  const phone = value(formData, "phone");
  const consultationTopic = value(formData, "consultation_topic");
  const preferredDates = formData.getAll("preferred_meeting_dates").map(String).map((item) => item.trim()).filter(Boolean);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) fieldErrors.email = "正しいメールアドレスを入力してください";
  if (value(formData, "privacy_consent") !== "agreed") fieldErrors.privacy_consent = "個人情報の取り扱いへの同意が必要です";
  if (intent === "consultation") {
    if (!contactName) fieldErrors.contact_name = "氏名を入力してください";
    if (!phone) fieldErrors.phone = "電話番号を入力してください";
    if (!consultationTopic) fieldErrors.consultation_topic = "相談内容を入力してください";
    if (preferredDates.length === 0) fieldErrors.preferred_meeting_dates = "希望日時を入力してください";
  }
  if (Object.keys(fieldErrors).length > 0) return { formError: "入力内容を確認してください。", fieldErrors };
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) return { ...EMPTY, formError: "保存できませんでした。時間をおいてもう一度押してください。" };
  const now = new Date().toISOString();
  const consultationRequested = intent === "consultation";
  const commonUpdate = {
    company_name: companyName,
    email,
    name: contactName || "未入力",
    respondent_name: contactName || "未入力",
    phone: phone || "未入力",
    consented_at: now,
    strategy_question_ids: session.strategy_question_ids,
    strategy_question_reasons: session.strategy_question_reasons,
    strategy_low_score_sections: session.strategy_low_score_sections,
    strategy_critical_sections: session.strategy_critical_sections,
    strategy_answers: session.strategy_answers,
    strategy_total_questions: session.strategy_total_questions,
    strategy_answered_count: session.strategy_answered_count,
    strategy_started_at: session.strategy_started_at,
    strategy_last_question_id: session.strategy_last_question_id,
    strategy_last_saved_at: session.strategy_last_saved_at,
    strategy_completed_at: session.strategy_completed_at,
    strategy_result: session.strategy_result,
    strategy_growth_work: session.strategy_result.workPriorities.growth,
    strategy_maintain_work: session.strategy_result.workPriorities.maintain,
    strategy_review_work: session.strategy_result.workPriorities.review,
    strategy_monthly_metrics: session.strategy_result.monthlyMetrics,
    quick_answers: session.short_answers,
    quick_scores: session.short_scores,
    quick_completed_at: session.short_completed_at,
    axis_scores: session.short_axis_scores,
    total_score: session.short_total_score,
    critical_flags: session.short_critical_flags,
    detailed_answers: session.strategy_answers,
    detailed_completed_at: session.strategy_completed_at,
    detailed_total_questions: session.strategy_total_questions,
    detailed_answered_count: session.strategy_answered_count,
    detailed_last_question_id: session.strategy_last_question_id,
    diagnosis_status: "strategy_completed",
    consultation_requested: consultationRequested,
    preferred_meeting_dates: preferredDates,
    consultation_topic: consultationTopic || null,
    wants_consultation: consultationRequested ? "yes" : "no",
    sales_status: consultationRequested ? "waiting" : "uncontacted",
    last_saved_at: now,
    updated_at: now
  };
  let error: { code?: string; message?: string; details?: string; hint?: string } | null = null;
  if (session.diagnosis_id) {
    ({ error } = await supabase.from("construction_diagnoses").update(commonUpdate).eq("id", session.diagnosis_id));
  } else {
    const payload = {
      id: session.id,
      diagnosis_version: CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION,
      representative_name: null,
      prefecture: "未入力",
      address: null,
      website_url: null,
      employee_range: session.employee_range,
      founding_year: null,
      sales_range: session.sales_range,
      main_business: getPrimaryTradeLabel(session.primary_trade),
      primary_trade: session.primary_trade,
      secondary_trades: [],
      order_models: [session.order_model],
      prime_ratio: null,
      subcontract_ratio: null,
      public_ratio: null,
      consumer_ratio: null,
      self_perform_ratio: null,
      average_project_size: null,
      public_work_intent: session.public_work_intent,
      source: null,
      lead_source: session.lead_source,
      source_campaign: session.source_campaign,
      specialty_answers: {},
      specialty_score: null,
      specialty_summary: null,
      judgment: null,
      diagnosis_result: null,
      deal_status: "open",
      answers: { ...session.short_answers, ...session.strategy_answers },
      scores: session.short_axis_scores,
      main_type: "G",
      sub_type: "C",
      business_type: getPrimaryTradeLabel(session.primary_trade),
      monthly_sales: session.sales_range,
      seminar_interest: "undecided",
      preferred_contact_time: null,
      lead_status: "new",
      lead_updated_at: now,
      anonymous_session_id: session.id,
      short_started_at: session.short_started_at,
      short_last_step: session.short_last_step,
      detailed_started_at: session.strategy_started_at,
      detailed_last_step: session.strategy_total_questions,
      abandoned_stage: null,
      abandoned_question_id: null,
      device_type: session.device_type,
      browser_family: session.browser_family,
      ...commonUpdate
    };
    ({ error } = await supabase.from("construction_diagnoses").insert(payload));
  }
  if (error) {
    console.error("[diagnosis-v2.3] strategy_contact_save_failed", safeError(error));
    return { ...EMPTY, formError: "保存できませんでした。入力内容は消えていません。もう一度押してください。" };
  }
  await supabase.from("construction_diagnosis_sessions").update({ diagnosis_id: session.id, last_saved_at: now, updated_at: now }).eq("id", session.id);
  after(() => recordDiagnosisEvent({ eventName: "company_info_submitted", sessionId: session.id, diagnosisId: session.id, source: session.lead_source, notify: true }));
  if (consultationRequested) {
    after(() => recordDiagnosisEvent({ eventName: "consultation_requested", sessionId: session.id, diagnosisId: session.id, source: session.lead_source, notify: true }));
  }
  revalidatePath("/admin/diagnoses");
  revalidatePath(`/diagnosis/strategy-results/${session.id}`);
  if (consultationRequested) redirect(`/diagnosis/strategy-results/${session.id}?consultation=complete`);
  redirect(`/diagnosis/results/${session.id}`);
}

export async function savePropertySearchInterestAction(
  _state: StrategyActionState,
  formData: FormData
): Promise<StrategyActionState> {
  const id = value(formData, "session_id");
  if (!id || !await hasDiagnosisV22Session(id)) return { ...EMPTY, formError: "診断結果を確認できません。" };
  const session = await getDiagnosisV22Session(id);
  if (!session?.short_completed_at) return { ...EMPTY, formError: "3分診断の結果を確認できません。" };
  const interest = value(formData, "property_search_interest");
  if (!["notify", "details", "not_interested"].includes(interest)) return { formError: "希望を選択してください。", fieldErrors: { property_search_interest: "希望を選択してください" } };
  const topics = formData.getAll("property_search_interest_topics").map(String).filter(Boolean);
  const companyName = value(formData, "company_name");
  const email = value(formData, "email").toLowerCase();
  const fieldErrors: Record<string, string> = {};
  if (interest !== "not_interested") {
    if (!companyName) fieldErrors.company_name = "会社名を入力してください";
    if (!/^\S+@\S+\.\S+$/.test(email)) fieldErrors.email = "正しいメールアドレスを入力してください";
    if (topics.length === 0) fieldErrors.property_search_interest_topics = "知りたい内容を1つ以上選択してください";
  }
  if (Object.keys(fieldErrors).length > 0) return { formError: "入力内容を確認してください。", fieldErrors };
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) return { ...EMPTY, formError: "希望を保存できませんでした。" };
  const now = new Date().toISOString();
  const update = { property_search_interest: interest, property_search_interest_topics: topics, property_search_interest_submitted_at: now, updated_at: now };
  const { error: sessionError } = await supabase.from("construction_diagnosis_sessions").update(update).eq("id", id);
  if (sessionError) return { ...EMPTY, formError: "希望を保存できませんでした。" };
  if (session.diagnosis_id) await supabase.from("construction_diagnoses").update(update).eq("id", session.diagnosis_id);
  if (interest !== "not_interested") {
    const { error } = await supabase.from("property_search_waitlist").upsert({
      diagnosis_id: session.diagnosis_id,
      session_id: session.id,
      company_name: companyName,
      email,
      primary_trade: session.primary_trade,
      interest_level: interest,
      interest_topics: topics,
      source: session.lead_source,
      updated_at: now
    }, { onConflict: "email" });
    if (error) {
      console.error("[diagnosis-v2.3] property_waitlist_save_failed", safeError(error));
      return { ...EMPTY, formError: "案内希望を保存できませんでした。もう一度押してください。" };
    }
  }
  revalidatePath(`/diagnosis/strategy-results/${id}`);
  revalidatePath("/admin/diagnoses");
  return { fieldErrors: {}, saved: true };
}

export async function submitDiagnosisV23PrecheckAction(
  _state: StrategyActionState,
  formData: FormData
): Promise<StrategyActionState> {
  const id = value(formData, "id");
  if (!id || !await hasDiagnosisV22Session(id) || !await canAccessDiagnosisPrecheck(id)) return { ...EMPTY, formError: "事前確認用URLを確認できません。管理者へご連絡ください。" };
  const session = await getDiagnosisV22Session(id);
  if (!session?.diagnosis_id || session.diagnosis_version !== CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION) return { ...EMPTY, formError: "事前確認の対象を確認できません。" };
  const questions = getAdditionalDetailedQuestions(session.short_answers, { primaryTrade: session.primary_trade, publicWorkIntent: session.public_work_intent, includeSpecialty: true });
  const answers: DiagnosisV2AnswerMap = {};
  const fieldErrors: Record<string, string> = {};
  for (const question of questions) {
    const answer = value(formData, question.id);
    if (!question.options.some((option) => option.value === answer)) fieldErrors[question.id] = "回答を選択してください";
    else answers[question.id] = answer;
  }
  if (Object.keys(fieldErrors).length > 0) return { formError: "未回答の質問があります。", fieldErrors };
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) return { ...EMPTY, formError: "事前確認を保存できませんでした。" };
  const now = new Date().toISOString();
  const update = { precheck_answers: answers, precheck_completed_at: now, diagnosis_status: "strategy_completed", detailed_answered_count: questions.length, detailed_total_questions: questions.length, detailed_last_question_id: questions.at(-1)?.id ?? null, last_saved_at: now, updated_at: now };
  const [{ error: diagnosisError }, { error: sessionError }] = await Promise.all([
    supabase.from("construction_diagnoses").update(update).eq("id", session.diagnosis_id),
    supabase.from("construction_diagnosis_sessions").update(update).eq("id", session.id)
  ]);
  if (diagnosisError || sessionError) {
    console.error("[diagnosis-v2.3] precheck_submit_failed", safeError(diagnosisError ?? sessionError!));
    return { ...EMPTY, formError: "事前確認を保存できませんでした。入力内容はこの画面に残っています。" };
  }
  revalidatePath(`/admin/diagnoses/${session.diagnosis_id}`);
  redirect(`/diagnosis/results/${session.diagnosis_id}`);
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function required(formData: FormData, key: string, label: string, errors: Record<string, string>) {
  const result = value(formData, key);
  if (!result) errors[key] = `${label}を入力してください`;
  return result;
}

function safeError(error: { code?: string; message?: string; details?: string; hint?: string }) {
  return { code: error.code, message: error.message, details: error.details, hint: error.hint };
}
