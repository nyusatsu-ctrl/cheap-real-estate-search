"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION,
  SUPPORTED_CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSIONS,
  getApplicableDetailedQuestions,
  isSpecialtyConstructionDiagnosisVersion,
  scoreDetailedDiagnosis,
  type DiagnosisV2AnswerMap,
  type DiagnosisV2ScoringContext
} from "@/lib/construction-diagnosis-v2/questions";
import {
  getInheritedDetailedAnswers,
  getShortDiagnosisQuestions,
  scoreShortDiagnosis
} from "@/lib/construction-diagnosis-v2/short-questions";
import {
  validateDiagnosisV22ResultContact,
  type DiagnosisV22ResultIntent
} from "@/lib/construction-diagnosis-v2/result-contact";
import { buildShortDiagnosisResult } from "@/lib/construction-diagnosis-v2/short-result";
import {
  getDiagnosisV22Session,
  hasDiagnosisV22Session
} from "@/lib/construction-diagnosis-v2/sessions";
import { buildDiagnosisV2Result } from "@/lib/construction-diagnosis-v2/results";
import {
  ALL_SPECIALTY_QUESTIONS,
  DIAGNOSIS_V22_ORDER_MODEL_OPTIONS,
  PRIMARY_TRADE_OPTIONS,
  PUBLIC_WORK_INTENT_OPTIONS,
  buildSpecialtyDiagnosisSummary,
  getPrimaryTradeLabel,
  type OrderModel,
  type PrimaryTrade,
  type PublicWorkIntent
} from "@/lib/construction-diagnosis-v2/specialty-questions";
import {
  DIAGNOSIS_V22_EMPLOYEE_OPTIONS,
  DIAGNOSIS_V22_SALES_OPTIONS
} from "@/lib/construction-diagnosis-v2/start-form";
import { createDiagnosisSupabaseServiceRoleClient } from "@/lib/supabase/diagnosis-server";

const DIAGNOSIS_V2_SESSION_COOKIE = "construction_management_diagnosis_v2_session";

export type DiagnosisV2FormState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

export type DiagnosisV22ResultFormState = DiagnosisV2FormState & {
  saved?: boolean;
};

const EMPTY_STATE: DiagnosisV2FormState = { fieldErrors: {} };

export async function submitDiagnosisV2QuickAction(
  _previousState: DiagnosisV2FormState,
  formData: FormData
): Promise<DiagnosisV2FormState> {
  const fieldErrors: Record<string, string> = {};
  const sessionId = getString(formData, "session_id");
  if (!sessionId || !await hasDiagnosisV22Session(sessionId)) {
    return { ...EMPTY_STATE, formError: "保存した診断を確認できません。最初の画面からもう一度進んでください。" };
  }
  const primaryTradeValue = getString(formData, "primary_trade");
  const primaryTrade = PRIMARY_TRADE_OPTIONS.some((option) => option.value === primaryTradeValue)
    ? primaryTradeValue as PrimaryTrade
    : null;
  if (!primaryTrade) fieldErrors.primary_trade = "会社の主な業種を選んでください";

  const orderModelValue = getString(formData, "order_model");
  const orderModel = DIAGNOSIS_V22_ORDER_MODEL_OPTIONS.some((option) => option.value === orderModelValue)
    ? orderModelValue as OrderModel
    : null;
  if (!orderModel) fieldErrors.order_model = "主な仕事の受け方を選んでください";

  const employeeRange = getString(formData, "employee_range");
  if (!DIAGNOSIS_V22_EMPLOYEE_OPTIONS.includes(employeeRange)) fieldErrors.employee_range = "従業員数を選んでください";
  const salesRange = getString(formData, "sales_range");
  if (!DIAGNOSIS_V22_SALES_OPTIONS.includes(salesRange)) fieldErrors.sales_range = "年商区分を選んでください";

  const publicWorkIntentValue = getString(formData, "public_work_intent");
  const publicWorkIntent = PUBLIC_WORK_INTENT_OPTIONS.some((option) => option.value === publicWorkIntentValue)
    ? publicWorkIntentValue as PublicWorkIntent
    : null;
  if (!publicWorkIntent) fieldErrors.public_work_intent = "公共工事への考えを選んでください";

  const quickAnswers: DiagnosisV2AnswerMap = {};
  const quickContext: DiagnosisV2ScoringContext = {
    primaryTrade: primaryTrade ?? undefined,
    publicWorkIntent: publicWorkIntent ?? undefined
  };
  for (const question of getShortDiagnosisQuestions(quickContext)) {
    const answer = getString(formData, question.id);
    if (!question.optional && !question.options.some((option) => option.value === answer)) {
      fieldErrors[question.id] = "この質問に回答してください";
    } else if (question.options.some((option) => option.value === answer)) {
      quickAnswers[question.id] = answer;
    }
  }

  const quickResult = scoreShortDiagnosis(quickAnswers, quickContext);
  if (!quickResult.complete) {
    for (const id of quickResult.unanswered) fieldErrors[id] = "この質問に回答してください";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      formError: "回答を確認してください。",
      fieldErrors
    };
  }

  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) {
    console.error("[diagnosis-v2] quick_submit_missing_service_client");
    return { ...EMPTY_STATE, formError: "診断を保存できませんでした。入力内容は消えていません。時間をおいて、もう一度押してください。" };
  }

  const now = new Date().toISOString();
  const shortResult = buildShortDiagnosisResult(quickAnswers, quickResult, primaryTrade!, publicWorkIntent!);
  const lastQuestion = getShortDiagnosisQuestions(quickContext).at(-1)?.id ?? null;
  const { error } = await supabase
    .from("construction_diagnosis_sessions")
    .update({
      primary_trade: primaryTrade,
      order_model: orderModel,
      employee_range: employeeRange,
      sales_range: salesRange,
      public_work_intent: publicWorkIntent,
      short_answers: quickAnswers,
      short_scores: quickResult.categoryScores,
      short_axis_scores: quickResult.axisScores,
      short_total_score: quickResult.totalScore,
      short_critical_flags: quickResult.criticalFlags,
      short_result: shortResult,
      short_last_step: getShortDiagnosisQuestions(quickContext).length,
      short_completed_at: now,
      abandoned_stage: "quick_result",
      abandoned_question_id: lastQuestion
    })
    .eq("id", sessionId)
    .is("short_completed_at", null);
  if (error) {
    console.error("[diagnosis-v2] quick_submit_failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return { ...EMPTY_STATE, formError: "診断を保存できませんでした。入力内容は消えていません。時間をおいて、もう一度押してください。" };
  }

  redirect(`/diagnosis/quick-results/${sessionId}`);
}

export async function submitDiagnosisV22ResultAction(
  _previousState: DiagnosisV22ResultFormState,
  formData: FormData
): Promise<DiagnosisV22ResultFormState> {
  const sessionId = getString(formData, "session_id");
  const intent = getString(formData, "intent");
  if (!sessionId || !["save", "details", "consultation"].includes(intent) || !await hasDiagnosisV22Session(sessionId)) {
    return { ...EMPTY_STATE, formError: "診断結果を確認できません。最初からもう一度お試しください。" };
  }
  const session = await getDiagnosisV22Session(sessionId);
  if (!session?.short_completed_at || !session.short_result) {
    return { ...EMPTY_STATE, formError: "3分診断が完了していません。回答を確認してください。" };
  }

  const companyName = getString(formData, "company_name");
  const email = getString(formData, "email");
  const contactName = nullableString(formData, "contact_name");
  const phone = nullableString(formData, "phone");
  const consultationTopic = nullableString(formData, "consultation_topic");
  const preferredDates = formData.getAll("preferred_meeting_dates").map((value) => String(value).trim()).filter(Boolean);
  const fieldErrors = validateDiagnosisV22ResultContact({
    intent: intent as DiagnosisV22ResultIntent,
    companyName,
    email,
    privacyConsent: getString(formData, "privacy_consent"),
    contactName: contactName ?? undefined,
    phone: phone ?? undefined,
    consultationTopic: consultationTopic ?? undefined,
    preferredDates
  });
  if (Object.keys(fieldErrors).length > 0) return { formError: "入力内容を確認してください。", fieldErrors };

  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) return { ...EMPTY_STATE, formError: "保存できませんでした。入力内容は消えていません。もう一度押してください。" };
  const now = new Date().toISOString();
  const respondentName = contactName || "未入力";
  const mainBusiness = getPrimaryTradeLabel(session.primary_trade);
  const consultationRequested = intent === "consultation";
  const contactUpdate = {
    company_name: companyName,
    email,
    name: respondentName,
    respondent_name: respondentName,
    phone: phone || "未入力",
    consented_at: now,
    updated_at: now,
    ...(consultationRequested ? {
      consultation_requested: true,
      preferred_meeting_dates: preferredDates,
      consultation_topic: consultationTopic,
      wants_consultation: "yes",
      sales_status: "waiting"
    } : {})
  };

  let saveError: { code?: string; message?: string; details?: string; hint?: string } | null = null;
  if (session.diagnosis_id) {
    const { error } = await supabase.from("construction_diagnoses").update(contactUpdate).eq("id", session.diagnosis_id);
    saveError = error;
  } else {
    const payload = {
      id: session.id,
      diagnosis_version: CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION,
      name: respondentName,
      respondent_name: respondentName,
      company_name: companyName,
      representative_name: null,
      prefecture: "未入力",
      address: null,
      phone: phone || "未入力",
      email,
      website_url: null,
      employee_range: session.employee_range,
      founding_year: null,
      sales_range: session.sales_range,
      main_business: mainBusiness,
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
      quick_answers: session.short_answers,
      quick_scores: session.short_scores,
      quick_completed_at: session.short_completed_at,
      consented_at: now,
      detailed_answers: {},
      specialty_answers: {},
      specialty_score: null,
      specialty_summary: null,
      axis_scores: session.short_axis_scores,
      total_score: session.short_total_score,
      critical_flags: session.short_critical_flags,
      judgment: null,
      diagnosis_result: null,
      consultation_requested: consultationRequested,
      preferred_meeting_dates: preferredDates,
      consultation_topic: consultationTopic,
      sales_status: consultationRequested ? "waiting" : "uncontacted",
      deal_status: "open",
      answers: session.short_answers,
      scores: session.short_scores,
      main_type: "G",
      sub_type: "C",
      business_type: mainBusiness,
      monthly_sales: session.sales_range,
      wants_consultation: consultationRequested ? "yes" : "no",
      seminar_interest: "undecided",
      preferred_contact_time: null,
      lead_status: "new",
      lead_updated_at: now,
      anonymous_session_id: session.id,
      short_started_at: session.short_started_at,
      short_last_step: session.short_last_step,
      detailed_started_at: intent === "details" ? now : null,
      detailed_last_step: null,
      abandoned_stage: intent === "details" ? "detailed" : "quick_result",
      abandoned_question_id: intent === "details" ? null : session.abandoned_question_id,
      device_type: session.device_type,
      browser_family: session.browser_family,
      updated_at: now
    };
    const { error } = await supabase.from("construction_diagnoses").insert(payload);
    saveError = error;
  }
  if (saveError) {
    console.error("[diagnosis-v2.2] contact_save_failed", safeError(saveError));
    return { ...EMPTY_STATE, formError: "保存できませんでした。入力内容は消えていません。もう一度押してください。" };
  }

  const { error: sessionError } = await supabase
    .from("construction_diagnosis_sessions")
    .update({
      diagnosis_id: session.id,
      detailed_started_at: intent === "details" ? now : session.detailed_started_at,
      abandoned_stage: intent === "details" ? "detailed" : null,
      abandoned_question_id: null
    })
    .eq("id", session.id);
  if (sessionError) console.error("[diagnosis-v2.2] session_promote_update_failed", safeError(sessionError));

  revalidatePath(`/diagnosis/quick-results/${session.id}`);
  revalidatePath("/admin/diagnoses");
  if (intent === "details") redirect(`/diagnosis/details/${session.id}`);
  return { fieldErrors: {}, success: true, saved: true };
}

export async function submitDiagnosisV2DetailedAction(
  _previousState: DiagnosisV2FormState,
  formData: FormData
): Promise<DiagnosisV2FormState> {
  const id = getString(formData, "id");
  if (!id || !await hasDiagnosisV2Session(id)) {
    return { ...EMPTY_STATE, formError: "診断セッションを確認できません。簡易診断から再度お進みください。" };
  }

  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) {
    console.error("[diagnosis-v2] detailed_submit_missing_service_client");
    return { ...EMPTY_STATE, formError: "詳細診断を保存できませんでした。時間をおいて再度お試しください。" };
  }

  const { data: diagnosis, error: diagnosisError } = await supabase
    .from("construction_diagnoses")
    .select("id, diagnosis_version, primary_trade, public_work_intent")
    .eq("id", id)
    .maybeSingle();
  if (diagnosisError || !diagnosis || !SUPPORTED_CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSIONS.includes(
    String(diagnosis.diagnosis_version) as (typeof SUPPORTED_CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSIONS)[number]
  )) {
    console.error("[diagnosis-v2] detailed_submit_diagnosis_lookup_failed", {
      code: diagnosisError?.code,
      message: diagnosisError?.message,
      diagnosisFound: Boolean(diagnosis)
    });
    return { ...EMPTY_STATE, formError: "診断データを確認できませんでした。簡易診断から再度お進みください。" };
  }

  const hasSpecialty = isSpecialtyConstructionDiagnosisVersion(diagnosis.diagnosis_version);
  const context: DiagnosisV2ScoringContext = hasSpecialty
    ? {
        primaryTrade: diagnosis.primary_trade as PrimaryTrade | null,
        publicWorkIntent: diagnosis.public_work_intent as PublicWorkIntent | null,
        includeSpecialty: true
      }
    : { includeSpecialty: false };
  const applicableQuestions = getApplicableDetailedQuestions(context);

  const { data: storedDiagnosis } = await supabase
    .from("construction_diagnoses")
    .select("quick_answers")
    .eq("id", id)
    .maybeSingle();
  const inheritedAnswers = diagnosis.diagnosis_version === CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION
    ? getInheritedDetailedAnswers((storedDiagnosis?.quick_answers ?? {}) as DiagnosisV2AnswerMap)
    : {};
  const detailedAnswers: DiagnosisV2AnswerMap = { ...inheritedAnswers };
  const fieldErrors: Record<string, string> = {};
  for (const question of applicableQuestions) {
    const answer = getString(formData, question.id);
    if (!question.options.some((option) => option.value === answer)) {
      fieldErrors[question.id] = "回答を選択してください";
    } else {
      detailedAnswers[question.id] = answer;
    }
  }

  const scoring = scoreDetailedDiagnosis(detailedAnswers, context);
  if (!scoring.complete) {
    for (const questionId of scoring.unanswered) fieldErrors[questionId] = "回答を選択してください";
  }
  if (Object.keys(fieldErrors).length > 0 || scoring.totalScore === null || !scoring.judgment) {
    return {
      formError: "回答していない質問があります。表示された質問を確認してください。",
      fieldErrors
    };
  }

  const diagnosisResult = buildDiagnosisV2Result(detailedAnswers, scoring, context);
  const specialtyQuestionIds = new Set(ALL_SPECIALTY_QUESTIONS.map((question) => question.id));
  const specialtyAnswers = Object.fromEntries(
    Object.entries(detailedAnswers).filter(([questionId]) => specialtyQuestionIds.has(questionId))
  );
  const specialtySummary = hasSpecialty
    ? buildSpecialtyDiagnosisSummary(diagnosis.primary_trade, specialtyAnswers)
    : null;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("construction_diagnoses")
    .update({
      detailed_answers: detailedAnswers,
      specialty_answers: specialtyAnswers,
      specialty_score: specialtySummary?.score ?? null,
      specialty_summary: specialtySummary,
      axis_scores: scoring.axisScores,
      total_score: scoring.totalScore,
      critical_flags: scoring.criticalFlags,
      judgment: scoring.judgment,
      diagnosis_result: diagnosisResult,
      detailed_completed_at: now,
      detailed_last_step: applicableQuestions.length,
      abandoned_stage: null,
      abandoned_question_id: null,
      updated_at: now,
      answers: detailedAnswers,
      scores: scoring.axisScores
    })
    .eq("id", id)
    .eq("diagnosis_version", diagnosis.diagnosis_version);

  if (error) {
    console.error("[diagnosis-v2] detailed_submit_failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return { ...EMPTY_STATE, formError: "詳細診断を保存できませんでした。時間をおいて再度お試しください。" };
  }

  if (diagnosis.diagnosis_version === CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION) {
    const { error: progressError } = await supabase
      .from("construction_diagnosis_sessions")
      .update({
        detailed_answers: detailedAnswers,
        detailed_completed_at: now,
        detailed_last_step: applicableQuestions.length,
        abandoned_stage: null,
        abandoned_question_id: null
      })
      .eq("id", id);
    if (progressError) console.error("[diagnosis-v2.2] detailed_progress_complete_failed", safeError(progressError));
  }

  redirect(`/diagnosis/results/${id}`);
}

export async function submitDiagnosisV2ConsultationAction(
  _previousState: DiagnosisV2FormState,
  formData: FormData
): Promise<DiagnosisV2FormState> {
  const id = getString(formData, "id");
  if (!id || !await hasDiagnosisV2Session(id)) {
    return { ...EMPTY_STATE, formError: "診断セッションを確認できません。" };
  }

  const fieldErrors: Record<string, string> = {};
  const topic = requiredString(formData, "consultation_topic", "相談内容", fieldErrors);
  const preferredDates = formData
    .getAll("preferred_meeting_dates")
    .map((value) => String(value).trim())
    .filter(Boolean);
  if (preferredDates.length === 0) fieldErrors.preferred_meeting_dates = "希望日時を1つ以上入力してください";
  if (Object.keys(fieldErrors).length > 0) {
    return { formError: "相談申込みの入力内容を確認してください。", fieldErrors };
  }

  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) {
    console.error("[diagnosis-v2] consultation_missing_service_client");
    return { ...EMPTY_STATE, formError: "相談申込みを保存できませんでした。" };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("construction_diagnoses")
    .update({
      consultation_requested: true,
      preferred_meeting_dates: preferredDates,
      consultation_topic: topic,
      consultation_contact_time: nullableString(formData, "consultation_contact_time"),
      consultation_notes: nullableString(formData, "consultation_notes"),
      wants_consultation: "yes",
      sales_status: "waiting",
      updated_at: now
    })
    .eq("id", id)
    .in("diagnosis_version", [...SUPPORTED_CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSIONS]);

  if (error) {
    console.error("[diagnosis-v2] consultation_submit_failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return { ...EMPTY_STATE, formError: "相談申込みを保存できませんでした。時間をおいて再度お試しください。" };
  }

  revalidatePath(`/diagnosis/results/${id}`);
  revalidatePath(`/admin/diagnoses/${id}`);
  return { fieldErrors: {}, success: true };
}

export async function submitDiagnosisV2FeedbackAction(
  _previousState: DiagnosisV2FormState,
  formData: FormData
): Promise<DiagnosisV2FormState> {
  const id = getString(formData, "id");
  if (!id || !await hasDiagnosisV2Session(id)) {
    return { ...EMPTY_STATE, formError: "診断セッションを確認できません。" };
  }

  const fieldErrors: Record<string, string> = {};
  const clarity = requiredRating(formData, "feedback_clarity", fieldErrors);
  const accuracy = requiredRating(formData, "feedback_accuracy", fieldErrors);
  const usefulness = requiredRating(formData, "feedback_usefulness", fieldErrors);
  const interest = getString(formData, "feedback_consultation_interest");
  if (!["yes", "neutral", "no"].includes(interest)) {
    fieldErrors.feedback_consultation_interest = "回答を選択してください";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { formError: "フィードバックの入力内容を確認してください。", fieldErrors };
  }

  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) {
    console.error("[diagnosis-v2] feedback_missing_service_client");
    return { ...EMPTY_STATE, formError: "フィードバックを保存できませんでした。" };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("construction_diagnoses")
    .update({
      feedback_clarity: clarity,
      feedback_accuracy: accuracy,
      feedback_usefulness: usefulness,
      feedback_consultation_interest: interest,
      feedback_comment: nullableString(formData, "feedback_comment"),
      feedback_submitted_at: now,
      updated_at: now
    })
    .eq("id", id)
    .in("diagnosis_version", [...SUPPORTED_CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSIONS])
    .is("feedback_submitted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[diagnosis-v2] feedback_submit_failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return { ...EMPTY_STATE, formError: "フィードバックを保存できませんでした。時間をおいて再度お試しください。" };
  }
  if (!data) {
    return { ...EMPTY_STATE, formError: "フィードバックはすでに送信済みです。" };
  }

  revalidatePath(`/diagnosis/results/${id}`);
  revalidatePath(`/admin/diagnoses/${id}`);
  return { fieldErrors: {}, success: true };
}

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableString(formData: FormData, key: string) {
  return getString(formData, key) || null;
}

function requiredString(
  formData: FormData,
  key: string,
  label: string,
  fieldErrors: Record<string, string>
) {
  const value = getString(formData, key);
  if (!value) fieldErrors[key] = `${label}を入力してください`;
  return value;
}

function requiredRating(
  formData: FormData,
  key: string,
  fieldErrors: Record<string, string>
) {
  const value = Number(getString(formData, key));
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    fieldErrors[key] = "1～5点で回答してください";
    return null;
  }
  return value;
}

async function hasDiagnosisV2Session(id: string) {
  if (await hasDiagnosisV22Session(id)) return true;
  const cookieStore = await cookies();
  return cookieStore.get(DIAGNOSIS_V2_SESSION_COOKIE)?.value === id;
}

function safeError(error: { code?: string; message?: string; details?: string; hint?: string }) {
  return { code: error.code, message: error.message, details: error.details, hint: error.hint };
}
