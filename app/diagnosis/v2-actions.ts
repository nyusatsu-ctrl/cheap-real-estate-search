"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeLeadSource } from "@/lib/construction-diagnosis";
import {
  CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION,
  LEGACY_CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION,
  QUICK_DIAGNOSIS_QUESTIONS,
  getApplicableDetailedQuestions,
  scoreDetailedDiagnosis,
  scoreQuickDiagnosis,
  type DiagnosisV2AnswerMap,
  type DiagnosisV2ScoringContext
} from "@/lib/construction-diagnosis-v2/questions";
import { buildDiagnosisV2Result } from "@/lib/construction-diagnosis-v2/results";
import {
  ALL_SPECIALTY_QUESTIONS,
  ORDER_MODEL_OPTIONS,
  PRIMARY_TRADE_OPTIONS,
  PROJECT_SIZE_OPTIONS,
  PUBLIC_WORK_INTENT_OPTIONS,
  SELF_PERFORM_OPTIONS,
  buildSpecialtyDiagnosisSummary,
  getPrimaryTradeLabel,
  type OrderModel,
  type PrimaryTrade,
  type PublicWorkIntent
} from "@/lib/construction-diagnosis-v2/specialty-questions";
import { createDiagnosisSupabaseServiceRoleClient } from "@/lib/supabase/diagnosis-server";

const DIAGNOSIS_V2_SESSION_COOKIE = "construction_management_diagnosis_v2_session";

export type DiagnosisV2FormState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

const EMPTY_STATE: DiagnosisV2FormState = { fieldErrors: {} };

export async function submitDiagnosisV2QuickAction(
  _previousState: DiagnosisV2FormState,
  formData: FormData
): Promise<DiagnosisV2FormState> {
  const fieldErrors: Record<string, string> = {};
  const respondentName = requiredString(formData, "respondent_name", "回答者名", fieldErrors);
  const companyName = requiredString(formData, "company_name", "会社名", fieldErrors);
  const prefecture = requiredString(formData, "prefecture", "都道府県", fieldErrors);
  const phone = requiredString(formData, "phone", "電話番号", fieldErrors);
  const email = requiredString(formData, "email", "メールアドレス", fieldErrors);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "メールアドレスの形式を確認してください";
  }
  if (getString(formData, "privacy_consent") !== "agreed") {
    fieldErrors.privacy_consent = "個人情報の取扱いへの同意が必要です";
  }

  const primaryTradeValue = getString(formData, "primary_trade");
  const primaryTrade = PRIMARY_TRADE_OPTIONS.some((option) => option.value === primaryTradeValue)
    ? primaryTradeValue as PrimaryTrade
    : null;
  if (!primaryTrade) fieldErrors.primary_trade = "主な業態・工事業種を選択してください";

  const secondaryTrades = normalizeFormArray(formData, "secondary_trades")
    .filter((value): value is PrimaryTrade => PRIMARY_TRADE_OPTIONS.some((option) => option.value === value))
    .filter((value) => value !== primaryTrade);
  const orderModels = normalizeFormArray(formData, "order_models")
    .filter((value): value is OrderModel => ORDER_MODEL_OPTIONS.some((option) => option.value === value));
  if (orderModels.length === 0) fieldErrors.order_models = "主な受注形態を1つ以上選択してください";

  const publicWorkIntentValue = getString(formData, "public_work_intent");
  const publicWorkIntent = PUBLIC_WORK_INTENT_OPTIONS.some((option) => option.value === publicWorkIntentValue)
    ? publicWorkIntentValue as PublicWorkIntent
    : null;
  if (!publicWorkIntent) fieldErrors.public_work_intent = "公共工事への意向を選択してください";

  const selfPerformRatio = nullableString(formData, "self_perform_ratio");
  if (selfPerformRatio && !SELF_PERFORM_OPTIONS.includes(selfPerformRatio)) {
    fieldErrors.self_perform_ratio = "自社施工比率を選択肢から選んでください";
  }
  const averageProjectSize = nullableString(formData, "average_project_size");
  if (averageProjectSize && !PROJECT_SIZE_OPTIONS.includes(averageProjectSize)) {
    fieldErrors.average_project_size = "主な工事金額を選択肢から選んでください";
  }

  const primeRatio = nullablePercentage(formData, "prime_ratio", fieldErrors);
  const subcontractRatio = nullablePercentage(formData, "subcontract_ratio", fieldErrors);
  const publicRatio = nullablePercentage(formData, "public_ratio", fieldErrors);
  const consumerRatio = nullablePercentage(formData, "consumer_ratio", fieldErrors);

  const quickAnswers: DiagnosisV2AnswerMap = {};
  for (const question of QUICK_DIAGNOSIS_QUESTIONS) {
    const answer = getString(formData, question.id);
    if (!question.options.some((option) => option.value === answer)) {
      fieldErrors[question.id] = "回答を選択してください";
    } else {
      quickAnswers[question.id] = answer;
    }
  }

  const quickResult = scoreQuickDiagnosis(quickAnswers);
  if (!quickResult.complete) {
    for (const id of quickResult.unanswered) fieldErrors[id] = "回答を選択してください";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      formError: "未入力または確認が必要な項目があります。",
      fieldErrors
    };
  }

  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) {
    console.error("[diagnosis-v2] quick_submit_missing_service_client");
    return { ...EMPTY_STATE, formError: "診断を保存できませんでした。時間をおいて再度お試しください。" };
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  const salesRange = nullableString(formData, "sales_range");
  const mainBusiness = primaryTrade ? getPrimaryTradeLabel(primaryTrade) : null;
  const leadSource = normalizeLeadSource(getString(formData, "lead_source"));
  const source = nullableString(formData, "source");
  const foundingYearValue = getString(formData, "founding_year");
  const foundingYear = /^\d{4}$/.test(foundingYearValue) ? Number(foundingYearValue) : null;

  const payload = {
    id,
    diagnosis_version: CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION,
    name: respondentName,
    respondent_name: respondentName,
    company_name: companyName,
    representative_name: nullableString(formData, "representative_name"),
    prefecture,
    address: nullableString(formData, "address"),
    phone,
    email,
    website_url: nullableString(formData, "website_url"),
    employee_range: nullableString(formData, "employee_range"),
    founding_year: foundingYear,
    sales_range: salesRange,
    main_business: mainBusiness,
    primary_trade: primaryTrade,
    secondary_trades: secondaryTrades,
    order_models: orderModels,
    prime_ratio: primeRatio,
    subcontract_ratio: subcontractRatio,
    public_ratio: publicRatio,
    consumer_ratio: consumerRatio,
    self_perform_ratio: selfPerformRatio,
    average_project_size: averageProjectSize,
    public_work_intent: publicWorkIntent,
    source,
    lead_source: leadSource,
    source_campaign: nullableString(formData, "source_campaign"),
    quick_answers: quickAnswers,
    quick_scores: quickResult.categoryScores,
    quick_completed_at: now,
    consented_at: now,
    detailed_answers: {},
    specialty_answers: {},
    specialty_score: null,
    specialty_summary: null,
    axis_scores: {},
    critical_flags: [],
    consultation_requested: false,
    preferred_meeting_dates: [],
    sales_status: "uncontacted",
    deal_status: "open",
    updated_at: now,
    answers: quickAnswers,
    scores: quickResult.categoryScores,
    main_type: "G",
    sub_type: "C",
    business_type: mainBusiness ?? "not_answered",
    monthly_sales: salesRange ?? "not_answered",
    wants_consultation: "no",
    seminar_interest: "undecided",
    preferred_contact_time: null,
    lead_status: "new",
    lead_updated_at: now,
    feedback_clarity: null,
    feedback_accuracy: null,
    feedback_usefulness: null,
    feedback_consultation_interest: null,
    feedback_comment: null,
    feedback_submitted_at: null
  };

  const { error } = await supabase.from("construction_diagnoses").insert(payload);
  if (error) {
    console.error("[diagnosis-v2] quick_submit_failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return { ...EMPTY_STATE, formError: "診断を保存できませんでした。時間をおいて再度お試しください。" };
  }

  await setDiagnosisV2Session(id);
  redirect(`/diagnosis/quick-results/${id}`);
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
  if (diagnosisError || !diagnosis || ![
    CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION,
    LEGACY_CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION
  ].includes(String(diagnosis.diagnosis_version))) {
    console.error("[diagnosis-v2] detailed_submit_diagnosis_lookup_failed", {
      code: diagnosisError?.code,
      message: diagnosisError?.message,
      diagnosisFound: Boolean(diagnosis)
    });
    return { ...EMPTY_STATE, formError: "診断データを確認できませんでした。簡易診断から再度お進みください。" };
  }

  const isV21 = diagnosis.diagnosis_version === CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION;
  const context: DiagnosisV2ScoringContext = isV21
    ? {
        primaryTrade: diagnosis.primary_trade as PrimaryTrade | null,
        publicWorkIntent: diagnosis.public_work_intent as PublicWorkIntent | null,
        includeSpecialty: true
      }
    : { includeSpecialty: false };
  const applicableQuestions = getApplicableDetailedQuestions(context);

  const detailedAnswers: DiagnosisV2AnswerMap = {};
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
      formError: "未回答の項目があります。各分野の回答を確認してください。",
      fieldErrors
    };
  }

  const diagnosisResult = buildDiagnosisV2Result(detailedAnswers, scoring, context);
  const specialtyQuestionIds = new Set(ALL_SPECIALTY_QUESTIONS.map((question) => question.id));
  const specialtyAnswers = Object.fromEntries(
    Object.entries(detailedAnswers).filter(([questionId]) => specialtyQuestionIds.has(questionId))
  );
  const specialtySummary = isV21
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
    .in("diagnosis_version", [
      CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION,
      LEGACY_CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION
    ]);

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
    .eq("diagnosis_version", CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION)
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

function nullablePercentage(
  formData: FormData,
  key: string,
  fieldErrors: Record<string, string>
) {
  const value = getString(formData, key);
  if (!value) return null;
  if (!/^\d{1,3}$/.test(value) || Number(value) < 0 || Number(value) > 100) {
    fieldErrors[key] = "0～100の範囲で入力してください";
    return null;
  }
  return Number(value);
}

function normalizeFormArray(formData: FormData, key: string) {
  return [...new Set(formData.getAll(key).map((value) => String(value).trim()).filter(Boolean))];
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

async function setDiagnosisV2Session(id: string) {
  const cookieStore = await cookies();
  cookieStore.set(DIAGNOSIS_V2_SESSION_COOKIE, id, {
    httpOnly: true,
    maxAge: 60 * 60 * 24,
    path: "/diagnosis",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

async function hasDiagnosisV2Session(id: string) {
  const cookieStore = await cookies();
  return cookieStore.get(DIAGNOSIS_V2_SESSION_COOKIE)?.value === id;
}
