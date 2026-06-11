import Link from "next/link";
import { BarChart3, Building2, ClipboardCheck, Hammer, LineChart, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="max-w-5xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
              <Hammer className="h-4 w-4" />
              建設業者・職人・専門工事業者向け
            </p>
            <h1 className="text-3xl font-black leading-tight text-slate-950 md:text-5xl">建設業売上アップ診断</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700">
              現在の月商、受注経路、元請・下請比率、利益管理、集客状況をもとに、売上アップのために最初に取り組むべき方向性を自動診断します。
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/diagnosis" className="inline-flex items-center justify-center rounded bg-brand-700 px-5 py-3 font-bold text-white focus-ring">
                無料診断を始める
              </Link>
              <Link href="/admin/diagnoses" className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 focus-ring">
                管理画面
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [ClipboardCheck, "20項目で自動診断", "業種、月商、利益、集客、営業、組織体制から最適な売上アップタイプを判定します。"],
            [BarChart3, "メイン課題とサブ課題", "最も高いスコアをメイン診断タイプ、2番目をサブ課題として表示します。"],
            [LineChart, "30日・90日の行動", "診断結果ごとに、最初にやるべきことと短期行動を具体化します。"],
            [Building2, "建設業向け設計", "元請化、協力業者拡大、公共工事、利益改善、集客強化などの現場課題に対応します。"],
            [ShieldCheck, "回答を保存", "Supabaseに回答内容と診断結果を保存し、管理画面から確認できます。"],
            [Hammer, "相談につなげるCTA", "個別相談の意欲を記録し、優先してフォローすべき診断者を把握できます。"]
          ].map(([Icon, title, body]) => (
            <div key={String(title)} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <Icon className="h-5 w-5 text-brand-700" />
              <h2 className="mt-3 text-lg font-black text-slate-950">{String(title)}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-700">{String(body)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
