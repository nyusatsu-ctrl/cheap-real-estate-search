import { PREFECTURES, PROPERTY_PRICE_RANGE_OPTIONS, PROPERTY_REGION_OPTIONS } from "@/lib/constants";
import type { PropertyCategory, PropertyFilters, PropertyLocationOption, PropertySort } from "@/lib/types";

type SearchParamValue = string | string[] | undefined;
type PriceRangeOption = {
  value: string;
  minPrice?: number;
  maxPrice?: number;
};

export type PropertySearchParams = {
  region?: SearchParamValue;
  prefecture?: SearchParamValue;
  city?: SearchParamValue;
  propertyType?: SearchParamValue;
  priceRange?: SearchParamValue;
  sort?: SearchParamValue;
  keyword?: SearchParamValue;
  minPrice?: SearchParamValue;
  maxPrice?: SearchParamValue;
};

export function normalizePropertyFilters(params: PropertySearchParams, options: { priceRangeOptions?: readonly PriceRangeOption[] } = {}): PropertyFilters {
  const priceRangeOptions = options.priceRangeOptions ?? PROPERTY_PRICE_RANGE_OPTIONS;
  const requestedPriceRange = firstString(params.priceRange);
  const priceBounds = getPriceRangeBounds(requestedPriceRange, priceRangeOptions);
  const priceRange = priceBounds.option ? requestedPriceRange : undefined;
  const minPrice = priceBounds.minPrice ?? parseOptionalNumber(firstString(params.minPrice));
  const maxPrice = priceBounds.maxPrice ?? parseOptionalNumber(firstString(params.maxPrice));

  return {
    region: firstString(params.region),
    prefecture: firstString(params.prefecture),
    city: firstString(params.city),
    propertyType: firstString(params.propertyType) as PropertyCategory | undefined,
    priceRange,
    sort: normalizePropertySort(firstString(params.sort)),
    keyword: firstString(params.keyword),
    minPrice,
    maxPrice
  };
}

export function getRegionPrefectures(region?: string): string[] {
  if (!region) return PREFECTURES;
  const prefectures = PROPERTY_REGION_OPTIONS.find((option) => option.value === region)?.prefectures;
  return prefectures ? [...prefectures] : PREFECTURES;
}

export function getPriceRangeBounds(priceRange?: string, options: readonly PriceRangeOption[] = PROPERTY_PRICE_RANGE_OPTIONS) {
  const option = options.find((candidate) => candidate.value === priceRange);
  return {
    option,
    minPrice: option?.minPrice,
    maxPrice: option?.maxPrice
  };
}

export function getCityOptions(locations: PropertyLocationOption[], region?: string, prefecture?: string) {
  const regionPrefectures = new Set(getRegionPrefectures(region));

  return [
    ...new Set(
      locations
        .filter((location) => !region || regionPrefectures.has(location.prefecture))
        .filter((location) => !prefecture || location.prefecture === prefecture)
        .map((location) => location.city)
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b, "ja"));
}

export function firstString(value: SearchParamValue) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const trimmed = typeof candidate === "string" ? candidate.trim() : "";
  return trimmed || undefined;
}

function parseOptionalNumber(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizePropertySort(value?: string): PropertySort {
  if (value === "source-newest" || value === "price-asc" || value === "price-desc") return value;
  return "newest";
}
