import { NextResponse } from "next/server";
import { getCurrentDiagnosisAdmin } from "@/lib/diagnosis-admin";
import {
  CONSULTATION_LABELS,
  DIAGNOSIS_TYPES,
  LEAD_SOURCE_LABELS,
  SUPPLEMENTAL_ANSWER_FIELDS,
  type AdminDiagnosisFilters,
  type LeadSource,
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
  ALL_SHORT_DIAGNOSIS_QUESTIONS,
  getShortDiagnosisOptionLabel
} from "@/lib/construction-diagnosis-v2/short-questions";
import {
  ALL_SPECIALTY_QUESTIONS,
  PRIMARY_TRADE_OPTIONS,
  PUBLIC_WORK_INTENT_OPTIONS,
  getOrderModelLabel,
  getPrimaryTradeLabel,
  getPublicWorkIntentLabel,
  getSpecialtyQuestionLabel
} from "@/lib/construction-diagnosis-v2/specialty-questions";
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
    "主な業態",
    "副業種",
    "主な受注形態",
    "お客様から直接受ける工事の比率",
    "他の建設会社から受ける工事の比率",
    "公共工事比率",
    "個人客比率",
    "自社施工比率",
    "主な工事金額",
    "公共工事への意向",
    "年商区分",
    "流入経路",
    "URL流入元",
    "キャンペーン",
    "簡易診断完了日時",
    "詳細診断完了日時",
    "総合点",
    ...DIAGNOSIS_V2_SECTIONS.map((section) => `${section.label}スコア`),
    "業態別スコア",
    "業態別の強み",
    "業態別の優先課題",
    "工事業種ごとに毎月確認する数字",
    "業態別90日改善策",
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
    "フィードバック・質問の分かりやすさ",
    "フィードバック・診断結果の正確性",
    "フィードバック・参考度",
    "フィードバック・相談意向",
    "フィードバック・自由入力",
    "フィードバック回答日時",
    ...QUICK_DIAGNOSIS_QUESTIONS.map((question) => `旧簡易 ${question.id} ${question.question}`),
    ...ALL_SHORT_DIAGNOSIS_QUESTIONS.map((question) => `短縮 ${question.id} ${question.question}`),
    ...DETAILED_DIAGNOSIS_QUESTIONS.map((question) => `${question.id} ${question.question}`),
    ...ALL_SPECIALTY_QUESTIONS.map((question) => `${question.id} ${question.question}`),
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
        diagnosis.primary_trade ? getPrimaryTradeLabel(diagnosis.primary_trade) : "",
        diagnosis.secondary_trades.map(getPrimaryTradeLabel).join(" / "),
        diagnosis.order_models.map(getOrderModelLabel).join(" / "),
        diagnosis.prime_ratio ?? "",
        diagnosis.subcontract_ratio ?? "",
        diagnosis.public_ratio ?? "",
        diagnosis.consumer_ratio ?? "",
        diagnosis.self_perform_ratio ?? "",
        diagnosis.average_project_size ?? "",
        diagnosis.public_work_intent ? getPublicWorkIntentLabel(diagnosis.public_work_intent) : "",
        diagnosis.sales_range ?? "",
        diagnosis.source ?? "",
        getLeadSourceLabel(diagnosis.lead_source),
        diagnosis.source_campaign ?? "",
        formatNullableDate(diagnosis.quick_completed_at),
        formatNullableDate(diagnosis.detailed_completed_at),
        diagnosis.total_score ?? "",
        ...DIAGNOSIS_V2_SECTIONS.map((section) => diagnosis.axis_scores[section.id] ?? ""),
        diagnosis.specialty_score ?? "",
        diagnosis.specialty_summary?.strengths.join(" / ") ?? "",
        diagnosis.specialty_summary?.priorities.join(" / ") ?? "",
        diagnosis.specialty_summary?.kpis.join(" / ") ?? "",
        diagnosis.specialty_summary?.plan90Days.join(" / ") ?? "",
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
        diagnosis.feedback_clarity ?? "",
        diagnosis.feedback_accuracy ?? "",
        diagnosis.feedback_usefulness ?? "",
        formatFeedbackInterest(diagnosis.feedback_consultation_interest),
        diagnosis.feedback_comment ?? "",
        formatNullableDate(diagnosis.feedback_submitted_at),
        ...QUICK_DIAGNOSIS_QUESTIONS.map((question) => diagnosis.quick_answers[question.id] === undefined ? "" : getQuickDiagnosisOptionLabel(question.id, diagnosis.quick_answers[question.id])),
        ...ALL_SHORT_DIAGNOSIS_QUESTIONS.map((question) => diagnosis.quick_answers[question.id] === undefined ? "" : getShortDiagnosisOptionLabel(question.id, diagnosis.quick_answers[question.id])),
        ...DETAILED_DIAGNOSIS_QUESTIONS.map((question) => getDiagnosisV2OptionLabel(question.id, diagnosis.detailed_answers[question.id])),
        ...ALL_SPECIALTY_QUESTIONS.map((question) => diagnosis.specialty_answers[question.id] === undefined ? "" : getSpecialtyQuestionLabel(question.id, diagnosis.specialty_answers[question.id])),
        "", "", "", "", "", "",
        ...SUPPLEMENTAL_ANSWER_FIELDS.map(() => "")
      ];
    }

    return [
      "construction_sales_diagnosis_v1",
      formatDiagnosisDate(rawDiagnosis.created_at),
      rawDiagnosis.company_name ?? "",
      rawDiagnosis.name,
      "",
      "",
      "",
      rawDiagnosis.phone ?? "",
      rawDiagnosis.email,
      "",
      "",
      "",
      getAnswerLabel("business_type", rawDiagnosis.business_type),
      ...Array(10).fill(""),
      getAnswerLabel("monthly_sales", rawDiagnosis.monthly_sales),
      "",
      getLeadSourceLabel(rawDiagnosis.lead_source),
      rawDiagnosis.source_campaign ?? "",
      "", "", "",
      ...DIAGNOSIS_V2_SECTIONS.map(() => ""),
      ...Array(5).fill(""),
      "",
      "",
      CONSULTATION_LABELS[rawDiagnosis.wants_consultation] ?? rawDiagnosis.wants_consultation,
      "",
      "",
      rawDiagnosis.preferred_contact_time ?? "",
      "",
      "",
      getLeadStatusLabel(rawDiagnosis.lead_status),
      "",
      "",
      "",
      "",
      rawDiagnosis.admin_memo ?? "",
      ...Array(6).fill(""),
      ...QUICK_DIAGNOSIS_QUESTIONS.map(() => ""),
      ...ALL_SHORT_DIAGNOSIS_QUESTIONS.map(() => ""),
      ...DETAILED_DIAGNOSIS_QUESTIONS.map(() => ""),
      ...ALL_SPECIALTY_QUESTIONS.map(() => ""),
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
  const feedbackSubmitted = params.get("feedback_submitted") ?? "";
  const feedbackAccuracy = Number(params.get("feedback_accuracy") ?? "");
  const dateFrom = normalizeDateStart(params.get("date_from") ?? "");
  const dateTo = normalizeDateEnd(params.get("date_to") ?? "");
  const source = params.get("source") ?? "";
  const judgment = params.get("judgment") ?? "";
  const salesStatus = params.get("sales_status") ?? "";
  const dealStatus = params.get("deal_status") ?? "";
  const leadSource = params.get("lead_source") ?? "";
  return {
    dateFrom,
    dateTo,
    prefecture: params.get("prefecture") || undefined,
    leadSource: leadSource in LEAD_SOURCE_LABELS ? leadSource as LeadSource : undefined,
    source: SOURCES.includes(source) ? source : undefined,
    judgment: JUDGMENTS.includes(judgment as DiagnosisV2Judgment) ? judgment : undefined,
    consultationRequested: consultation === "true" ? true : consultation === "false" ? false : undefined,
    salesStatus: salesStatus in DIAGNOSIS_V2_SALES_STATUS_LABELS ? salesStatus : undefined,
    dealStatus: dealStatus in DIAGNOSIS_V2_DEAL_STATUS_LABELS ? dealStatus : undefined,
    primaryTrade: PRIMARY_TRADE_OPTIONS.some((option) => option.value === params.get("primary_trade")) ? params.get("primary_trade") ?? undefined : undefined,
    publicWorkIntent: PUBLIC_WORK_INTENT_OPTIONS.some((option) => option.value === params.get("public_work_intent")) ? params.get("public_work_intent") ?? undefined : undefined,
    feedbackSubmitted: feedbackSubmitted === "true" ? true : feedbackSubmitted === "false" ? false : undefined,
    feedbackAccuracy: Number.isInteger(feedbackAccuracy) && feedbackAccuracy >= 1 && feedbackAccuracy <= 5 ? feedbackAccuracy : undefined
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

function formatFeedbackInterest(value: string | null) {
  if (value === "yes") return "はい";
  if (value === "neutral") return "どちらともいえない";
  if (value === "no") return "いいえ";
  return "";
}
