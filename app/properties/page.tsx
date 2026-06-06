import { PropertyCard } from "@/components/PropertyCard";
import { SearchFilters } from "@/components/SearchFilters";
import { getPublishedProperties } from "@/lib/properties";
import type { PropertyType } from "@/lib/types";

type SearchParams = {
  prefecture?: string;
  minPrice?: string;
  maxPrice?: string;
  propertyType?: string;
};

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const minPrice = resolvedSearchParams.minPrice ? Number(resolvedSearchParams.minPrice) : undefined;
  const maxPrice = resolvedSearchParams.maxPrice ? Number(resolvedSearchParams.maxPrice) : undefined;
  const properties = await getPublishedProperties({
    prefecture: resolvedSearchParams.prefecture || undefined,
    minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
    propertyType: (resolvedSearchParams.propertyType || undefined) as PropertyType | undefined
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-black text-slate-950">物件一覧</h1>
        <p className="mt-1 text-sm text-slate-600">公開中の物件のみ表示しています。</p>
      </div>
      <SearchFilters {...resolvedSearchParams} />
      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{properties.length}件</p>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
      {properties.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          条件に一致する公開物件はありません。
        </div>
      ) : null}
    </div>
  );
}
