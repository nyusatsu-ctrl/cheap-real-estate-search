import { NextResponse } from "next/server";
import { getCurrentDiagnosisAdmin } from "@/lib/diagnosis-admin";
import {
  CONSULTATION_LABELS,
  DIAGNOSIS_TYPES,
  SUPPLEMENTAL_ANSWER_FIELDS,
  type AdminDiagnosisFilters,
  formatAnswerValue,
  formatDiagnosisDate,
  getAnswerLabel,
  getConstructionDiagnoses,
  getLeadSourceLabel,
  getLeadStatusLabel,
  getSeminarInterestLabel
} from "@/lib/construction-diagnosis";
import {
  DETAILED_DIAGNOSIS_QUESTIONS,
  DIAGNOSIS_V2_SECTIONS,
  QUICK_DIAGNOSIS_QUESTIONS,
  getDiagnosisV2OptionLabel,
  getQuickDiagnosisOptionLabel,
  type DiagnosisV2Judgment
} from "@/lib/construction-diagnosis-v2/questions";
import {
  DIAGNOSIS_V2_DEAL_STATUS_LABELS,
  DIAGNOSIS_V2_SALES_STATUS_LABELS,
  isConstructionManagementDiagnosis,
  normalizeConstructionManagementDiagnosis
} from "@/lib/construction-diagnosis-v2/data";

const JUDGMENTS: DiagnosisV2Judgment[] = [
  "経営基盤の整備を優先",
  "自社対応可能＋必要時スポット支援",
  "一部支援推奨",
  "段階的な専門支援推奨",
  "現時点では保留"
];
const SOURCES = ["テレアポ", "ダイレクトメール", "紹介", "Web広告", "SEO", "YouTube", "その他"];

export async function GET(request: Request) {
  const admin = await getCurrentDiagnosisAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filters = getFilters(new URL(request.url).searchParams);
  const diagnoses = await getConstructionDiagnoses(filters);
  const headers = [
    "診断バージョン",
    "診断日時",
    "会社名",
    "回答者",
    "代表者",
    "都道府県",
    "所在地",
    "電話番号",
    "メールアドレス",
    "ホームページURL",
    "従業員数",
    "創業年",
    "主な工事業種",
    "年商区分",
    "流入経路",
    "URL流入元",
    "キャンペーン",
    "簡易診断完了日時",
    "詳細診断完了日時",
    "総合点",
    ...DIAGNOSIS_V2_SECTIONS.map((section) => `${section.label}スコア`),
    "支援判定",
    "重大フラグ",
    "相談希望",
    "相談希望日時",
    "相談内容",
    "電話連絡可能時間",
    "相談備考",
    "面談予定日",
    "商談状況",
    "成約状況",
    "契約金額",
    "失注理由",
    "次回対応日",
    "管理者メモ",
    ...QUICK_DIAGNOSIS_QUESTIONS.map((question) => `${question.id} ${question.question}`),
    ...DETAILED_DIAGNOSIS_QUESTIONS.map((question) => `${question.id} ${question.question}`),
    "旧診断タイプ",
    "旧サブ課題",
    "旧相談意欲",
    "旧説明会意向",
    "旧対応ステータス",
    "旧・今一番困っていること",
    ...SUPPLEMENTAL_ANSWER_FIELDS.map((field) => `旧補足 ${field.label}`)
  ];

  const rows = diagnoses.map((rawDiagnosis) => {
    if (isConstructionManagementDiagnosis(rawDiagnosis)) {
      const diagnosis = normalizeConstructionManagementDiagnosis(rawDiagnosis);
      return [
        diagnosis.diagnosis_version,
        formatDiagnosisDate(diagnosis.created_at),
        diagnosis.company_name,
        diagnosis.respondent_name,
        diagnosis.representative_name ?? "",
        diagnosis.prefecture,
        diagnosis.address ?? "",
        diagnosis.phone,
        diagnosis.email,
        diagnosis.website_url ?? "",
        diagnosis.employee_range ?? "",
        diagnosis.founding_year ?? "",
        diagnosis.main_business ?? "",
        diagnosis.sales_range ?? "",
        diagnosis.source ?? "",
        getLeadSourceLabel(diagnosis.lead_source),
        diagnosis.source_campaign ?? "",
        formatNullableDate(diagnosis.quick_completed_at),
        formatNullableDate(diagnosis.detailed_completed_at),
        diagnosis.total_score ?? "",
        ...DIAGNOSIS_V2_SECTIONS.map((section) => diagnosis.axis_scores[section.id] ?? ""),
        diagnosis.judgment ?? "",
        diagnosis.critical_flags.join(" / "),
        diagnosis.consultation_requested ? "希望あり" : "希望なし",
        diagnosis.preferred_meeting_dates.map(formatNullableDate).join(" / "),
        diagnosis.consultation_topic ?? "",
        diagnosis.consultation_contact_time ?? "",
        diagnosis.consultation_notes ?? "",
        formatNullableDate(diagnosis.meeting_at),
        DIAGNOSIS_V2_SALES_STATUS_LABELS[diagnosis.sales_status],
        DIAGNOSIS_V2_DEAL_STATUS_LABELS[diagnosis.deal_status],
        diagnosis.deal_amount ?? "",
        diagnosis.loss_reason ?? "",
        formatNullableDate(diagnosis.next_action_at),
        diagnosis.admin_notes ?? "",
        ...QUICK_DIAGNOSIS_QUESTIONS.map((question) => getQuickDiagnosisOptionLabel(question.id, diagnosis.quick_answers[question.id])),
        ...DETAILED_DIAGNOSIS_QUESTIONS.map((question) => getDiagnosisV2OptionLabel(question.id, diagnosis.detailed_answers[question.id])),
        "", "", "", "", "", "",
        ...SUPPLEMENTAL_ANSWER_FIELDS.map(() => "")
      ];
    }

    return [
      "construction_sales_diagnosis_v1",
      formatDiagnosisDate(rawDiagnosis.created_at),
      rawDiagnosis.company_name ?? "",
      rawDiagnosis.name,
      "", "", "",
      rawDiagnosis.phone ?? "",
      rawDiagnosis.email,
      "", "", "",
      getAnswerLabel("business_type", rawDiagnosis.business_type),
      getAnswerLabel("monthly_sales", rawDiagnosis.monthly_sales),
      "",
      getLeadSourceLabel(rawDiagnosis.lead_source),
      rawDiagnosis.source_campaign ?? "",
      "", "", "",
      ...DIAGNOSIS_V2_SECTIONS.map(() => ""),
      "", "",
      CONSULTATION_LABELS[rawDiagnosis.wants_consultation] ?? rawDiagnosis.wants_consultation,
      "", "", rawDiagnosis.preferred_contact_time ?? "", "",
      "", getLeadStatusLabel(rawDiagnosis.lead_status), "", "", "", "",
      rawDiagnosis.admin_memo ?? "",
      ...QUICK_DIAGNOSIS_QUESTIONS.map(() => ""),
      ...DETAILED_DIAGNOSIS_QUESTIONS.map(() => ""),
      DIAGNOSIS_TYPES[rawDiagnosis.main_type].name,
      DIAGNOSIS_TYPES[rawDiagnosis.sub_type].name,
      CONSULTATION_LABELS[rawDiagnosis.wants_consultation] ?? rawDiagnosis.wants_consultation,
      getSeminarInterestLabel(rawDiagnosis.seminar_interest),
      getLeadStatusLabel(rawDiagnosis.lead_status),
      getAnswerLabel("biggest_problem", rawDiagnosis.answers.biggest_problem),
      ...SUPPLEMENTAL_ANSWER_FIELDS.map((field) => formatAnswerValue(rawDiagnosis.answers[field.key]))
    ];
  });

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="construction-management-diagnoses-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}

function getFilters(params: URLSearchParams): AdminDiagnosisFilters {
  const consultation = params.get("consultation_requested") ?? "";
  const dateFrom = normalizeDateStart(params.get("date_from") ?? "");
  const dateTo = normalizeDateEnd(params.get("date_to") ?? "");
  const source = params.get("source") ?? "";
  const judgment = params.get("judgment") ?? "";
  const salesStatus = params.get("sales_status") ?? "";
  const dealStatus = params.get("deal_status") ?? "";
  return {
    dateFrom,
    dateTo,
    prefecture: params.get("prefecture") || undefined,
    source: SOURCES.includes(source) ? source : undefined,
    judgment: JUDGMENTS.includes(judgment as DiagnosisV2Judgment) ? judgment : undefined,
    consultationRequested: consultation === "true" ? true : consultation === "false" ? false : undefined,
    salesStatus: salesStatus in DIAGNOSIS_V2_SALES_STATUS_LABELS ? salesStatus : undefined,
    dealStatus: dealStatus in DIAGNOSIS_V2_DEAL_STATUS_LABELS ? dealStatus : undefined
  };
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
}

function formatNullableDate(value: string | null | undefined) {
  return value ? formatDiagnosisDate(value) : "";
}

function normalizeDateStart(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+09:00` : undefined;
}

function normalizeDateEnd(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999+09:00` : undefined;
}
