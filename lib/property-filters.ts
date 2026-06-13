import { PREFECTURES, PROPERTY_PRICE_RANGE_OPTIONS, PROPERTY_REGION_OPTIONS } from "@/lib/constants";
import type { PropertyCategory, PropertyFilters, PropertyLocationOption } from "@/lib/types";

type SearchParamValue = string | string[] | undefined;

export type PropertySearchParams = {
  region?: SearchParamValue;
  prefecture?: SearchParamValue;
  city?: SearchParamValue;
  propertyType?: SearchParamValue;
  priceRange?: SearchParamValue;
  keyword?: SearchParamValue;
  minPrice?: SearchParamValue;
  maxPrice?: SearchParamValue;
};

export function normalizePropertyFilters(params: PropertySearchParams): PropertyFilters {
  const priceRange = firstString(params.priceRange);
  const priceBounds = getPriceRangeBounds(priceRange);
  const minPrice = priceBounds.minPrice ?? parseOptionalNumber(firstString(params.minPrice));
  const maxPrice = priceBounds.maxPrice ?? parseOptionalNumber(firstString(params.maxPrice));

  return {
    region: firstString(params.region),
    prefecture: firstString(params.prefecture),
    city: firstString(params.city),
    propertyType: firstString(params.propertyType) as PropertyCategory | undefined,
    priceRange,
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

export function getPriceRangeBounds(priceRange?: string) {
  const option = PROPERTY_PRICE_RANGE_OPTIONS.find((candidate) => candidate.value === priceRange);
  return {
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
