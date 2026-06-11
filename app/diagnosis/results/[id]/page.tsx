import Link from "next/link";
import { notFound } from "next/navigation";
import { CONSULTATION_LABELS, DIAGNOSIS_TYPES, formatDiagnosisDate, getConstructionDiagnosis } from "@/lib/construction-diagnosis";
import { ArrowRight, CalendarCheck, Hammer, PhoneCall } from "lucide-react";

export default async function DiagnosisResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const diagnosis = await getConstructionDiagnosis(id);
  if (!diagnosis) notFound();

  const main = DIAGNOSIS_TYPES[diagnosis.main_type];
  const sub = DIAGNOSIS_TYPES[diagnosis.sub_type];

  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <p className="text-sm font-bold text-brand-700">診断結果</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">{main.name}</h1>
          <p className="mt-3 text-sm text-slate-600">診断日時: {formatDiagnosisDate(diagnosis.created_at)}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Metric label="メインタイプ" value={`${main.code}. ${main.name}`} />
            <Metric label="サブ課題" value={`${sub.code}. ${sub.name}`} />
            <Metric label="相談意欲" value={CONSULTATION_LABELS[diagnosis.wants_consultation] ?? diagnosis.wants_consultation} />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-5 px-4 py-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <ResultBlock title="現状" body={main.currentState} />
          <ResultBlock title="課題" body={main.issue} />
          <ResultBlock title="最初にやるべきこと" body={main.firstStep} icon={<Hammer className="h-5 w-5 text-brand-700" />} />
          <ActionList title="30日以内の行動" items={main.action30Days} />
          <ActionList title="90日以内の行動" items={main.action90Days} icon={<CalendarCheck className="h-5 w-5 text-brand-700" />} />
        </div>

        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-brand-700" />
            <h2 className="text-lg font-black text-slate-950">個別相談</h2>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            診断結果をもとに、売上・利益・集客の優先順位を整理します。必要な方には具体的な90日計画を提案できます。
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

function ResultBlock({ title, body, icon }: { title: string; body: string; icon?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
      </div>
      <p className="mt-3 leading-8 text-slate-700">{body}</p>
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
