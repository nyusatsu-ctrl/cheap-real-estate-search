"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { PROPERTY_PRICE_RANGE_OPTIONS, PROPERTY_REGION_OPTIONS, PROPERTY_SORT_OPTIONS, PROPERTY_TYPE_LABELS } from "@/lib/constants";
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
  locationMode?: "detailed" | "region-only";
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

  const showDetailedLocation = locationMode === "detailed";
  const prefectures = getRegionPrefectures(selectedRegion);
  const cities = getCityOptions(locations, selectedRegion, selectedPrefecture);

  return (
    <section className="rounded-lg border border-emerald-100 bg-white/95 p-3 shadow-lg shadow-emerald-900/5 backdrop-blur sm:p-5">
      <form action={action}>
        <div className={showDetailedLocation ? "grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]" : "grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]"}>
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

          {showDetailedLocation ? (
            <>
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
            </>
          ) : null}

          <label className={labelClass}>
            物件種別
            <select name="propertyType" defaultValue={propertyType ?? ""} className={controlClass}>
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
            <select name="sort" defaultValue={sort} className={controlClass}>
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
              defaultValue={keyword ?? ""}
              placeholder="空き家、山林、地域名など"
              className={controlClass}
            />
          </label>

          <button className="mt-0.5 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-700 to-brand-700 px-5 py-2.5 font-black text-white shadow-lg shadow-emerald-900/20 hover:from-emerald-800 hover:to-brand-800 focus-ring sm:min-h-12 sm:py-3 lg:mt-6">
            <Search className="h-4 w-4" />
            検索
          </button>
        </div>
      </form>
    </section>
  );
}
