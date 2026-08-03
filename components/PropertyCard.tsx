"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Ruler } from "lucide-react";
import { PROPERTY_SCROLL_KEY_PREFIX } from "@/components/PropertyScrollRestorer";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { formatArea, formatPrice } from "@/lib/format";
import type { Property } from "@/lib/types";

const VIEWED_PROPERTIES_KEY = "cheap-real-estate:viewed-properties";
const NEW_DAYS = 7;
const badgeBaseClass = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold leading-none";
const propertyCardDateFormatter = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" });
const tokyoDateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});
let viewedPropertyIdsCache: Set<string> | null = null;

export function PropertyCard({ property, returnPath = "/properties" }: { property: Property; returnPath?: string }) {
  const [isViewed, setIsViewed] = useState(true);
  const isTodayAdded = isTodayInTokyo(property.first_detected_at ?? property.scraped_at ?? null);
  const isNew = isWithinDays(property.first_detected_at, NEW_DAYS);
  const isSourceNew = isWithinDays(property.source_published_at ?? property.listed_at ?? null, NEW_DAYS);
  const propertyCategory = property.property_category ?? property.property_type;

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
    try {
      window.sessionStorage.setItem(`${PROPERTY_SCROLL_KEY_PREFIX}${returnPath}`, String(window.scrollY));
    } catch {
      // The detail link remains usable when browser storage is unavailable.
    }
    setIsViewed(true);
  }

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-lg shadow-slate-900/5 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/10">
      <Link href={getPropertyDetailHref(property.id, returnPath)} onClick={markViewed} className="block p-4 focus-ring sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {!isViewed ? (
                <span className={`${badgeBaseClass} bg-amber-100 text-amber-800`}>未閲覧</span>
              ) : null}
              {isNew ? (
                <span className={`${badgeBaseClass} bg-emerald-100 text-emerald-700`}>新着</span>
              ) : null}
              {isTodayAdded ? (
                <span className={`${badgeBaseClass} bg-orange-100 font-black text-orange-800 ring-1 ring-orange-200`}>本日新着</span>
              ) : null}
              {property.has_updates ? (
                <span className={`${badgeBaseClass} bg-violet-100 text-violet-700`}>更新あり</span>
              ) : null}
              {isSourceNew ? (
                <span className={`${badgeBaseClass} bg-teal-100 text-teal-700`}>元サイト新着</span>
              ) : null}
              <span className={`${badgeBaseClass} bg-slate-100 font-semibold text-slate-700`}>
                {PROPERTY_TYPE_LABELS[propertyCategory]}
              </span>
              {property.price_yen === 0 ? (
                <span className={`${badgeBaseClass} bg-rose-100 text-rose-700`}>0円物件</span>
              ) : null}
              {property.price_yen <= 3000000 ? (
                <span className={`${badgeBaseClass} bg-blue-100 text-blue-700`}>300万円以下</span>
              ) : null}
            </div>
            <h2 className="mt-3 text-lg font-black leading-7 text-slate-950 sm:text-xl">{property.title}</h2>
          </div>
          <p className="inline-flex shrink-0 self-start rounded-lg bg-gradient-to-br from-brand-700 to-emerald-700 px-4 py-2 text-xl font-black leading-none text-white shadow-md shadow-emerald-900/20 sm:text-2xl">
            {formatPrice(property.price_yen)}
          </p>
        </div>

        <div className="grid gap-2 rounded-lg bg-slate-50/90 p-3 text-sm font-medium text-slate-700">
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            {property.prefecture}{property.city} / {property.address_display}
          </p>
          <p className="flex items-start gap-2">
            <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
            土地 {formatArea(property.land_area_m2)} / 建物 {formatArea(property.building_area_m2)}
          </p>
          <p className="flex items-start gap-2">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            検知日 {formatPropertyCardDate(property.first_detected_at ?? null)}
          </p>
          {property.source_published_at || property.listed_at ? (
            <p className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              元サイト掲載日 {formatPropertyCardDate(property.source_published_at ?? property.listed_at ?? null)}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}

function getPropertyDetailHref(propertyId: string, returnPath: string) {
  const query = new URLSearchParams({ returnTo: returnPath });
  return `/properties/${propertyId}?${query.toString()}`;
}

function getViewedPropertyIds() {
  if (typeof window === "undefined") return new Set<string>();
  if (viewedPropertyIdsCache) return viewedPropertyIdsCache;

  try {
    const savedValue = window.localStorage.getItem(VIEWED_PROPERTIES_KEY);
    const savedIds = savedValue ? JSON.parse(savedValue) : [];
    viewedPropertyIdsCache = new Set<string>(Array.isArray(savedIds) ? savedIds.filter((id) => typeof id === "string") : []);
  } catch {
    viewedPropertyIdsCache = new Set<string>();
  }
  return viewedPropertyIdsCache;
}

function isWithinDays(value: string | null | undefined, days: number) {
  if (!value) return false;

  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return false;

  const elapsedDays = (Date.now() - time) / (1000 * 60 * 60 * 24);
  return elapsedDays >= 0 && elapsedDays <= days;
}

function isTodayInTokyo(value: string | null | undefined) {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  return toTokyoDateKey(date) === toTokyoDateKey(new Date());
}

function toTokyoDateKey(date: Date) {
  return tokyoDateKeyFormatter.format(date);
}

function formatPropertyCardDate(value: string | null) {
  if (!value) return "-";
  return propertyCardDateFormatter.format(new Date(value));
}
