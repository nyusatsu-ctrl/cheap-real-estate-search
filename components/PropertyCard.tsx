"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, Home, MapPin, Ruler } from "lucide-react";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { formatArea, formatDate, formatPrice } from "@/lib/format";
import type { Property } from "@/lib/types";

const VIEWED_PROPERTIES_KEY = "cheap-real-estate:viewed-properties";
const NEW_DAYS = 7;

export function PropertyCard({ property }: { property: Property }) {
  const [isViewed, setIsViewed] = useState(true);
  const isNew = isRecentlyPublished(property.published_at);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsViewed(getViewedPropertyIds().has(property.id));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [property.id]);

  function markViewed() {
    const viewedIds = getViewedPropertyIds();
    viewedIds.add(property.id);
    window.localStorage.setItem(VIEWED_PROPERTIES_KEY, JSON.stringify([...viewedIds]));
    setIsViewed(true);
  }

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <Link href={`/properties/${property.id}`} onClick={markViewed} className="block p-4 focus-ring">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {!isViewed ? (
                <span className="rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">未閲覧</span>
              ) : null}
              {isNew ? (
                <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">新着</span>
              ) : null}
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

function getViewedPropertyIds() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const savedValue = window.localStorage.getItem(VIEWED_PROPERTIES_KEY);
    const savedIds = savedValue ? JSON.parse(savedValue) : [];
    return new Set<string>(Array.isArray(savedIds) ? savedIds.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function isRecentlyPublished(publishedAt: string | null) {
  if (!publishedAt) return false;

  const publishedTime = new Date(publishedAt).getTime();
  if (!Number.isFinite(publishedTime)) return false;

  const elapsedDays = (Date.now() - publishedTime) / (1000 * 60 * 60 * 24);
  return elapsedDays >= 0 && elapsedDays <= NEW_DAYS;
}
