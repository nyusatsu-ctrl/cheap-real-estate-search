import { PropertyCard } from "@/components/PropertyCard";
import { SearchFilters } from "@/components/SearchFilters";
import { PROPERTY_PUBLIC_PRICE_RANGE_OPTIONS } from "@/lib/constants";
import { PROPERTY_INFORMATION_NOTICE } from "@/lib/legal";
import { normalizePropertyFilters, type PropertySearchParams } from "@/lib/property-filters";
import { getPublishedPropertiesResult, getPublishedPropertyLocations } from "@/lib/properties";

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<PropertySearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const filters = normalizePropertyFilters(resolvedSearchParams, { priceRangeOptions: PROPERTY_PUBLIC_PRICE_RANGE_OPTIONS });
  const [propertiesResult, locations] = await Promise.all([getPublishedPropertiesResult(filters), getPublishedPropertyLocations()]);
  const { properties, errorMessage } = propertiesResult;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-black text-slate-950">物件一覧</h1>
        <p className="mt-1 text-sm text-slate-600">公開中の物件のみ表示しています。</p>
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          {PROPERTY_INFORMATION_NOTICE}
        </p>
      </div>
      <SearchFilters
        locations={locations}
        region={filters.region}
        prefecture={filters.prefecture}
        city={filters.city}
        priceRange={filters.priceRange}
        priceRangeOptions={PROPERTY_PUBLIC_PRICE_RANGE_OPTIONS}
        propertyType={filters.propertyType}
        sort={filters.sort}
        keyword={filters.keyword}
      />
      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{properties.length}件</p>
      </div>
      {errorMessage ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {errorMessage}
        </div>
      ) : null}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
      {properties.length === 0 && !errorMessage ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          条件に一致する公開物件はありません。
        </div>
      ) : null}
    </div>
  );
}
