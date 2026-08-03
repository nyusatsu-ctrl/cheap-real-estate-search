import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, ClipboardCheck, Route, ShieldCheck, TrendingUp } from "lucide-react";
import { DIAGNOSIS_APP_NAME, DIAGNOSIS_DESCRIPTION, DIAGNOSIS_OPERATOR } from "@/lib/diagnosis-brand";

export const metadata: Metadata = {
  title: DIAGNOSIS_APP_NAME,
  description: DIAGNOSIS_DESCRIPTION,
  robots: { index: false, follow: false }
};

const diagnosisBenefits = [
  "経営上の強み",
  "利益が残りにくい原因",
  "社長依存や組織上の課題",
  "公共工事への参入余地",
  "今後90日間の優先行動",
  "専門的な支援が必要かどうか"
];

const featureItems = [
  { title: "経営・収益の現在地", body: "売上、利益、資金繰り、工事別原価、受注基盤を8分野で整理します。", icon: TrendingUp },
  { title: "公共工事参入の余地", body: "許可、経審、参加資格、技術者、書類・担当体制から先に整える事項を確認します。", icon: Route },
  { title: "90日再成長戦略", body: "優先課題と重大項目から、1か月目、2か月目、3か月目の行動方針を作成します。", icon: ClipboardCheck }
];

export default function ConstructionSalesDiagnosisPage() {
  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-16">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="inline-flex items-center gap-2 rounded bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
                <Building2 className="h-4 w-4" />
                株式会社エコループ
              </p>
              <span className="rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-800">テスト版</span>
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight text-slate-950 md:text-6xl">
              エコループ
              <span className="mt-2 block text-brand-800">建設会社向け経営診断</span>
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-700 md:text-lg">
              売上、利益、原価管理、人材、組織、公共工事への参加体制などを診断し、御社の強み、優先課題、今後90日間の行動方針を整理します。
            </p>
            <Link href="/diagnosis?source=direct" className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded bg-brand-700 px-6 py-4 text-base font-black text-white shadow-soft focus-ring sm:w-auto">
              無料診断を開始する
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-brand-700" />
            <h2 className="text-xl font-black text-slate-950">診断で分かること</h2>
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {diagnosisBenefits.map((item) => (
              <li key={item} className="flex gap-2 text-sm font-semibold leading-6 text-slate-800">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-3">
          {featureItems.map(({ title, body, icon: Icon }) => (
            <section key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="rounded bg-brand-50 p-2 text-brand-700"><Icon className="h-5 w-5" /></span>
                <div>
                  <h2 className="text-lg font-black text-slate-950">{title}</h2>
                  <p className="mt-1 text-sm leading-7 text-slate-700">{body}</p>
                </div>
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <div className="mb-5 rounded-lg border border-brand-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">建設現場と会社経営の実務を踏まえた診断です</h2>
          <p className="mt-2 text-sm leading-7 text-slate-700">運営は{DIAGNOSIS_OPERATOR.companyName}です。代表は建設現場・施工管理・建設会社経営の経験を持ち、1級土木施工管理技士等の資格を保有しています。</p>
          <p className="mt-3 text-xs font-semibold leading-6 text-slate-600">全国約2,000か所以上は、株式会社エコループが自社の建設会社運営において入札参加資格の取得・管理体制を構築してきた発注機関数の目安です。すべての会社が同じ発注機関へ参加できることや、案件の受注・落札を保証するものではありません。</p>
        </div>
        <p className="rounded border border-slate-200 bg-white px-5 py-4 text-xs font-semibold leading-6 text-slate-600">
          本診断は、入力内容に基づく経営状況の整理を目的としたものです。売上増加、利益改善、入札参加、落札等を保証するものではありません。
        </p>
      </section>
    </div>
  );
}
