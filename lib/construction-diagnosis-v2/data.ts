import "server-only";
import { createDiagnosisSupabaseServiceRoleClient } from "@/lib/supabase/diagnosis-server";
import {
  CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION,
  type DiagnosisV2AnswerMap,
  type DiagnosisV2Judgment,
  type DiagnosisV2SectionId
} from "@/lib/construction-diagnosis-v2/questions";
import type { DiagnosisV2ResultSnapshot } from "@/lib/construction-diagnosis-v2/results";

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
  source: string | null;
  lead_source: string;
  source_campaign: string | null;
  quick_answers: DiagnosisV2AnswerMap;
  quick_scores: Record<string, number>;
  detailed_answers: DiagnosisV2AnswerMap;
  axis_scores: Record<DiagnosisV2SectionId, number>;
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
  consented_at: string;
  quick_completed_at: string | null;
  detailed_completed_at: string | null;
  created_at: string;
  updated_at: string;
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
  return (value as { diagnosis_version?: unknown }).diagnosis_version === CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION;
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
    quick_answers: diagnosis.quick_answers ?? {},
    quick_scores: diagnosis.quick_scores ?? {},
    detailed_answers: diagnosis.detailed_answers ?? {},
    axis_scores: diagnosis.axis_scores ?? {},
    critical_flags: Array.isArray(diagnosis.critical_flags) ? diagnosis.critical_flags : [],
    preferred_meeting_dates: Array.isArray(diagnosis.preferred_meeting_dates) ? diagnosis.preferred_meeting_dates : [],
    sales_status: diagnosis.sales_status ?? "uncontacted",
    deal_status: diagnosis.deal_status ?? "open",
    consultation_requested: Boolean(diagnosis.consultation_requested)
  };
}

export function normalizeDiagnosisV2SalesStatus(value: string): DiagnosisV2SalesStatus {
  return value in DIAGNOSIS_V2_SALES_STATUS_LABELS ? value as DiagnosisV2SalesStatus : "uncontacted";
}

export function normalizeDiagnosisV2DealStatus(value: string): DiagnosisV2DealStatus {
  return value in DIAGNOSIS_V2_DEAL_STATUS_LABELS ? value as DiagnosisV2DealStatus : "open";
}
