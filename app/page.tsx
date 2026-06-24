import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, HardHat, Route, TrendingUp } from "lucide-react";

const supportItems = [
  {
    title: "受注状況の整理",
    body: "元請・下請比率、取引先数、仕事の獲得経路から、売上アップに向けた優先課題を確認します。",
    icon: ClipboardCheck
  },
  {
    title: "公共工事参入ルート",
    body: "建設業許可、経審、全省庁統一資格、オープンカウンターなど、現在地に合う進め方を整理します。",
    icon: Route
  },
  {
    title: "経営改善サポート",
    body: "集客、利益管理、見積単価、施工事例の発信状況をもとに、エコループの活用方法を提案します。",
    icon: TrendingUp
  }
];

export default function HomePage() {
  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-14">
          <div>
            <p className="inline-flex items-center gap-2 rounded bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
              <HardHat className="h-4 w-4" />
              公共工事参入・経営改善サポート
            </p>
            <h1 className="mt-4 text-3xl font-black leading-tight text-slate-950 md:text-5xl">
              建設業売上アップ診断
            </h1>
            <p className="mt-3 text-sm font-bold text-slate-600">株式会社エコループ</p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-700">
              現在の受注状況、集客、利益管理、公共工事への参入状況などを入力すると、売上アップに向けた優先課題と、株式会社エコループのサポート活用方法を診断します。
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/diagnosis?source=direct" className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 font-bold text-white focus-ring">
                診断を始める
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/admin/login" className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 focus-ring">
                管理画面
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <Image
              src="/images/ecoloop-sales-diagnosis-logo.png"
              alt="株式会社エコループ 建設業売上アップ診断 ロゴ"
              width={1914}
              height={822}
              priority
              className="h-auto w-full rounded bg-white object-contain"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          {supportItems.map(({ title, body, icon: Icon }) => (
            <section key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <Icon className="h-6 w-6 text-brand-700" />
              <h2 className="mt-4 text-lg font-black text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-700">{body}</p>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
