import Link from "next/link";
import type { Metadata } from "next";
import { PropertyCard } from "@/components/PropertyCard";
import { SearchFilters } from "@/components/SearchFilters";
import { PROPERTY_PUBLIC_PRICE_RANGE_OPTIONS } from "@/lib/constants";
import { PROPERTY_INFORMATION_NOTICE } from "@/lib/legal";
import { firstString, normalizePropertyFilters, type PropertySearchParams } from "@/lib/property-filters";
import { getPublishedPropertiesResult, getPublishedPropertyLocations } from "@/lib/properties";

const PUBLIC_PROPERTIES_PAGE_SIZE = 100;
const PRESERVED_PAGE_PARAM_KEYS = ["region", "prefecture", "city", "propertyType", "priceRange", "sort", "keyword"] as const;

export const metadata: Metadata = {
  title: "物件一覧｜格安不動産サーチ",
  description: "全国の0円物件、空き家、古家付き土地、山林、300万円以下の格安不動産を検索できます。",
  icons: {
    icon: [{ url: "/brand/ecoloop-logo.png", type: "image/png" }],
    apple: [{ url: "/brand/ecoloop-logo.png", type: "image/png" }]
  },
  openGraph: {
    title: "物件一覧｜格安不動産サーチ",
    description: "全国の0円物件、空き家、古家付き土地、山林、300万円以下の格安不動産を検索できます。",
    siteName: "格安不動産サーチ"
  }
};

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<PropertySearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const filters = normalizePropertyFilters(resolvedSearchParams, { priceRangeOptions: PROPERTY_PUBLIC_PRICE_RANGE_OPTIONS });
  const requestedPage = getRequestedPage(resolvedSearchParams);
  const [propertiesResult, locations] = await Promise.all([
    getPublishedPropertiesResult(filters, { page: requestedPage, pageSize: PUBLIC_PROPERTIES_PAGE_SIZE }),
    getPublishedPropertyLocations()
  ]);
  const { properties, totalCount, page, pageSize, errorMessage } = propertiesResult;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

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
        <p className="text-sm font-semibold text-slate-700">{formatResultRange(totalCount, properties.length, page, pageSize)}</p>
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
      {!errorMessage && totalPages > 1 ? (
        <Pagination searchParams={resolvedSearchParams} currentPage={page} totalPages={totalPages} />
      ) : null}
    </div>
  );
}

function Pagination({
  searchParams,
  currentPage,
  totalPages
}: {
  searchParams: PropertySearchParams;
  currentPage: number;
  totalPages: number;
}) {
  const items = getPaginationItems(currentPage, totalPages);

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="物件一覧ページ">
      {currentPage > 1 ? (
        <Link href={buildPageHref(searchParams, currentPage - 1)} className={paginationLinkClass}>
          前へ
        </Link>
      ) : (
        <span className={paginationDisabledClass}>前へ</span>
      )}
      {items.map((item, index) => {
        if (item === "ellipsis") {
          return (
            <span key={`ellipsis-${index}`} className="px-2 text-sm font-semibold text-slate-400">
              ...
            </span>
          );
        }

        const isCurrent = item === currentPage;
        return isCurrent ? (
          <span key={item} aria-current="page" className={paginationCurrentClass}>
            {item}
          </span>
        ) : (
          <Link key={item} href={buildPageHref(searchParams, item)} className={paginationLinkClass}>
            {item}
          </Link>
        );
      })}
      {currentPage < totalPages ? (
        <Link href={buildPageHref(searchParams, currentPage + 1)} className={paginationLinkClass}>
          次へ
        </Link>
      ) : (
        <span className={paginationDisabledClass}>次へ</span>
      )}
    </nav>
  );
}

function getRequestedPage(params: PropertySearchParams) {
  const page = Number(firstString(params.page));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function formatResultRange(totalCount: number, itemCount: number, page: number, pageSize: number) {
  if (totalCount === 0) return "0件";
  if (itemCount === 0) return `${totalCount.toLocaleString("ja-JP")}件中 0件を表示`;

  const start = (page - 1) * pageSize + 1;
  const end = start + itemCount - 1;
  return `${totalCount.toLocaleString("ja-JP")}件中 ${start.toLocaleString("ja-JP")}〜${end.toLocaleString("ja-JP")}件を表示`;
}

function getPaginationItems(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);

  if (currentPage <= 4) {
    [2, 3, 4, 5].forEach((page) => pages.add(page));
  }

  if (currentPage >= totalPages - 3) {
    [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1].forEach((page) => pages.add(page));
  }

  const sortedPages = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  sortedPages.forEach((page, index) => {
    const previous = sortedPages[index - 1];
    if (previous && page - previous > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  });

  return items;
}

function buildPageHref(params: PropertySearchParams, page: number) {
  const query = new URLSearchParams();

  PRESERVED_PAGE_PARAM_KEYS.forEach((key) => {
    const value = firstString(params[key]);
    if (value) query.set(key, value);
  });

  if (page > 1) query.set("page", String(page));
  const queryString = query.toString();
  return queryString ? `/properties?${queryString}` : "/properties";
}

const paginationLinkClass = "inline-flex min-h-10 min-w-10 items-center justify-center rounded border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:border-brand-600 hover:text-brand-700 focus-ring";
const paginationCurrentClass = "inline-flex min-h-10 min-w-10 items-center justify-center rounded border border-brand-700 bg-brand-700 px-3 text-sm font-bold text-white";
const paginationDisabledClass = "inline-flex min-h-10 min-w-10 items-center justify-center rounded border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-400";
