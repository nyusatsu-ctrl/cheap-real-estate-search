import Link from "next/link";
import { ArrowRight, BadgeCheck, Search } from "lucide-react";
import { PropertyCard } from "@/components/PropertyCard";
import { getPublishedProperties } from "@/lib/properties";

export default async function HomePage() {
  const properties = await getPublishedProperties({ maxPrice: 3000000 });
  const featured = properties.slice(0, 3);

  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-[1.15fr_0.85fr] md:items-center md:py-12">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
              <BadgeCheck className="h-4 w-4" />
              0円から300万円以下の不動産に特化
            </p>
            <h1 className="text-3xl font-black leading-tight text-slate-950 md:text-5xl">
              全国の格安不動産を、条件で探しやすく。
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
              土地、古家付き土地、戸建て、倉庫、店舗などを一覧表示。MVPではサンプルデータで検索、詳細確認、管理登録の流れを確認できます。
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 font-bold text-white focus-ring">
                <Search className="h-4 w-4" />
                14日間無料で始める
              </Link>
              <Link href="/properties" className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 focus-ring">
                物件を見る
              </Link>
              <Link href="/plans" className="inline-flex items-center justify-center gap-2 rounded border border-brand-200 bg-brand-50 px-5 py-3 font-bold text-brand-700 focus-ring">
                料金を見る
              </Link>
              <Link href="/admin/properties" className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 focus-ring">
                管理画面へ
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <dl className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded bg-white p-3">
                <dt className="text-xs font-semibold text-slate-500">公開物件</dt>
                <dd className="mt-1 text-2xl font-black text-slate-950">{properties.length}</dd>
              </div>
              <div className="rounded bg-white p-3">
                <dt className="text-xs font-semibold text-slate-500">0円物件</dt>
                <dd className="mt-1 text-2xl font-black text-rose-700">{properties.filter((property) => property.price_yen === 0).length}</dd>
              </div>
              <div className="rounded bg-white p-3">
                <dt className="text-xs font-semibold text-slate-500">上限価格</dt>
                <dd className="mt-1 text-2xl font-black text-brand-700">300万</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-950">14日間無料で全機能を体験</h2>
              <p className="mt-1 text-sm text-slate-600">無料期間後は月額2,980円。物件検索、見積もり相談、業者見積管理までつなげます。</p>
            </div>
            <Link href="/plans" className="text-sm font-bold text-brand-700">
              プランを見る
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["無料体験", "14日間0円", "期間中は全機能を利用可能"],
              ["有料プラン", "月額2,980円", "詳細検索、保存、新着確認、更新チェック"],
              ["関連収益", "見積手数料", "解体・残置物・リフォーム業者から成約手数料"]
            ].map(([name, price, description]) => (
              <div key={name} className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-bold text-slate-500">{name}</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{price}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-black text-slate-950">新着物件</h2>
          <Link href="/properties" className="text-sm font-bold text-brand-700">
            すべて見る
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {featured.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </section>
    </div>
  );
}
