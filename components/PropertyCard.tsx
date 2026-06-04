import Link from "next/link";
import { CalendarDays, Home, MapPin, Ruler } from "lucide-react";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { formatArea, formatDate, formatPrice } from "@/lib/format";
import type { Property } from "@/lib/types";

export function PropertyCard({ property }: { property: Property }) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <Link href={`/properties/${property.id}`} className="block p-4 focus-ring">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                {PROPERTY_TYPE_LABELS[property.property_type]}
              </span>
              {property.price_yen === 0 ? (
                <span className="rounded bg-rose-100 px-2 py-1 text-xs font-bold text-rose-700">0円物件</span>
              ) : null}
            </div>
            <h2 className="mt-2 text-lg font-bold leading-snug text-slate-950">{property.title}</h2>
          </div>
          <p className="shrink-0 text-right text-2xl font-black text-brand-700">{formatPrice(property.price_yen)}</p>
        </div>

        <div className="grid gap-2 text-sm text-slate-700">
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            {property.prefecture}{property.city} / {property.address_display}
          </p>
          <p className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-slate-400" />
            土地 {formatArea(property.land_area_m2)} / 建物 {formatArea(property.building_area_m2)}
          </p>
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            登録日 {formatDate(property.published_at)}
          </p>
          <p className="flex items-center gap-2">
            <Home className="h-4 w-4 text-slate-400" />
            情報元 {property.property_sources?.name ?? "未設定"}
          </p>
        </div>
      </Link>
    </article>
  );
}
