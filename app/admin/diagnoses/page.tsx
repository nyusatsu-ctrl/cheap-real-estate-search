import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/admin/actions";
import { getCurrentDiagnosisAdmin } from "@/lib/diagnosis-admin";
import {
  CONSULTATION_LABELS,
  DIAGNOSIS_TYPES,
  LEAD_SOURCE_LABELS,
  type AdminDiagnosisFilters,
  type LeadSource,
  formatDiagnosisDate,
  getConstructionDiagnoses,
  getLeadSourceLabel,
  getLeadStatusLabel
} from "@/lib/construction-diagnosis";
import type { DiagnosisV2Judgment } from "@/lib/construction-diagnosis-v2/questions";
import {
  DIAGNOSIS_V2_DEAL_STATUS_LABELS,
  DIAGNOSIS_V2_SALES_STATUS_LABELS,
  isConstructionManagementDiagnosis,
  normalizeConstructionManagementDiagnosis
} from "@/lib/construction-diagnosis-v2/data";
import {
  PRIMARY_TRADE_OPTIONS,
  PUBLIC_WORK_INTENT_OPTIONS,
  getPrimaryTradeLabel,
  getPublicWorkIntentLabel
} from "@/lib/construction-diagnosis-v2/specialty-questions";
import { Download, Filter, LogOut } from "lucide-react";

type AdminDiagnosesSearchParams = Promise<Record<string, string | string[] | undefined>>;

const JUDGMENTS: DiagnosisV2Judgment[] = [
  "経営基盤の整備を優先",
  "自社対応可能＋必要時スポット支援",
  "一部支援推奨",
  "段階的な専門支援推奨",
  "現時点では保留"
];

const SOURCES = ["テレアポ", "ダイレクトメール", "紹介", "Web広告", "SEO", "YouTube", "その他"];
const LEAD_SOURCES = Object.entries(LEAD_SOURCE_LABELS) as [LeadSource, string][];

export default async function AdminDiagnosesPage({ searchParams }: { searchParams: AdminDiagnosesSearchParams }) {
  const admin = await getCurrentDiagnosisAdmin();
  if (!admin) return <LoginRequired />;

  const params = await searchParams;
  const filters = getFilters(params);
  const diagnoses = await getConstructionDiagnoses(filters);
  const exportHref = `/admin/diagnoses/export${getFilterQuery(filters)}`;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6">
      <AdminHeader email={admin.email} />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-950">診断者一覧</h1>
          <p className="mt-1 text-sm text-slate-600">旧診断データを維持しながら、v2の診断進捗、支援判定、相談、商談、成約状況を管理します。</p>
        </div>
        <Link href={exportHref} className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
          <Download className="h-4 w-4" />
          CSV出力
        </Link>
      </div>

      <form className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <TextFilter name="date_from" label="診断日（開始）" type="date" defaultValue={firstParam(params.date_from)} />
          <TextFilter name="date_to" label="診断日（終了）" type="date" defaultValue={firstParam(params.date_to)} />
          <TextFilter name="prefecture" label="都道府県" defaultValue={filters.prefecture ?? ""} placeholder="例: 熊本県" />
          <SelectFilter name="lead_source" label="URL流入元" defaultValue={filters.leadSource ?? ""}>
            {LEAD_SOURCES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </SelectFilter>
          <SelectFilter name="source" label="申告経路" defaultValue={filters.source ?? ""}>
            {SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}
          </SelectFilter>
          <SelectFilter name="judgment" label="支援判定" defaultValue={filters.judgment ?? ""}>
            {JUDGMENTS.map((judgment) => <option key={judgment} value={judgment}>{judgment}</option>)}
          </SelectFilter>
          <SelectFilter name="consultation_requested" label="相談希望" defaultValue={typeof filters.consultationRequested === "boolean" ? String(filters.consultationRequested) : ""}>
            <option value="true">希望あり</option>
            <option value="false">希望なし</option>
          </SelectFilter>
          <SelectFilter name="sales_status" label="商談状況" defaultValue={filters.salesStatus ?? ""}>
            {Object.entries(DIAGNOSIS_V2_SALES_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </SelectFilter>
          <SelectFilter name="deal_status" label="成約状況" defaultValue={filters.dealStatus ?? ""}>
            {Object.entries(DIAGNOSIS_V2_DEAL_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </SelectFilter>
          <SelectFilter name="primary_trade" label="主な業態" defaultValue={filters.primaryTrade ?? ""}>
            {PRIMARY_TRADE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectFilter>
          <SelectFilter name="public_work_intent" label="公共工事への意向" defaultValue={filters.publicWorkIntent ?? ""}>
            {PUBLIC_WORK_INTENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectFilter>
          <SelectFilter name="feedback_submitted" label="フィードバック" defaultValue={typeof filters.feedbackSubmitted === "boolean" ? String(filters.feedbackSubmitted) : ""}>
            <option value="true">回答済み</option>
            <option value="false">未回答</option>
          </SelectFilter>
          <SelectFilter name="feedback_accuracy" label="結果の正確性" defaultValue={filters.feedbackAccuracy ? String(filters.feedbackAccuracy) : ""}>
            {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}点</option>)}
          </SelectFilter>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="inline-flex items-center justify-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white focus-ring">
            <Filter className="h-4 w-4" />
            絞り込み
          </button>
          <Link href="/admin/diagnoses" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">クリア</Link>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[2250px] divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
              <tr>
                {["診断日時", "会社名", "回答者", "都道府県", "電話番号", "メール", "URL流入元", "主な業態", "公共工事意向", "簡易診断", "詳細診断", "総合点", "支援判定", "重大フラグ", "相談希望", "結果正確性", "面談予定日", "商談状況", "成約状況", "契約金額", "次回対応日", "詳細"].map((header) => (
                  <th key={header} className="whitespace-nowrap px-3 py-3">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {diagnoses.map((rawDiagnosis) => {
                if (isConstructionManagementDiagnosis(rawDiagnosis)) {
                  const diagnosis = normalizeConstructionManagementDiagnosis(rawDiagnosis);
                  return (
                    <tr key={diagnosis.id}>
                      <Cell>{formatDiagnosisDate(diagnosis.created_at)}</Cell>
                      <Cell bold>{diagnosis.company_name}</Cell>
                      <Cell>{diagnosis.respondent_name}</Cell>
                      <Cell>{diagnosis.prefecture}</Cell>
                      <Cell>{diagnosis.phone}</Cell>
                      <Cell>{diagnosis.email}</Cell>
                      <Cell>{getLeadSourceLabel(diagnosis.lead_source)}</Cell>
                      <Cell>{diagnosis.primary_trade ? getPrimaryTradeLabel(diagnosis.primary_trade) : "-"}</Cell>
                      <Cell>{diagnosis.public_work_intent ? getPublicWorkIntentLabel(diagnosis.public_work_intent) : "-"}</Cell>
                      <Cell>{diagnosis.quick_completed_at ? "完了" : "未完了"}</Cell>
                      <Cell>{diagnosis.detailed_completed_at ? "完了" : "未完了"}</Cell>
                      <Cell bold>{diagnosis.total_score === null ? "-" : Number(diagnosis.total_score).toFixed(1)}</Cell>
                      <Cell bold>{diagnosis.judgment ?? "-"}</Cell>
                      <Cell>{diagnosis.critical_flags.length}件</Cell>
                      <Cell>{diagnosis.consultation_requested ? "希望あり" : "希望なし"}</Cell>
                      <Cell>{diagnosis.feedback_accuracy === null ? "-" : `${diagnosis.feedback_accuracy}点`}</Cell>
                      <Cell>{formatNullableDate(diagnosis.meeting_at)}</Cell>
                      <Cell>{DIAGNOSIS_V2_SALES_STATUS_LABELS[diagnosis.sales_status]}</Cell>
                      <Cell>{DIAGNOSIS_V2_DEAL_STATUS_LABELS[diagnosis.deal_status]}</Cell>
                      <Cell>{diagnosis.deal_amount === null ? "-" : `${Number(diagnosis.deal_amount).toLocaleString("ja-JP")}円`}</Cell>
                      <Cell>{formatNullableDate(diagnosis.next_action_at)}</Cell>
                      <DetailCell id={diagnosis.id} />
                    </tr>
                  );
                }

                return (
                  <tr key={rawDiagnosis.id} className="bg-slate-50/60">
                    <Cell>{formatDiagnosisDate(rawDiagnosis.created_at)}</Cell>
                    <Cell bold>{rawDiagnosis.company_name ?? "-"}</Cell>
                    <Cell>{rawDiagnosis.name}</Cell>
                    <Cell>-</Cell>
                    <Cell>{rawDiagnosis.phone ?? "-"}</Cell>
                    <Cell>{rawDiagnosis.email}</Cell>
                    <Cell>{getLeadSourceLabel(rawDiagnosis.lead_source)}</Cell>
                    <Cell>-</Cell>
                    <Cell>-</Cell>
                    <Cell>旧診断</Cell>
                    <Cell>旧診断</Cell>
                    <Cell>-</Cell>
                    <Cell>{DIAGNOSIS_TYPES[rawDiagnosis.main_type].name}</Cell>
                    <Cell>-</Cell>
                    <Cell>{CONSULTATION_LABELS[rawDiagnosis.wants_consultation] ?? rawDiagnosis.wants_consultation}</Cell>
                    <Cell>-</Cell>
                    <Cell>-</Cell>
                    <Cell>{getLeadStatusLabel(rawDiagnosis.lead_status)}</Cell>
                    <Cell>-</Cell>
                    <Cell>-</Cell>
                    <Cell>-</Cell>
                    <DetailCell id={rawDiagnosis.id} />
                  </tr>
                );
              })}
              {diagnoses.length === 0 ? (
                <tr><td colSpan={22} className="px-3 py-8 text-center text-sm font-semibold text-slate-500">条件に一致する診断データはありません。</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getFilters(params: Record<string, string | string[] | undefined>): AdminDiagnosisFilters {
  const consultation = firstParam(params.consultation_requested);
  const feedbackSubmitted = firstParam(params.feedback_submitted);
  const feedbackAccuracy = Number(firstParam(params.feedback_accuracy));
  const dateFrom = normalizeDateStart(firstParam(params.date_from));
  const dateTo = normalizeDateEnd(firstParam(params.date_to));
  return {
    diagnosisVersion: undefined,
    dateFrom,
    dateTo,
    prefecture: firstParam(params.prefecture) || undefined,
    leadSource: LEAD_SOURCES.some(([value]) => value === firstParam(params.lead_source))
      ? firstParam(params.lead_source) as LeadSource
      : undefined,
    source: SOURCES.includes(firstParam(params.source)) ? firstParam(params.source) : undefined,
    judgment: JUDGMENTS.includes(firstParam(params.judgment) as DiagnosisV2Judgment) ? firstParam(params.judgment) : undefined,
    consultationRequested: consultation === "true" ? true : consultation === "false" ? false : undefined,
    salesStatus: firstParam(params.sales_status) in DIAGNOSIS_V2_SALES_STATUS_LABELS ? firstParam(params.sales_status) : undefined,
    dealStatus: firstParam(params.deal_status) in DIAGNOSIS_V2_DEAL_STATUS_LABELS ? firstParam(params.deal_status) : undefined,
    primaryTrade: PRIMARY_TRADE_OPTIONS.some((option) => option.value === firstParam(params.primary_trade)) ? firstParam(params.primary_trade) : undefined,
    publicWorkIntent: PUBLIC_WORK_INTENT_OPTIONS.some((option) => option.value === firstParam(params.public_work_intent)) ? firstParam(params.public_work_intent) : undefined,
    feedbackSubmitted: feedbackSubmitted === "true" ? true : feedbackSubmitted === "false" ? false : undefined,
    feedbackAccuracy: Number.isInteger(feedbackAccuracy) && feedbackAccuracy >= 1 && feedbackAccuracy <= 5 ? feedbackAccuracy : undefined
  };
}

function getFilterQuery(filters: AdminDiagnosisFilters) {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("date_from", filters.dateFrom.slice(0, 10));
  if (filters.dateTo) params.set("date_to", filters.dateTo.slice(0, 10));
  if (filters.prefecture) params.set("prefecture", filters.prefecture);
  if (filters.leadSource) params.set("lead_source", filters.leadSource);
  if (filters.source) params.set("source", filters.source);
  if (filters.judgment) params.set("judgment", filters.judgment);
  if (typeof filters.consultationRequested === "boolean") params.set("consultation_requested", String(filters.consultationRequested));
  if (filters.salesStatus) params.set("sales_status", filters.salesStatus);
  if (filters.dealStatus) params.set("deal_status", filters.dealStatus);
  if (filters.primaryTrade) params.set("primary_trade", filters.primaryTrade);
  if (filters.publicWorkIntent) params.set("public_work_intent", filters.publicWorkIntent);
  if (typeof filters.feedbackSubmitted === "boolean") params.set("feedback_submitted", String(filters.feedbackSubmitted));
  if (filters.feedbackAccuracy) params.set("feedback_accuracy", String(filters.feedbackAccuracy));
  const query = params.toString();
  return query ? `?${query}` : "";
}

function SelectFilter({ name, label, defaultValue, children }: { name: string; label: string; defaultValue: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-bold text-slate-600">
      {label}
      <select name={name} defaultValue={defaultValue} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus-ring">
        <option value="">すべて</option>
        {children}
      </select>
    </label>
  );
}

function TextFilter({ name, label, defaultValue, type = "text", placeholder }: { name: string; label: string; defaultValue: string; type?: string; placeholder?: string }) {
  return (
    <label className="grid gap-1 text-xs font-bold text-slate-600">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus-ring" />
    </label>
  );
}

function Cell({ children, bold = false }: { children: ReactNode; bold?: boolean }) {
  return <td className={`whitespace-nowrap px-3 py-3 text-slate-700 ${bold ? "font-black text-slate-950" : ""}`}>{children}</td>;
}

function DetailCell({ id }: { id: string }) {
  return <td className="whitespace-nowrap px-3 py-3"><Link href={`/admin/diagnoses/${id}`} className="font-bold text-brand-700">表示</Link></td>;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeDateStart(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+09:00` : undefined;
}

function normalizeDateEnd(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999+09:00` : undefined;
}

function formatNullableDate(value: string | null) {
  return value ? formatDiagnosisDate(value) : "-";
}

function AdminHeader({ email }: { email: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-500">建設会社向け 経営診断・再成長戦略</p>
        <p className="mt-1 text-xs text-slate-500">{email}</p>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/construction-sales-diagnosis" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">公開ページ</Link>
        <form action={signOutAction}>
          <button className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring"><LogOut className="h-4 w-4" />ログアウト</button>
        </form>
      </div>
    </div>
  );
}

function LoginRequired() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">管理画面</h1>
        <p className="mt-2 text-slate-700">診断者一覧を見るには管理者ログインが必要です。</p>
        <Link href="/admin/login" className="mt-5 inline-block rounded bg-brand-700 px-4 py-2 font-bold text-white focus-ring">ログインへ</Link>
      </div>
    </div>
  );
}
