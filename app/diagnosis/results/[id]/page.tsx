import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CONSULTATION_LABELS,
  DIAGNOSIS_TYPES,
  formatDiagnosisDate,
  getConstructionDiagnosis,
  getPublicWorksRoutePlan
} from "@/lib/construction-diagnosis";
import { ArrowRight, CalendarCheck, ClipboardList, Hammer, PhoneCall, Route } from "lucide-react";

const SEMINAR_GUIDE_HREF = "/diagnosis?source=direct&campaign=seminar_guide";
const CONSULTATION_HREF = "/diagnosis?source=direct&campaign=consultation_cta";

export default async function DiagnosisResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const diagnosis = await getConstructionDiagnosis(id);
  if (!diagnosis) notFound();

  const main = DIAGNOSIS_TYPES[diagnosis.main_type];
  const sub = DIAGNOSIS_TYPES[diagnosis.sub_type];
  const routePlan = getPublicWorksRoutePlan(diagnosis);

  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <p className="text-sm font-bold text-brand-700">診断結果</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">{main.name}</h1>
          <p className="mt-3 text-sm text-slate-600">診断日時: {formatDiagnosisDate(diagnosis.created_at)}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <Metric label="メインタイプ" value={`${main.code}. ${main.name}`} />
            <Metric label="サブ課題" value={`${sub.code}. ${sub.name}`} />
            <Metric label="推奨ルート" value={routePlan.routeTitle} />
            <Metric label="相談意欲" value={CONSULTATION_LABELS[diagnosis.wants_consultation] ?? diagnosis.wants_consultation} />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-5 px-4 py-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-normal text-brand-700">{routePlan.emphasisLabel}</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">診断タイプ</h2>
            <p className="mt-3 leading-8 text-slate-700">{main.currentState}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <TypeSummary label="メイン診断" value={`${main.code}. ${main.name}`} />
              <TypeSummary label="サブ課題" value={`${sub.code}. ${sub.name}`} />
            </div>
          </section>

          <ResultList
            title="現在の課題"
            body={main.issue}
            items={routePlan.currentIssues}
            icon={<ClipboardList className="h-5 w-5 text-brand-700" />}
          />
          <RouteBlock plan={routePlan} />
          <ActionList title="まず取り組むべきこと" items={routePlan.firstActions} icon={<Hammer className="h-5 w-5 text-brand-700" />} />
          <ActionList title="90日以内の行動プラン" items={routePlan.action90Days} icon={<CalendarCheck className="h-5 w-5 text-brand-700" />} />
          <ActionList title="platform導入で効率化できること" items={routePlan.platformSuggestions} icon={<ClipboardList className="h-5 w-5 text-brand-700" />} />
        </div>

        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-brand-700" />
            <h2 className="text-lg font-black text-slate-950">個別相談</h2>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            診断結果をもとに、オープンカウンターから始めるべきか、建設業許可・経審・全省庁資格まで進めるべきかを整理できます。
          </p>
          <a
            href={`mailto:${diagnosis.email}?subject=${encodeURIComponent("建設業売上アップ診断の個別相談")}`}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded bg-brand-700 px-4 py-3 text-sm font-black text-white focus-ring"
          >
            メールで相談する
            <ArrowRight className="h-4 w-4" />
          </a>
          <Link href="/diagnosis" className="mt-3 inline-flex w-full items-center justify-center rounded border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 focus-ring">
            もう一度診断する
          </Link>
        </aside>
      </div>

      <section className="mx-auto max-w-5xl px-4 pb-10">
        <div className="rounded-lg border border-brand-100 bg-white p-5 shadow-sm md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <p className="text-sm font-bold text-brand-700">公共工事参入支援</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">御社に合う公共工事参入ルートを無料説明会で確認できます</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">
              診断結果をもとに、オープンカウンターから始めるべきか、建設業許可・経審・全省庁資格まで進めるべきかを整理できます。
            </p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 md:mt-0 md:min-w-80 md:grid-cols-1">
            <Link href={SEMINAR_GUIDE_HREF} className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-4 py-3 text-sm font-black text-white focus-ring">
              無料オンライン説明会の案内を受ける
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={CONSULTATION_HREF} className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 focus-ring">
              個別相談を希望する
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-base font-black text-slate-950">{value}</p>
    </div>
  );
}

function TypeSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-base font-black text-slate-950">{value}</p>
    </div>
  );
}

function ResultList({ title, body, items, icon }: { title: string; body: string; items: string[]; icon?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
      </div>
      <p className="mt-3 leading-8 text-slate-700">{body}</p>
      <ul className="mt-4 grid gap-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold leading-6 text-slate-800">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-700" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RouteBlock({ plan }: { plan: ReturnType<typeof getPublicWorksRoutePlan> }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Route className="h-5 w-5 text-brand-700" />
        <h2 className="text-xl font-black text-slate-950">公共工事参入ルート</h2>
      </div>
      <h3 className="mt-4 text-lg font-black text-slate-950">{plan.routeTitle}</h3>
      <p className="mt-3 leading-8 text-slate-700">{plan.routeSummary}</p>
      {plan.permitBarrier ? (
        <div className="mt-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-7 text-amber-950">
          {plan.permitBarrier}
        </div>
      ) : null}
      <ul className="mt-4 grid gap-3">
        {plan.routeItems.map((item) => (
          <li key={item} className="flex gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold leading-6 text-slate-800">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-700" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ActionList({ title, items, icon }: { title: string; items: string[]; icon?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
      </div>
      <ul className="mt-4 grid gap-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-800">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-700" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
