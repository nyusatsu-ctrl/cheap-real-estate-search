import Link from "next/link";
import { AlertTriangle, BarChart3, Building2, CalendarRange, CheckCircle2, ListChecks, Route } from "lucide-react";
import type { GrowthStrategyResult } from "@/lib/construction-diagnosis-v2/strategy";
import type { DiagnosisV2SectionId } from "@/lib/construction-diagnosis-v2/questions";
import { DIAGNOSIS_V2_SECTIONS } from "@/lib/construction-diagnosis-v2/questions";
import { DiagnosisPrintLauncher } from "./DiagnosisPrintLauncher";
import { DiagnosisV23ResultActions } from "./DiagnosisV23ResultActions";
import { PropertySearchInterestForm } from "./PropertySearchInterestForm";
import { DiagnosisV21FeedbackForm } from "./DiagnosisV21FeedbackForm";

export function DiagnosisV23StrategyResultView({
  id,
  result,
  axisScores,
  companyName,
  email,
  saved,
  printMode = false,
  consultationComplete = false,
  feedbackSubmitted = false
}: {
  id: string;
  result: GrowthStrategyResult;
  axisScores: Partial<Record<DiagnosisV2SectionId, number>>;
  companyName?: string;
  email?: string;
  saved: boolean;
  printMode?: boolean;
  consultationComplete?: boolean;
  feedbackSubmitted?: boolean;
}) {
  return (
    <div className="diagnosis-print-page bg-slate-50">
      <section className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-5xl px-4 py-8"><p className="text-sm font-black text-brand-700">御社の再成長戦略</p><h1 className="mt-2 [overflow-wrap:anywhere] text-3xl font-black text-slate-950">{companyName ? `${companyName}様` : "診断結果に基づく優先戦略"}</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">回答内容を根拠に、最初に行うことと今後90日間の進め方を整理しました。売上や受注を保証するものではありません。</p></div></section>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {consultationComplete ? <p className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-900">個別相談を受け付けました。日程確認のご連絡をお待ちください。</p> : null}
        <Section title="結論" icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}><List items={[result.conclusion.firstAction, result.conclusion.priority, result.conclusion.potential]} /></Section>
        <Section title="3分診断で確認した8分野" icon={<BarChart3 className="h-5 w-5 text-brand-700" />}><div className="grid gap-3 sm:grid-cols-2">{DIAGNOSIS_V2_SECTIONS.map((section) => <div key={section.id} className="rounded border border-slate-200 bg-slate-50 p-3"><div className="flex items-center justify-between gap-3 text-sm"><span className="font-bold text-slate-700">{section.label}</span><span className="font-black text-slate-950">{axisScores[section.id] === undefined ? "参考外" : `${Number(axisScores[section.id]).toFixed(1)}点`}</span></div>{axisScores[section.id] !== undefined ? <div className="mt-2 h-2 overflow-hidden rounded bg-slate-200"><div className="h-full rounded bg-brand-700" style={{ width: `${Math.min(100, Number(axisScores[section.id]))}%` }} /></div> : null}</div>)}</div></Section>
        <div className="grid gap-6 lg:grid-cols-2"><Section title="会社の主な強み" icon={<BarChart3 className="h-5 w-5 text-brand-700" />}><List items={result.strengths} /></Section><Section title="成長を止めている原因" icon={<AlertTriangle className="h-5 w-5 text-amber-700" />}><List items={result.blockers} /></Section></div>
        <Section title="仕事の優先順位" icon={<Building2 className="h-5 w-5 text-brand-700" />}><div className="grid gap-4 md:grid-cols-3"><Priority title="増やす仕事" items={result.workPriorities.growth} /><Priority title="現在のまま維持する仕事" items={result.workPriorities.maintain} /><Priority title="条件を見直す、または減らす仕事" items={result.workPriorities.review} /></div></Section>
        <Section title="今後30日間の行動" icon={<CalendarRange className="h-5 w-5 text-brand-700" />}><List items={result.actions30Days} /></Section>
        <Section title="今後90日間の行動" icon={<CalendarRange className="h-5 w-5 text-brand-700" />}><div className="grid gap-4 md:grid-cols-3"><Priority title="1か月目" items={result.plan90Days.month1} /><Priority title="2か月目" items={result.plan90Days.month2} /><Priority title="3か月目" items={result.plan90Days.month3} /></div></Section>
        <Section title="毎月確認する数字" icon={<ListChecks className="h-5 w-5 text-brand-700" />}><List items={result.monthlyMetrics} /></Section>
        {saved && !printMode ? <section className="print:hidden rounded-lg border border-brand-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black text-slate-950">診断結果を保存・印刷する</h2><p className="mt-2 text-sm leading-7 text-slate-700">印刷画面から、ブラウザーの機能を使って紙への印刷またはPDF保存ができます。</p><div className="mt-4"><DiagnosisPrintLauncher diagnosisId={id} /></div></section> : null}
        {!printMode && !saved ? <DiagnosisV23ResultActions sessionId={id} /> : null}
        {result.publicWorks ? <Section title="公共工事への方針" icon={<Route className="h-5 w-5 text-brand-700" />}><p className="text-sm font-semibold leading-7 text-slate-700">{result.publicWorks.currentState}</p><h3 className="mt-4 font-black text-slate-950">先に整えるもの</h3><List items={result.publicWorks.prerequisites} /><p className="mt-4 rounded border border-brand-100 bg-brand-50 p-3 text-sm font-semibold leading-7 text-brand-950">{result.publicWorks.expansionPotential}</p></Section> : null}
        <Section title="公共工事・経営相談" icon={<CheckCircle2 className="h-5 w-5 text-brand-700" />}><p className="text-xl font-black text-slate-950">{result.supportJudgment}</p><p className="mt-3 text-sm leading-7 text-slate-700">診断結果を基に、現在の課題、公共工事参入の可能性、必要な準備、今後90日間の進め方を代表が確認します。</p>{saved && !printMode ? <Link href={`/diagnosis/consultation/${id}`} className="mt-4 inline-flex rounded bg-brand-700 px-5 py-3 text-sm font-black text-white">30分の個別相談を申し込む</Link> : null}</Section>
        {!printMode && saved ? <DiagnosisV21FeedbackForm diagnosisId={id} submitted={feedbackSubmitted} /> : null}
        <section className="rounded border border-slate-300 bg-white p-4 text-xs font-semibold leading-6 text-slate-600">この結果は入力内容に基づく整理です。税務、法務、許可、公共工事の参加要件は、必要に応じて各専門家または発注機関へ確認してください。</section>
        {!printMode ? <div><p className="mb-2 text-xs font-black text-slate-500">別サービスとして開発・検証中</p><PropertySearchInterestForm sessionId={id} companyName={companyName} email={email} /></div> : null}
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="diagnosis-result-section rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2">{icon}<h2 className="text-xl font-black text-slate-950">{title}</h2></div><div className="mt-4">{children}</div></section>; }
function List({ items }: { items: string[] }) { return <ul className="grid gap-2">{items.slice(0, 6).map((item) => <li key={item} className="flex gap-3 text-sm font-semibold leading-7 text-slate-700"><span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-brand-700" />{item}</li>)}</ul>; }
function Priority({ title, items }: { title: string; items: string[] }) { return <div className="rounded border border-slate-200 bg-slate-50 p-4"><h3 className="text-sm font-black leading-6 text-slate-950">{title}</h3><div className="mt-3"><List items={items} /></div></div>; }
