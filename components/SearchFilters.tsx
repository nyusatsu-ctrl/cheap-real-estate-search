"use client";

import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { PROPERTY_PRICE_RANGE_OPTIONS, PROPERTY_REGION_OPTIONS, PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { getCityOptions, getRegionPrefectures } from "@/lib/property-filters";
import type { PropertyLocationOption } from "@/lib/types";

type Props = {
  action?: string;
  locations: PropertyLocationOption[];
  region?: string;
  prefecture?: string;
  city?: string;
  priceRange?: string;
  propertyType?: string;
  keyword?: string;
};

export function SearchFilters({ action = "/properties", locations, region, prefecture, city, priceRange, propertyType, keyword }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedRegion, setSelectedRegion] = useState(region ?? "");
  const [selectedPrefecture, setSelectedPrefecture] = useState(prefecture ?? "");
  const [selectedCity, setSelectedCity] = useState(city ?? "");
  const [selectedPriceRange, setSelectedPriceRange] = useState(priceRange ?? "");

  const priceButtons = [
    { label: "0円物件", value: "zero" },
    { label: "300万円以下", value: "under300" }
  ];
  const prefectures = getRegionPrefectures(selectedRegion);
  const cities = getCityOptions(locations, selectedRegion, selectedPrefecture);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <form ref={formRef} action={action}>
        <div className="mb-4 flex flex-wrap gap-2">
          {priceButtons.map((button) => {
            const isSelected = selectedPriceRange === button.value;

            return (
              <button
                key={button.label}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  setSelectedPriceRange(button.value);
                  window.requestAnimationFrame(() => formRef.current?.requestSubmit());
                }}
                className={`rounded border px-3 py-2 text-sm font-bold focus-ring ${
                  isSelected
                    ? "border-brand-600 bg-brand-50 text-brand-800 ring-2 ring-brand-600"
                    : "border-brand-100 bg-brand-50 text-brand-700"
                }`}
              >
                {button.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            地方ブロック
            <select
              name="region"
              value={selectedRegion}
              onChange={(event) => {
                setSelectedRegion(event.target.value);
                setSelectedPrefecture("");
                setSelectedCity("");
              }}
              className="rounded border border-slate-300 bg-white px-3 py-2 focus-ring"
            >
              <option value="">全国</option>
              {PROPERTY_REGION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            都道府県
            <select
              name="prefecture"
              value={selectedPrefecture}
              onChange={(event) => {
                setSelectedPrefecture(event.target.value);
                setSelectedCity("");
              }}
              className="rounded border border-slate-300 bg-white px-3 py-2 focus-ring"
            >
              <option value="">全国</option>
              {prefectures.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            市区町村
            <select
              name="city"
              value={selectedCity}
              onChange={(event) => setSelectedCity(event.target.value)}
              className="rounded border border-slate-300 bg-white px-3 py-2 focus-ring"
            >
              <option value="">すべて</option>
              {cities.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            物件種別
            <select name="propertyType" defaultValue={propertyType ?? ""} className="rounded border border-slate-300 bg-white px-3 py-2 focus-ring">
              <option value="">すべて</option>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            価格帯
            <select
              name="priceRange"
              value={selectedPriceRange}
              onChange={(event) => setSelectedPriceRange(event.target.value)}
              className="rounded border border-slate-300 bg-white px-3 py-2 focus-ring"
            >
              <option value="">指定なし</option>
              {PROPERTY_PRICE_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2 lg:col-span-4">
            キーワード
            <input
              name="keyword"
              defaultValue={keyword ?? ""}
              placeholder="空き家、山林、市区町村、元サイト名など"
              className="rounded border border-slate-300 bg-white px-3 py-2 focus-ring"
            />
          </label>

          <button className="mt-1 flex items-center justify-center gap-2 rounded bg-brand-700 px-4 py-2 font-bold text-white focus-ring lg:mt-6">
            <Search className="h-4 w-4" />
            検索
          </button>
        </div>
      </form>
    </section>
  );
}
