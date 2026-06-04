import Link from "next/link";
import { Search } from "lucide-react";
import { PREFECTURES, PROPERTY_TYPE_LABELS } from "@/lib/constants";

type Props = {
  prefecture?: string;
  maxPrice?: string;
  propertyType?: string;
};

export function SearchFilters({ prefecture, maxPrice, propertyType }: Props) {
  const quickLinks = [
    { label: "0円物件", href: "/properties?maxPrice=0" },
    { label: "100万円以下", href: "/properties?maxPrice=1000000" },
    { label: "300万円以下", href: "/properties?maxPrice=3000000" }
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap gap-2">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded border border-brand-100 bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700 focus-ring"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <form action="/properties" className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
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
          価格上限
          <select name="maxPrice" defaultValue={maxPrice ?? ""} className="rounded border border-slate-300 bg-white px-3 py-2 focus-ring">
            <option value="">指定なし</option>
            <option value="0">0円</option>
            <option value="1000000">100万円以下</option>
            <option value="3000000">300万円以下</option>
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
      </form>
    </section>
  );
}
