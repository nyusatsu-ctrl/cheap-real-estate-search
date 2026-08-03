"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { PREFECTURES, PROPERTY_PRICE_RANGE_OPTIONS, PROPERTY_REGION_OPTIONS, PROPERTY_SORT_OPTIONS, PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { getCityOptions, getRegionPrefectures } from "@/lib/property-filters";
import type { PropertyLocationOption, PropertySort } from "@/lib/types";

type PriceRangeOption = {
  value: string;
  label: string;
};

type Props = {
  action?: string;
  locations: PropertyLocationOption[];
  region?: string;
  prefecture?: string;
  city?: string;
  priceRange?: string;
  priceRangeOptions?: readonly PriceRangeOption[];
  propertyType?: string;
  sort?: PropertySort;
  keyword?: string;
  locationMode?: "detailed" | "region-only" | "prefecture-only";
  regionLabel?: string;
};

const labelClass = "grid gap-1 text-sm font-black text-slate-700 sm:gap-1.5";
const controlClass = "min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-inner shadow-slate-100 focus-ring sm:min-h-12 sm:py-2.5";

export function SearchFilters({
  action = "/properties",
  locations,
  region,
  prefecture,
  city,
  priceRange,
  priceRangeOptions = PROPERTY_PRICE_RANGE_OPTIONS,
  propertyType,
  sort = "newest",
  keyword,
  locationMode = "detailed",
  regionLabel = "地方ブロック"
}: Props) {
  const [selectedRegion, setSelectedRegion] = useState(region ?? "");
  const [selectedPrefecture, setSelectedPrefecture] = useState(prefecture ?? "");
  const [selectedCity, setSelectedCity] = useState(city ?? "");
  const [selectedPriceRange, setSelectedPriceRange] = useState(priceRange ?? "");
  const [selectedPropertyType, setSelectedPropertyType] = useState(propertyType ?? "");
  const [selectedSort, setSelectedSort] = useState<PropertySort>(sort);
  const [selectedKeyword, setSelectedKeyword] = useState(keyword ?? "");
  const [isSearching, setIsSearching] = useState(false);
  const [, forceFilterRestore] = useState(0);

  useEffect(() => {
    function restoreFiltersFromUrl() {
      const params = new URLSearchParams(window.location.search);
      setSelectedRegion(params.get("region") ?? "");
      setSelectedPrefecture(params.get("prefecture") ?? "");
      setSelectedCity(params.get("city") ?? "");
      setSelectedPriceRange(params.get("priceRange") ?? "");
      setSelectedPropertyType(params.get("propertyType") ?? "");
      setSelectedSort(normalizeSort(params.get("sort")));
      setSelectedKeyword(params.get("keyword") ?? "");
      setIsSearching(false);
      forceFilterRestore((version) => version + 1);
    }

    function scheduleFilterRestore() {
      window.setTimeout(restoreFiltersFromUrl, 0);
    }

    window.addEventListener("popstate", scheduleFilterRestore);
    window.addEventListener("pageshow", scheduleFilterRestore);
    return () => {
      window.removeEventListener("popstate", scheduleFilterRestore);
      window.removeEventListener("pageshow", scheduleFilterRestore);
    };
  }, []);

  const showDetailedLocation = locationMode === "detailed";
  const showRegionLocation = locationMode === "detailed" || locationMode === "region-only";
  const showPrefectureLocation = locationMode === "detailed" || locationMode === "prefecture-only";
  const prefectures = locationMode === "prefecture-only" ? PREFECTURES : getRegionPrefectures(selectedRegion);
  const cities = getCityOptions(locations, selectedRegion, selectedPrefecture);

  return (
    <section className="rounded-lg border border-emerald-100 bg-white/95 p-3 shadow-lg shadow-emerald-900/5 backdrop-blur sm:p-5">
      <form action={action} autoComplete="off" aria-busy={isSearching} onSubmit={() => setIsSearching(true)}>
        <div className={showDetailedLocation ? "grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]" : "grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]"}>
          {showRegionLocation ? (
            <label className={labelClass}>
              {regionLabel}
              <select
                name="region"
                value={selectedRegion}
                onChange={(event) => {
                  setSelectedRegion(event.target.value);
                  setSelectedPrefecture("");
                  setSelectedCity("");
                }}
                className={controlClass}
              >
                <option value="">全国</option>
                {PROPERTY_REGION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {showPrefectureLocation ? (
            <label className={labelClass}>
              都道府県
              <select
                name="prefecture"
                value={selectedPrefecture}
                onChange={(event) => {
                  setSelectedPrefecture(event.target.value);
                  setSelectedCity("");
                }}
                className={controlClass}
              >
                <option value="">全国</option>
                {prefectures.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {showDetailedLocation ? (
            <label className={labelClass}>
              市区町村
              <select
                name="city"
                value={selectedCity}
                onChange={(event) => setSelectedCity(event.target.value)}
                className={controlClass}
              >
                <option value="">すべて</option>
                {cities.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className={labelClass}>
            物件種別
            <select name="propertyType" value={selectedPropertyType} onChange={(event) => setSelectedPropertyType(event.target.value)} className={controlClass}>
              <option value="">すべて</option>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            価格帯
            <select
              name="priceRange"
              value={selectedPriceRange}
              onChange={(event) => setSelectedPriceRange(event.target.value)}
              className={controlClass}
            >
              <option value="">指定なし</option>
              {priceRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            並び順
            <select name="sort" value={selectedSort} onChange={(event) => setSelectedSort(event.target.value as PropertySort)} className={controlClass}>
              {PROPERTY_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={showDetailedLocation ? `${labelClass} md:col-span-2 lg:col-span-5` : `${labelClass} md:col-span-2 lg:col-span-4`}>
            キーワード
            <input
              name="keyword"
              value={selectedKeyword}
              onChange={(event) => setSelectedKeyword(event.target.value)}
              placeholder="空き家、山林、地域名など"
              className={controlClass}
            />
          </label>

          <button
            type="submit"
            disabled={isSearching}
            className="mt-0.5 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-700 to-brand-700 px-5 py-2.5 font-black text-white shadow-lg shadow-emerald-900/20 hover:from-emerald-800 hover:to-brand-800 disabled:cursor-wait disabled:opacity-70 focus-ring sm:min-h-12 sm:py-3 lg:mt-6"
          >
            {isSearching ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
            {isSearching ? "検索中…" : "検索"}
          </button>
        </div>
        <span className="sr-only" aria-live="polite">
          {isSearching ? "検索条件を適用しています" : ""}
        </span>
      </form>
    </section>
  );
}

function normalizeSort(value: string | null): PropertySort {
  if (value === "source-newest" || value === "price-asc" || value === "price-desc") return value;
  return "newest";
}
