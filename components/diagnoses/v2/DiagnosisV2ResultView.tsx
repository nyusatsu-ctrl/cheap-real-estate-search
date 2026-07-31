import Link from "next/link";
import { DiagnosisV21FeedbackForm } from "@/components/diagnoses/v2/DiagnosisV21FeedbackForm";
import { PrintButton } from "@/components/diagnoses/v2/PrintButton";
import type { ConstructionManagementDiagnosis } from "@/lib/construction-diagnosis-v2/data";
import {
  CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION,
  DIAGNOSIS_V2_SECTIONS,
  isSpecialtyConstructionDiagnosisVersion,
  type DiagnosisV2ScoringContext
} from "@/lib/construction-diagnosis-v2/questions";
import { buildDiagnosisV2Result } from "@/lib/construction-diagnosis-v2/results";
import { scoreDetailedDiagnosis } from "@/lib/construction-diagnosis-v2/questions";
import {
  getOrderModelLabel,
  getPrimaryTradeLabel,
  getPublicWorkIntentLabel
} from "@/lib/construction-diagnosis-v2/specialty-questions";
import { formatDiagnosisDate } from "@/lib/construction-diagnosis";
import { AlertTriangle, ArrowRight, BarChart3, Building2, CalendarRange, CheckCircle2, ClipboardList, Route, ShieldCheck } from "lucide-react";

const DISCLAIMER = "この診断は、入力内容から会社の課題と、これから行うことを整理するものです。税金、法律、雇用、銀行、建設業の許可、公共工事への登録などについて、専門家の判断に代わるものではありません。売上や利益が増えること、公共工事に参加・受注できることを保証するものでもありません。";

export function DiagnosisV2ResultView({
  diagnosis,
  printMode = false
}: {
  diagnosis: ConstructionManagementDiagnosis;
  printMode?: boolean;
}) {
  const hasSpecialty = isSpecialtyConstructionDiagnosisVersion(diagnosis.diagnosis_version);
  const isV22 = diagnosis.diagnosis_version === CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION;
  const context: DiagnosisV2ScoringContext = hasSpecialty
    ? {
        primaryTrade: diagnosis.primary_trade,
        publicWorkIntent: diagnosis.public_work_intent,
        includeSpecialty: true
      }
    : { includeSpecialty: false };
  const scoring = scoreDetailedDiagnosis(diagnosis.detailed_answers, context);
  if (!scoring.complete || scoring.totalScore === null || !scoring.judgment) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h1 className="text-xl font-black text-amber-950">詳細診断はまだ完了していません</h1>
          <p className="mt-2 text-sm leading-7 text-amber-900">未回答項目を確認し、詳細診断を完了すると結果を表示できます。</p>
          <Link href={`/diagnosis/details/${diagnosis.id}`} className="mt-5 inline-flex rounded bg-brand-700 px-4 py-3 font-black text-white">詳細診断へ戻る</Link>
        </div>
      </div>
    );
  }

  const result = hasSpecialty
    ? buildDiagnosisV2Result(diagnosis.detailed_answers, scoring, context)
    : diagnosis.diagnosis_result ?? buildDiagnosisV2Result(diagnosis.detailed_answers, scoring, context);
  const shouldRecommendConsultation = [
    "経営基盤の整備を優先",
    "一部支援推奨",
    "段階的な専門支援推奨"
  ].includes(scoring.judgment);

  return (
    <div className={`diagnosis-print-page bg-slate-50 ${printMode ? "diagnosis-force-print-layout" : ""}`}>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black text-brand-700">詳細診断結果</p>
                <span className="rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-800 print:hidden">テスト版</span>
              </div>
              <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">{diagnosis.company_name}様</h1>
              <p className="mt-2 text-sm text-slate-600">診断日: {formatDiagnosisDate(diagnosis.detailed_completed_at ?? diagnosis.created_at)}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row print:hidden">
              <Link href={`/diagnosis/results/${diagnosis.id}/print`} className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 focus-ring">
                印刷画面
              </Link>
              <PrintButton />
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Metric label="総合点" value={`${scoring.totalScore.toFixed(1)}点`} emphasis />
            <Metric label="支援判定" value={scoring.judgment} />
          </div>
          {scoring.criticalFlags.length > 0 ? (
            <div className="mt-4 flex gap-3 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-7 text-red-900">
              <AlertTriangle className="mt-1 h-5 w-5 shrink-0" />
              急いで確認する項目が{scoring.criticalFlags.length}件あります。仕事を増やす前に、会社のお金、安全、法律、お金や書類の確認方法を先に確認してください。
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <ResultSection title="8分野の点数" icon={<BarChart3 className="h-5 w-5 text-brand-700" />}>
          <div className="grid gap-4">
            {DIAGNOSIS_V2_SECTIONS.map((section) => {
              const score = scoring.axisScores[section.id];
              const excluded = section.id === "public_works" && scoring.publicWorksMode === "excluded";
              return (
                <div key={section.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold text-slate-700">
                      {section.shortLabel}
                      {section.id === "public_works" && scoring.publicWorksMode === "reference" ? <span className="ml-2 text-xs text-sky-700">参考</span> : null}
                    </span>
                    <span className="font-black text-slate-950">{excluded || score === undefined ? "対象外" : `${score.toFixed(1)}点`}</span>
                  </div>
                  {!excluded && score !== undefined ? (
                    <div className="mt-2 h-3 overflow-hidden rounded bg-slate-100">
                      <div className={`h-full rounded ${score >= 70 ? "bg-emerald-600" : score >= 55 ? "bg-brand-700" : "bg-amber-600"}`} style={{ width: `${Math.min(100, score)}%` }} />
                    </div>
                  ) : <div className="mt-2 h-3 rounded bg-slate-100" />}
                </div>
              );
            })}
          </div>
        </ResultSection>

        {hasSpecialty && result.specialty ? (
          <ResultSection title={isV22 ? "この工事業種で確認すること" : "御社の業態別重要指標"} icon={<Building2 className="h-5 w-5 text-brand-700" />}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ProfileMetric label="主な業態" value={getPrimaryTradeLabel(diagnosis.primary_trade)} />
              <ProfileMetric label="主な受注形態" value={diagnosis.order_models.length > 0 ? diagnosis.order_models.map(getOrderModelLabel).join(" / ") : "未回答"} />
              {!isV22 ? <ProfileMetric label="自社施工比率" value={diagnosis.self_perform_ratio ?? "未回答"} /> : null}
              {!isV22 ? <ProfileMetric label="主な工事金額" value={diagnosis.average_project_size ?? "未回答"} /> : null}
              <ProfileMetric label="公共工事への意向" value={getPublicWorkIntentLabel(diagnosis.public_work_intent)} />
              <ProfileMetric label="業態別質問の評価" value={`${result.specialty.score.toFixed(1)}点`} />
            </div>
            {!isV22 ? <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-black text-slate-950">売上構成</h3>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-700">お客様から直接受ける工事 {formatRatio(diagnosis.prime_ratio)} / 他の建設会社から受ける工事 {formatRatio(diagnosis.subcontract_ratio)} / 公共工事 {formatRatio(diagnosis.public_ratio)} / 個人客 {formatRatio(diagnosis.consumer_ratio)}</p>
            </div> : null}
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-black text-slate-950">{isV22 ? "この工事業種の強み" : "業態特有の強み"}</h3>
                <ResultItemList items={result.specialty.strengths} tone="positive" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-950">{isV22 ? "この工事業種で先に確認すること" : "業態特有の優先課題"}</h3>
                <ResultItemList items={result.specialty.priorities} tone="warning" />
              </div>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-black text-slate-950">この工事業種で毎月確認する数字</h3>
                <ResultItemList items={result.specialty.kpis} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-950">{isV22 ? "この工事業種で90日間に行うこと" : "90日間の業態別改善策"}</h3>
                <ResultItemList items={result.specialty.plan90Days} />
              </div>
            </div>
          </ResultSection>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <ResultSection title="主な強み" icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}>
            {result.strengths.length > 0 ? (
              <ResultItemList items={result.strengths.map((item) => `${item.label}（${item.score.toFixed(1)}点）: ${item.detail}`)} tone="positive" />
            ) : (
              <p className="text-sm leading-7 text-slate-700">70点以上の分野がないため、現時点では無理に強みと断定せず、改善後に再確認することを推奨します。</p>
            )}
          </ResultSection>
          <ResultSection title="優先課題" icon={<AlertTriangle className="h-5 w-5 text-amber-700" />}>
            <ResultItemList items={result.priorities.map((item) => `${item.label}（${item.score.toFixed(1)}点）: ${item.detail}`)} tone="warning" />
          </ResultSection>
        </div>

        <ResultSection title="公共工事参入の現在地" icon={<Route className="h-5 w-5 text-brand-700" />}>
          <h3 className="text-lg font-black text-slate-950">{result.publicWorks.title}</h3>
          <p className="mt-3 leading-8 text-slate-700">{result.publicWorks.summary}</p>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <h4 className="text-sm font-black text-slate-950">現在の回答状況</h4>
              <ResultItemList items={result.publicWorks.currentState} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-950">先に整えるべき事項</h4>
              <ResultItemList items={result.publicWorks.prerequisites} />
            </div>
          </div>
          <p className="mt-5 rounded border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-semibold leading-7 text-brand-950">{result.publicWorks.expansionPotential}</p>
        </ResultSection>

        <ResultSection title="これから90日間に行うこと" icon={<CalendarRange className="h-5 w-5 text-brand-700" />}>
          <div className="grid gap-4 md:grid-cols-3">
            <MonthPlan month="1か月目" subtitle="事実確認・不足項目の一覧化" items={result.plan90Days.month1} />
            <MonthPlan month="2か月目" subtitle="担当者と社内の決まりを整える" items={result.plan90Days.month2} />
            <MonthPlan month="3か月目" subtitle="申請、案件探し、毎月の確認を始める" items={result.plan90Days.month3} />
          </div>
        </ResultSection>

        <div className="grid gap-6 lg:grid-cols-2">
          <ResultSection title="自社対応可能な事項" icon={<Building2 className="h-5 w-5 text-brand-700" />}>
            <ResultItemList items={result.selfServiceActions} />
          </ResultSection>
          <ResultSection title="専門支援を検討する事項" icon={<ShieldCheck className="h-5 w-5 text-brand-700" />}>
            <ResultItemList items={result.professionalSupportActions} />
          </ResultSection>
        </div>

        {!printMode ? (
          <section className="print:hidden">
            <div className="rounded-lg border border-brand-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">{result.consultation?.heading ?? "診断結果について詳しく確認したい会社様へ"}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">{result.consultation?.body ?? "診断結果は入力内容に基づく簡易判定です。個別要件を確認することで、より具体的な優先順位を整理できます。"}</p>
              {diagnosis.consultation_requested ? (
                <p className="mt-4 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">個別相談を申込み済みです。日程確認のご連絡をお待ちください。</p>
              ) : shouldRecommendConsultation ? (
                <Link href={`/diagnosis/consultation/${diagnosis.id}`} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 font-black text-white focus-ring sm:w-auto">
                  30分の個別相談を申し込む
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : scoring.judgment === "自社対応可能＋必要時スポット支援" ? (
                <div className="mt-4">
                  <p className="text-sm font-semibold leading-7 text-slate-700">診断上は自社で進められる可能性があります。実行時に個別要件の確認が必要になった場合のみ、スポット相談をご利用ください。</p>
                  <Link href={`/diagnosis/consultation/${diagnosis.id}`} className="mt-3 inline-flex items-center justify-center rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 focus-ring">
                    必要時のみ相談する
                  </Link>
                </div>
              ) : (
                <p className="mt-4 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-7 text-slate-700">現時点では、まず不足情報と実行余力を整理し、支援が必要かを改めて判断してください。</p>
              )}
            </div>
          </section>
        ) : null}

        {!printMode && (hasSpecialty || isV22) ? (
          <DiagnosisV21FeedbackForm diagnosisId={diagnosis.id} submitted={Boolean(diagnosis.feedback_submitted_at)} />
        ) : null}

        <section className="rounded border border-slate-300 bg-white p-5">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-slate-600" />
            <h2 className="font-black text-slate-950">注意事項</h2>
          </div>
          <p className="mt-3 text-xs font-semibold leading-6 text-slate-600">{DISCLAIMER}</p>
          <p className="mt-3 text-xs font-black text-slate-700">株式会社エコループ</p>
        </section>

        {!printMode ? (
          <div className="flex flex-col gap-3 sm:flex-row print:hidden">
            <Link href="/diagnosis" className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 focus-ring">もう一度診断する</Link>
            <Link href="/construction-sales-diagnosis" className="inline-flex items-center justify-center gap-2 rounded bg-slate-900 px-5 py-3 font-black text-white focus-ring">
              トップへ戻る
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="flex justify-end print:hidden"><PrintButton /></div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`rounded border p-4 ${emphasis ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-slate-50"}`}>
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className={`mt-2 font-black text-slate-950 ${emphasis ? "text-3xl" : "text-lg"}`}>{value}</p>
    </div>
  );
}

function ResultSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="diagnosis-result-section rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ResultItemList({ items, tone = "default" }: { items: string[]; tone?: "default" | "positive" | "warning" }) {
  const dotClass = tone === "positive" ? "bg-emerald-600" : tone === "warning" ? "bg-amber-600" : "bg-brand-700";
  return (
    <ul className="mt-3 grid gap-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm font-semibold leading-7 text-slate-700">
          <span className={`mt-2.5 h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function MonthPlan({ month, subtitle, items }: { month: string; subtitle: string; items: string[] }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-black text-brand-700">{month}</p>
      <h3 className="mt-1 text-base font-black leading-6 text-slate-950">{subtitle}</h3>
      <ResultItemList items={items} />
    </div>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black leading-6 text-slate-950">{value}</p>
    </div>
  );
}

function formatRatio(value: number | null) {
  return value === null ? "未回答" : `${Number(value).toLocaleString("ja-JP")}％`;
}
