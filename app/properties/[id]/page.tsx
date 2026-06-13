import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calculator, ExternalLink, MapPin } from "lucide-react";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { formatArea, formatDate, formatPrice } from "@/lib/format";
import { getPublishedProperty } from "@/lib/properties";
import { ViewedPropertyTracker } from "@/components/ViewedPropertyTracker";

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await getPublishedProperty(id);
  if (!property) notFound();
  const propertyCategory = property.property_category ?? property.property_type;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <ViewedPropertyTracker propertyId={property.id} />
      <Link href="/properties" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700">
        <ArrowLeft className="h-4 w-4" />
        一覧に戻る
      </Link>
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
            {PROPERTY_TYPE_LABELS[propertyCategory]}
          </span>
          {property.price_yen === 0 ? (
            <span className="rounded bg-rose-100 px-2 py-1 text-xs font-bold text-rose-700">0円物件</span>
          ) : null}
          {property.price_yen <= 3000000 ? (
            <span className="rounded bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">300万円以下</span>
          ) : null}
          {property.has_updates ? (
            <span className="rounded bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700">更新あり</span>
          ) : null}
        </div>
        <h1 className="mt-3 text-2xl font-black leading-tight text-slate-950">{property.title}</h1>
        <p className="mt-4 text-4xl font-black text-brand-700">{formatPrice(property.price_yen)}</p>
        <p className="mt-3 flex items-center gap-2 text-slate-700">
          <MapPin className="h-4 w-4 text-slate-400" />
          {property.address_display}
        </p>

        <dl className="mt-6 grid gap-0 overflow-hidden rounded border border-slate-200 sm:grid-cols-2">
          {[
            ["所在地", `${property.prefecture}${property.city}`],
            ["土地面積", formatArea(property.land_area_m2)],
            ["建物面積", formatArea(property.building_area_m2)],
            ["築年", property.construction_year ? `${property.construction_year}年` : "-"],
            ["アプリ検知日", formatDate(property.first_detected_at ?? null)],
            ["元サイト掲載日", formatDate(property.source_published_at ?? property.listed_at ?? null)],
            ["最終確認日", formatDate(property.last_checked_at ?? null)],
            ["情報元", property.property_sources?.name ?? "未設定"],
            ["掲載許諾", property.publication_permission],
            ["公開状態", "公開中"]
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[8rem_1fr] border-b border-slate-200 last:border-b-0 sm:border-r">
              <dt className="bg-slate-50 px-3 py-3 text-sm font-bold text-slate-600">{label}</dt>
              <dd className="px-3 py-3 text-sm text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 rounded border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-700">元ページURL</p>
          <a href={property.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex break-all text-sm font-semibold text-brand-700 hover:underline">
            {property.source_url}
            <ExternalLink className="ml-1 h-4 w-4 shrink-0" />
          </a>
        </div>

        <div className="mt-6 rounded-lg border border-brand-200 bg-brand-50 p-4">
          <h2 className="text-lg font-black text-slate-950">購入前に必要費用を確認</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            名義変更、解体、リフォーム、残置物片付け・処分、土木工事の相談をまとめて依頼できます。
          </p>
          <Link
            href={`/estimate?propertyTitle=${encodeURIComponent(property.title)}&propertyUrl=${encodeURIComponent(property.source_url)}`}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-4 py-3 font-bold text-white focus-ring"
          >
            <Calculator className="h-4 w-4" />
            この物件で見積もり相談
          </Link>
        </div>
      </article>
    </div>
  );
}
