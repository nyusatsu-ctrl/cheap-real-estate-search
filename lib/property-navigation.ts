type SearchParamValue = string | string[] | undefined;

export type PropertyNavigationSearchParams = {
  region?: SearchParamValue;
  prefecture?: SearchParamValue;
  city?: SearchParamValue;
  propertyType?: SearchParamValue;
  priceRange?: SearchParamValue;
  sort?: SearchParamValue;
  keyword?: SearchParamValue;
  page?: SearchParamValue;
  minPrice?: SearchParamValue;
  maxPrice?: SearchParamValue;
};

const PROPERTY_SEARCH_PARAM_KEYS = [
  "region",
  "prefecture",
  "city",
  "propertyType",
  "priceRange",
  "sort",
  "keyword",
  "minPrice",
  "maxPrice"
] as const satisfies readonly (keyof PropertyNavigationSearchParams)[];
const PROPERTY_RETURN_PARAM_KEYS = [
  ...PROPERTY_SEARCH_PARAM_KEYS,
  "page"
] as const satisfies readonly (keyof PropertyNavigationSearchParams)[];

export function firstString(value: SearchParamValue) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const trimmed = typeof candidate === "string" ? candidate.trim() : "";
  return trimmed || undefined;
}

export function buildPropertySearchPath(
  params: PropertyNavigationSearchParams,
  options: { page?: number } = {}
) {
  const query = new URLSearchParams();

  PROPERTY_SEARCH_PARAM_KEYS.forEach((key) => {
    const value = firstString(params[key]);
    if (value) query.set(key, value);
  });

  const requestedPage = options.page ?? parsePositiveInteger(firstString(params.page));
  if (requestedPage && requestedPage > 1) {
    query.set("page", String(requestedPage));
  }

  const queryString = query.toString();
  return queryString ? `/properties?${queryString}` : "/properties";
}

export function getSafePropertyReturnPath(value: SearchParamValue) {
  const requestedPath = firstString(value);
  if (!requestedPath || !requestedPath.startsWith("/") || requestedPath.startsWith("//")) {
    return "/properties";
  }

  const baseUrl = "https://property-return.invalid";
  const parsed = new URL(requestedPath, baseUrl);
  if (parsed.origin !== baseUrl || parsed.pathname !== "/properties") {
    return "/properties";
  }

  const params: PropertyNavigationSearchParams = {};
  PROPERTY_RETURN_PARAM_KEYS.forEach((key) => {
    const candidate = parsed.searchParams.get(key);
    if (candidate) params[key] = candidate;
  });
  return buildPropertySearchPath(params);
}

function parsePositiveInteger(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
