import "server-only";
import { createDiagnosisSupabaseServiceRoleClient } from "@/lib/supabase/diagnosis-server";
import {
  CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION,
  LEGACY_CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION,
  PREVIOUS_CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION,
  type DiagnosisV2AnswerMap,
  type DiagnosisV2Judgment,
  type DiagnosisV2SectionId
} from "@/lib/construction-diagnosis-v2/questions";
import type { DiagnosisV2ResultSnapshot } from "@/lib/construction-diagnosis-v2/results";
import type {
  OrderModel,
  PrimaryTrade,
  PublicWorkIntent,
  SpecialtyDiagnosisSummary
} from "@/lib/construction-diagnosis-v2/specialty-questions";

export type DiagnosisV2SalesStatus =
  | "uncontacted"
  | "waiting"
  | "meeting_scheduled"
  | "met"
  | "proposal"
  | "won"
  | "lost"
  | "on_hold";

export type DiagnosisV2DealStatus = "open" | "won" | "lost" | "on_hold";

export type ConstructionManagementDiagnosis = {
  id: string;
  diagnosis_version: string;
  company_name: string;
  representative_name: string | null;
  respondent_name: string;
  name: string;
  prefecture: string;
  address: string | null;
  phone: string;
  email: string;
  website_url: string | null;
  employee_range: string | null;
  founding_year: number | null;
  sales_range: string | null;
  main_business: string | null;
  primary_trade: PrimaryTrade | null;
  secondary_trades: PrimaryTrade[];
  order_models: OrderModel[];
  prime_ratio: number | null;
  subcontract_ratio: number | null;
  public_ratio: number | null;
  consumer_ratio: number | null;
  self_perform_ratio: string | null;
  average_project_size: string | null;
  public_work_intent: PublicWorkIntent | null;
  source: string | null;
  lead_source: string;
  source_campaign: string | null;
  quick_answers: DiagnosisV2AnswerMap;
  quick_scores: Record<string, number>;
  detailed_answers: DiagnosisV2AnswerMap;
  specialty_answers: DiagnosisV2AnswerMap;
  specialty_score: number | null;
  specialty_summary: SpecialtyDiagnosisSummary | null;
  axis_scores: Partial<Record<DiagnosisV2SectionId, number>>;
  total_score: number | null;
  critical_flags: string[];
  judgment: DiagnosisV2Judgment | null;
  diagnosis_result: DiagnosisV2ResultSnapshot | null;
  consultation_requested: boolean;
  preferred_meeting_dates: string[];
  consultation_topic: string | null;
  consultation_contact_time: string | null;
  consultation_notes: string | null;
  meeting_at: string | null;
  sales_status: DiagnosisV2SalesStatus;
  deal_status: DiagnosisV2DealStatus;
  deal_amount: number | null;
  loss_reason: string | null;
  next_action_at: string | null;
  admin_notes: string | null;
  feedback_clarity: number | null;
  feedback_accuracy: number | null;
  feedback_usefulness: number | null;
  feedback_consultation_interest: string | null;
  feedback_comment: string | null;
  feedback_submitted_at: string | null;
  consented_at: string;
  quick_completed_at: string | null;
  detailed_completed_at: string | null;
  created_at: string;
  updated_at: string;
  anonymous_session_id: string | null;
  short_started_at: string | null;
  short_last_step: number | null;
  detailed_started_at: string | null;
  detailed_last_step: number | null;
  abandoned_stage: string | null;
  abandoned_question_id: string | null;
  device_type: string | null;
  browser_family: string | null;
};

export const DIAGNOSIS_V2_SALES_STATUS_LABELS: Record<DiagnosisV2SalesStatus, string> = {
  uncontacted: "未対応",
  waiting: "連絡待ち",
  meeting_scheduled: "面談予定",
  met: "面談済み",
  proposal: "提案中",
  won: "成約",
  lost: "失注",
  on_hold: "保留"
};

export const DIAGNOSIS_V2_DEAL_STATUS_LABELS: Record<DiagnosisV2DealStatus, string> = {
  open: "未確定",
  won: "成約",
  lost: "失注",
  on_hold: "保留"
};

export function isConstructionManagementDiagnosis(value: unknown): value is ConstructionManagementDiagnosis {
  if (!value || typeof value !== "object") return false;
  const version = (value as { diagnosis_version?: unknown }).diagnosis_version;
  return version === CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION
    || version === PREVIOUS_CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION
    || version === LEGACY_CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION;
}

export async function getConstructionManagementDiagnosis(id: string) {
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("construction_diagnoses")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !isConstructionManagementDiagnosis(data)) return null;
  return normalizeConstructionManagementDiagnosis(data);
}

export function normalizeConstructionManagementDiagnosis(
  diagnosis: ConstructionManagementDiagnosis
): ConstructionManagementDiagnosis {
  return {
    ...diagnosis,
    primary_trade: diagnosis.primary_trade ?? null,
    prime_ratio: diagnosis.prime_ratio ?? null,
    subcontract_ratio: diagnosis.subcontract_ratio ?? null,
    public_ratio: diagnosis.public_ratio ?? null,
    consumer_ratio: diagnosis.consumer_ratio ?? null,
    self_perform_ratio: diagnosis.self_perform_ratio ?? null,
    average_project_size: diagnosis.average_project_size ?? null,
    public_work_intent: diagnosis.public_work_intent ?? null,
    quick_answers: diagnosis.quick_answers ?? {},
    quick_scores: diagnosis.quick_scores ?? {},
    detailed_answers: diagnosis.detailed_answers ?? {},
    specialty_answers: diagnosis.specialty_answers ?? {},
    specialty_score: diagnosis.specialty_score ?? null,
    specialty_summary: diagnosis.specialty_summary ?? diagnosis.diagnosis_result?.specialty ?? null,
    axis_scores: diagnosis.axis_scores ?? {},
    critical_flags: Array.isArray(diagnosis.critical_flags) ? diagnosis.critical_flags : [],
    preferred_meeting_dates: Array.isArray(diagnosis.preferred_meeting_dates) ? diagnosis.preferred_meeting_dates : [],
    secondary_trades: Array.isArray(diagnosis.secondary_trades) ? diagnosis.secondary_trades : [],
    order_models: Array.isArray(diagnosis.order_models) ? diagnosis.order_models : [],
    feedback_clarity: diagnosis.feedback_clarity ?? null,
    feedback_accuracy: diagnosis.feedback_accuracy ?? null,
    feedback_usefulness: diagnosis.feedback_usefulness ?? null,
    feedback_consultation_interest: diagnosis.feedback_consultation_interest ?? null,
    feedback_comment: diagnosis.feedback_comment ?? null,
    feedback_submitted_at: diagnosis.feedback_submitted_at ?? null,
    sales_status: diagnosis.sales_status ?? "uncontacted",
    deal_status: diagnosis.deal_status ?? "open",
    consultation_requested: Boolean(diagnosis.consultation_requested),
    anonymous_session_id: diagnosis.anonymous_session_id ?? null,
    short_started_at: diagnosis.short_started_at ?? null,
    short_last_step: diagnosis.short_last_step ?? null,
    detailed_started_at: diagnosis.detailed_started_at ?? null,
    detailed_last_step: diagnosis.detailed_last_step ?? null,
    abandoned_stage: diagnosis.abandoned_stage ?? null,
    abandoned_question_id: diagnosis.abandoned_question_id ?? null,
    device_type: diagnosis.device_type ?? null,
    browser_family: diagnosis.browser_family ?? null
  };
}

export function normalizeDiagnosisV2SalesStatus(value: string): DiagnosisV2SalesStatus {
  return value in DIAGNOSIS_V2_SALES_STATUS_LABELS ? value as DiagnosisV2SalesStatus : "uncontacted";
}

export function normalizeDiagnosisV2DealStatus(value: string): DiagnosisV2DealStatus {
  return value in DIAGNOSIS_V2_DEAL_STATUS_LABELS ? value as DiagnosisV2DealStatus : "open";
}
