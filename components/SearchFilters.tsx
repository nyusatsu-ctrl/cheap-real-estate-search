"use client";

import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { PREFECTURES, PROPERTY_TYPE_LABELS } from "@/lib/constants";

type Props = {
  prefecture?: string;
  minPrice?: string;
  maxPrice?: string;
  propertyType?: string;
};

export function SearchFilters({ prefecture, minPrice, maxPrice, propertyType }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedMinPrice, setSelectedMinPrice] = useState(minPrice ?? "");
  const [selectedMaxPrice, setSelectedMaxPrice] = useState(maxPrice ?? "");

  const priceButtons = [
    { label: "0円物件", minPrice: "", maxPrice: "0" },
    { label: "100万円以下", minPrice: "", maxPrice: "1000000" },
    { label: "300万円以下", minPrice: "", maxPrice: "3000000" },
    { label: "500万円以下", minPrice: "", maxPrice: "5000000" },
    { label: "1000万円以下", minPrice: "", maxPrice: "10000000" },
    { label: "1000万円以上3000万円以下", minPrice: "10000000", maxPrice: "30000000" }
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <form ref={formRef} action="/properties">
        <input type="hidden" name="minPrice" value={selectedMinPrice} />
        <input type="hidden" name="maxPrice" value={selectedMaxPrice} />

        <div className="mb-4 flex flex-wrap gap-2">
          {priceButtons.map((button) => {
            const isSelected = selectedMinPrice === button.minPrice && selectedMaxPrice === button.maxPrice;

            return (
              <button
                key={button.label}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  setSelectedMinPrice(button.minPrice);
                  setSelectedMaxPrice(button.maxPrice);
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

        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            都道府県
            <select name="prefecture" defaultValue={prefecture ?? ""} className="rounded border border-slate-300 bg-white px-3 py-2 focus-ring">
              <option value="">全国</option>
              {PREFECTURES.map((name) => (
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

          <button className="mt-1 flex items-center justify-center gap-2 rounded bg-brand-700 px-4 py-2 font-bold text-white focus-ring md:mt-6">
            <Search className="h-4 w-4" />
            検索
          </button>
        </div>
      </form>
    </section>
  );
}
