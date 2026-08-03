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
  DIAGNOSIS_V2_PROGRESS_STATUS_LABELS,
  DIAGNOSIS_V2_SALES_STATUS_LABELS,
  isConstructionManagementDiagnosis,
  normalizeConstructionManagementDiagnosis
} from "@/lib/construction-diagnosis-v2/data";
import {
  PRIMARY_TRADE_OPTIONS,
  PUBLIC_WORK_INTENT_OPTIONS,
  getPrimaryTradeLabel,
  getPublicWorkIntentLabel,
  type PrimaryTrade
} from "@/lib/construction-diagnosis-v2/specialty-questions";
import { getDiagnosisMonitorSummary, getDiagnosisV22FunnelSummary, getPropertySearchWaitlist, type DiagnosisMonitorSummary, type DiagnosisV22FunnelSummary, type PropertySearchWaitlistEntry, type PropertySearchWaitlistFilters } from "@/lib/construction-diagnosis-v2/sessions";
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
  const waitlistFilters = getPropertyWaitlistFilters(params);
  const [diagnoses, funnel, monitor, propertyWaitlist] = await Promise.all([
    getConstructionDiagnoses(filters),
    getDiagnosisV22FunnelSummary(),
    getDiagnosisMonitorSummary(),
    getPropertySearchWaitlist(waitlistFilters)
  ]);
  const exportHref = `/admin/diagnoses/export${getFilterQuery(filters)}`;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6">
      <AdminHeader email={admin.email} />
      <DiagnosisMonitorMetrics summary={monitor} />
      {funnel ? <DiagnosisFunnel summary={funnel} /> : null}
      <PropertyWaitlist entries={propertyWaitlist} filters={waitlistFilters} />
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
                {["診断日時", "会社名", "回答者", "都道府県", "電話番号", "メール", "URL流入元", "主な業態", "公共工事意向", "診断状態", "詳細回答", "最終質問", "最終保存", "簡易診断", "詳細診断", "総合点", "支援判定", "重大フラグ", "相談希望", "結果正確性", "面談予定日", "商談状況", "成約状況", "契約金額", "次回対応日", "詳細"].map((header) => (
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
                      <Cell>{diagnosis.diagnosis_status ? DIAGNOSIS_V2_PROGRESS_STATUS_LABELS[diagnosis.diagnosis_status] : "-"}</Cell>
                      <Cell>{diagnosis.detailed_total_questions > 0 ? `${diagnosis.detailed_answered_count}/${diagnosis.detailed_total_questions}` : "-"}</Cell>
                      <Cell>{diagnosis.detailed_last_question_id ?? "-"}</Cell>
                      <Cell>{formatNullableDate(diagnosis.last_saved_at)}</Cell>
                      <Cell>{diagnosis.quick_completed_at ? "完了" : "未完了"}</Cell>
                      <Cell>{diagnosis.detailed_completed_at ? "完了" : "未完了"}</Cell>
                      <Cell bold>{diagnosis.total_score === null ? "-" : Number(diagnosis.total_score).toFixed(1)}</Cell>
                      <Cell bold>{diagnosis.strategy_result?.supportJudgment ?? diagnosis.judgment ?? "-"}</Cell>
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
                    <Cell>-</Cell>
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
                <tr><td colSpan={26} className="px-3 py-8 text-center text-sm font-semibold text-slate-500">条件に一致する診断データはありません。</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PropertyWaitlist({ entries, filters }: { entries: PropertySearchWaitlistEntry[]; filters: PropertySearchWaitlistFilters }) {
  const exportParams = new URLSearchParams();
  if (filters.interestLevel) exportParams.set("waitlist_interest", filters.interestLevel);
  if (filters.primaryTrade) exportParams.set("waitlist_trade", filters.primaryTrade);
  if (filters.source) exportParams.set("waitlist_source", filters.source);
  const exportHref = `/admin/diagnoses/property-waitlist/export${exportParams.size > 0 ? `?${exportParams.toString()}` : ""}`;
  return <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950">格安不動産サーチ案内希望</h2><p className="mt-1 text-sm text-slate-600">条件一致{entries.length}件。最新200件を表示しています。</p></div><Link href={exportHref} className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">表示条件でCSV</Link></div><form method="get" className="mt-4 grid gap-3 rounded border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-4"><SelectFilter name="waitlist_interest" label="関心度" defaultValue={filters.interestLevel ?? ""}><option value="notify">完成時に案内</option><option value="details">詳しい内容</option></SelectFilter><SelectFilter name="waitlist_trade" label="業種" defaultValue={filters.primaryTrade ?? ""}>{PRIMARY_TRADE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectFilter><SelectFilter name="waitlist_source" label="流入元" defaultValue={filters.source ?? ""}>{LEAD_SOURCES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectFilter><div className="flex items-end gap-2"><button className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white">絞り込む</button><Link href="/admin/diagnoses" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">解除</Link></div></form><div className="mt-4 overflow-x-auto"><table className="min-w-[900px] text-sm"><thead className="bg-slate-50 text-left text-xs font-bold text-slate-500"><tr>{["会社名", "業種", "メール", "関心度", "知りたい物件", "登録日時", "流入元"].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{entries.map((entry) => <tr key={entry.id}><Cell bold>{entry.company_name}</Cell><Cell>{getPrimaryTradeLabel(entry.primary_trade)}</Cell><Cell>{entry.email}</Cell><Cell>{entry.interest_level === "notify" ? "完成時に案内" : "詳しい内容"}</Cell><Cell>{entry.interest_topics.join(" / ")}</Cell><Cell>{formatDiagnosisDate(entry.created_at)}</Cell><Cell>{getLeadSourceLabel(entry.source)}</Cell></tr>)}{entries.length === 0 ? <tr><td colSpan={7} className="px-3 py-6 text-center text-sm font-semibold text-slate-500">条件に一致する案内希望はありません。</td></tr> : null}</tbody></table></div></section>;
}

function getPropertyWaitlistFilters(params: Record<string, string | string[] | undefined>): PropertySearchWaitlistFilters {
  const interestLevel = firstParam(params.waitlist_interest);
  const primaryTrade = firstParam(params.waitlist_trade);
  const source = firstParam(params.waitlist_source);
  return {
    interestLevel: interestLevel === "notify" || interestLevel === "details" ? interestLevel : undefined,
    primaryTrade: PRIMARY_TRADE_OPTIONS.some((option) => option.value === primaryTrade) ? primaryTrade as PrimaryTrade : undefined,
    source: LEAD_SOURCES.some(([value]) => value === source) ? source : undefined
  };
}

function DiagnosisFunnel({ summary }: { summary: DiagnosisV22FunnelSummary }) {
  const cards = [
    ["短縮診断を始めた数", summary.started],
    ["短縮診断を完了した数", summary.shortCompleted],
    ["短縮診断の完了率", `${summary.shortCompletionRate}%`],
    ["詳細診断へ進んだ数", summary.detailedStarted],
    ["詳細診断を完了した数", summary.detailedCompleted],
    ["再成長戦略へ進んだ数", summary.strategyStarted],
    ["再成長戦略を完了した数", summary.strategyCompleted],
    ["再成長戦略への移行率", `${summary.strategyConversionRate}%`],
    ["個別相談申込み", summary.consultationRequested],
    ["格安不動産案内希望", summary.propertyWaitlist],
    ["連絡先未入力の診断", summary.activeAnonymous]
  ];
  return (
    <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">v2.2 診断の進み具合</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map(([label, value]) => <div key={String(label)} className="rounded border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-slate-950">{value}</p></div>)}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <FunnelList title="止まっている質問" items={summary.abandonedQuestions.map((item) => `${item.label}: ${item.count}件`)} />
        <FunnelList title="業種別の完了率" items={summary.tradeStats.map((item) => `${getPrimaryTradeLabel(item.label as PrimaryTrade)}: ${item.completed}/${item.started}件（${item.rate}%）`)} />
        <FunnelList title="端末・ブラウザ別の完了率" items={summary.deviceStats.map((item) => `${item.label}: ${item.completed}/${item.started}件（${item.rate}%）`)} />
      </div>
    </section>
  );
}

function DiagnosisMonitorMetrics({ summary }: { summary: DiagnosisMonitorSummary }) {
  if (!summary.available) return <section className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-900">利用イベント集計は、診断モニタリング用マイグレーション適用後に表示されます。</section>;
  const eventCards = [
    ["診断開始", summary.eventCounts.diagnosis_started ?? 0],
    ["3分診断完了", summary.eventCounts.short_diagnosis_completed ?? 0],
    ["追加診断開始", summary.eventCounts.detailed_diagnosis_started ?? 0],
    ["追加診断完了", summary.eventCounts.detailed_diagnosis_completed ?? 0],
    ["会社情報入力", summary.eventCounts.company_info_submitted ?? 0],
    ["印刷・保存", summary.eventCounts.print_opened ?? 0],
    ["相談申込み", summary.eventCounts.consultation_requested ?? 0],
    ["フィードバック", summary.eventCounts.feedback_submitted ?? 0],
    ["平均評価", summary.averageFeedback === null ? "-" : `${summary.averageFeedback} / 5`]
  ];
  return <section className="mb-5 rounded-lg border border-brand-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950">モニターテスト利用状況</h2><p className="mt-1 text-xs text-slate-500">会社名や回答本文を含まない匿名イベントの集計です。</p></div><p className="text-xs font-bold text-slate-600">通知: 送信済み {summary.notificationStats.sent} / 保留 {summary.notificationStats.pending} / 失敗 {summary.notificationStats.failed}</p></div><div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">{eventCards.map(([label, value]) => <div key={String(label)} className="rounded border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-slate-950">{value}</p></div>)}</div><div className="mt-4 grid gap-4 lg:grid-cols-2"><div className="overflow-x-auto rounded border border-slate-200"><table className="min-w-[760px] text-xs"><thead className="bg-slate-50 text-left text-slate-500"><tr>{["source", "開始", "3分完了", "追加開始", "追加完了", "会社情報", "印刷", "相談", "評価"].map((label) => <th key={label} className="px-2 py-2">{label}</th>)}</tr></thead><tbody>{summary.sourceStats.map((row) => <tr key={row.source} className="border-t border-slate-200"><td className="px-2 py-2 font-black">{getLeadSourceLabel(row.source)}</td>{[row.started, row.shortCompleted, row.detailedStarted, row.detailedCompleted, row.companyInfo, row.printed, row.consultation, row.feedback].map((value, index) => <td key={index} className="px-2 py-2">{value}</td>)}</tr>)}</tbody></table></div><FunnelList title="質問別 到達数 / 離脱候補" items={summary.questionStats.map((item) => `${item.questionCode}: 到達${item.reached}件 / 離脱候補${item.dropoffCandidates}件`)} /></div></section>;
}

function FunnelList({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded border border-slate-200 p-3"><h3 className="text-sm font-black text-slate-900">{title}</h3>{items.length > 0 ? <ul className="mt-2 grid gap-1 text-xs font-semibold leading-5 text-slate-600">{items.slice(0, 8).map((item) => <li key={item}>・{item}</li>)}</ul> : <p className="mt-2 text-xs text-slate-500">該当なし</p>}</div>;
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
        <p className="text-sm font-semibold text-slate-500">エコループ 建設会社向け経営診断</p>
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
