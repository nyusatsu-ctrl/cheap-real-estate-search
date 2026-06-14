import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin";
import {
  CONSULTATION_LABELS,
  DIAGNOSIS_TYPES,
  SUPPLEMENTAL_ANSWER_FIELDS,
  type AdminDiagnosisFilters,
  formatDiagnosisDate,
  getAnswerLabel,
  getConstructionDiagnoses,
  getLeadSourceLabel,
  getLeadStatusLabel,
  getPublicWorksRoutePlan,
  getSeminarInterestLabel,
  normalizeLeadSource,
  normalizeLeadStatus,
  normalizeSeminarInterest,
  type DiagnosisTypeCode
} from "@/lib/construction-diagnosis";

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filters = getFilters(new URL(request.url).searchParams);
  const diagnoses = await getConstructionDiagnoses(filters);
  const headers = [
    "氏名",
    "会社名",
    "電話番号",
    "メール",
    "業種",
    "平均年商",
    ...SUPPLEMENTAL_ANSWER_FIELDS.map((field) => field.label),
    "診断タイプ",
    "サブ課題",
    "推奨参入ルート",
    "推奨アクション",
    "platform提案",
    "相談意欲",
    "説明会意向",
    "流入元",
    "キャンペーン",
    "希望連絡時間",
    "対応ステータス",
    "管理者メモ",
    "メモ更新日時",
    "最終接触日時",
    "リード更新日時",
    "診断日時"
  ];
  const rows = diagnoses.map((diagnosis) => {
    const routePlan = getPublicWorksRoutePlan(diagnosis);

    return [
      diagnosis.name,
      diagnosis.company_name ?? "",
      diagnosis.phone ?? "",
      diagnosis.email,
      getAnswerLabel("business_type", diagnosis.business_type),
      getAnswerLabel("monthly_sales", diagnosis.monthly_sales),
      ...SUPPLEMENTAL_ANSWER_FIELDS.map((field) => diagnosis.answers[field.key] ?? ""),
      DIAGNOSIS_TYPES[diagnosis.main_type].name,
      DIAGNOSIS_TYPES[diagnosis.sub_type].name,
      routePlan.routeTitle,
      routePlan.firstActions.join(" / "),
      routePlan.platformSuggestions.join(" / "),
      CONSULTATION_LABELS[diagnosis.wants_consultation] ?? diagnosis.wants_consultation,
      getSeminarInterestLabel(diagnosis.seminar_interest),
      getLeadSourceLabel(diagnosis.lead_source),
      diagnosis.source_campaign ?? "",
      diagnosis.preferred_contact_time ?? "",
      getLeadStatusLabel(diagnosis.lead_status),
      diagnosis.admin_memo ?? "",
      formatNullableDiagnosisDate(diagnosis.admin_memo_updated_at),
      formatNullableDiagnosisDate(diagnosis.last_contacted_at),
      formatNullableDiagnosisDate(diagnosis.lead_updated_at),
      formatDiagnosisDate(diagnosis.created_at)
    ];
  });

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="construction-diagnoses-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}

function csvCell(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

function formatNullableDiagnosisDate(value: string | null | undefined) {
  return value ? formatDiagnosisDate(value) : "";
}

function getFilters(params: URLSearchParams): AdminDiagnosisFilters {
  return {
    mainType: normalizeDiagnosisType(params.get("main_type") ?? ""),
    wantsConsultation: normalizeConsultation(params.get("wants_consultation") ?? ""),
    seminarInterest: normalizeOptionalSeminarInterest(params.get("seminar_interest") ?? ""),
    leadSource: normalizeOptionalLeadSource(params.get("lead_source") ?? ""),
    leadStatus: normalizeOptionalLeadStatus(params.get("lead_status") ?? "")
  };
}

function normalizeDiagnosisType(value: string): DiagnosisTypeCode | undefined {
  return value in DIAGNOSIS_TYPES ? (value as DiagnosisTypeCode) : undefined;
}

function normalizeConsultation(value: string) {
  return value && value in CONSULTATION_LABELS ? value : undefined;
}

function normalizeOptionalLeadSource(value: string) {
  if (!value) return undefined;
  const normalized = normalizeLeadSource(value);
  return normalized === "other" && value !== "other" ? undefined : normalized;
}

function normalizeOptionalSeminarInterest(value: string) {
  if (!value) return undefined;
  const normalized = normalizeSeminarInterest(value);
  return normalized === "undecided" && value !== "undecided" ? undefined : normalized;
}

function normalizeOptionalLeadStatus(value: string) {
  if (!value) return undefined;
  const normalized = normalizeLeadStatus(value);
  return normalized === "new" && value !== "new" ? undefined : normalized;
}
