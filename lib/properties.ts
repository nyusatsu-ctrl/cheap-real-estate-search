import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { sampleProperties } from "@/lib/sample-data";
import { getRegionPrefectures } from "@/lib/property-filters";
import type { Property, PropertyFilters, PropertyLocationOption, PropertySort } from "@/lib/types";

const PUBLIC_PROPERTY_LIST_SELECT = "id,title,property_type,property_category,price_yen,prefecture,city,address_display,land_area_m2,building_area_m2,construction_year,latitude,longitude,transaction_type,listed_at,source_published_at,source_updated_at,scraped_at,first_detected_at,last_checked_at,last_changed_at,has_updates,price_band,publication_permission,status,published_at,created_at,updated_at" as const;
const PUBLIC_PROPERTY_DETAIL_SELECT = `${PUBLIC_PROPERTY_LIST_SELECT},source_url` as const;

type PropertyQuery<T> = {
  eq: (column: string, value: string | number) => T;
  gte: (column: string, value: number) => T;
  lte: (column: string, value: number) => T;
  in: (column: string, values: readonly string[]) => T;
  or: (filters: string) => T;
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => T;
};

export type PublishedPropertiesResult = {
  properties: Property[];
  totalCount: number;
  page: number;
  pageSize: number;
  errorMessage: string | null;
};

export async function getPublishedProperties(filters: PropertyFilters = {}) {
  const result = await getPublishedPropertiesResult(filters);
  return result.properties;
}

export async function getPublishedPropertiesResult(filters: PropertyFilters = {}, pagination: { page?: number; pageSize?: number } = {}): Promise<PublishedPropertiesResult> {
  const startedAt = Date.now();
  const page = normalizePage(pagination.page);
  const pageSize = normalizePageSize(pagination.pageSize);
  const supabase = await createPropertyMemberReadClient();

  if (!supabase) {
    if (shouldUseSampleFallback()) {
      return getFallbackPublishedPropertiesResult(filters, page, pageSize);
    }
    return getFailedPublishedPropertiesResult(page, pageSize);
  }

  let query = supabase
    .from("properties")
    .select(PUBLIC_PROPERTY_LIST_SELECT, { count: "exact" })
    .eq("status", "published");

  query = applyServerFilters(query, filters);
  query = applyServerSort(query, filters.sort);
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) {
    logPropertyPerformance("list", startedAt, 1, 0, "error");
    logPropertyQueryError("published properties", error);
    if (shouldUseSampleFallback()) {
      return getFallbackPublishedPropertiesResult(filters, page, pageSize);
    }
    return getFailedPublishedPropertiesResult(page, pageSize);
  }

  logPropertyPerformance("list", startedAt, 1, data?.length ?? 0, "success");

  return {
    properties: sanitizePublicListProperties(sortProperties(filterProperties((data ?? []) as unknown as Property[], filters), filters.sort)),
    totalCount: count ?? 0,
    page,
    pageSize,
    errorMessage: null
  };
}

export async function getPublishedPropertyLocations() {
  return getPropertyLocations({ publishedOnly: true });
}

export async function getAdminPropertyLocations() {
  return getPropertyLocations({ publishedOnly: false });
}

async function getPropertyLocations({ publishedOnly }: { publishedOnly: boolean }): Promise<PropertyLocationOption[]> {
  const supabase = publishedOnly
    ? await createPropertyMemberReadClient()
    : await createPropertyAdminReadClient();

  if (!supabase) {
    return shouldUseSampleFallback()
      ? uniqueLocations(publishedOnly ? sampleProperties.filter((property) => property.status === "published") : sampleProperties)
      : [];
  }

  let query = supabase.from("properties").select("prefecture, city");
  if (publishedOnly) query = query.eq("status", "published");

  query = query
    .order("prefecture", { ascending: true })
    .order("city", { ascending: true })
    .range(0, 9999);

  const { data, error } = await query;
  if (error) {
    logPropertyQueryError("property locations", error);
    return shouldUseSampleFallback() ? getFallbackPropertyLocations(publishedOnly) : [];
  }

  return uniqueLocations((data ?? []) as Pick<Property, "prefecture" | "city">[]);
}

function applyServerFilters<T extends PropertyQuery<T>>(query: T, filters: PropertyFilters): T {
  let filtered = query;

  if (filters.prefecture) {
    filtered = filtered.eq("prefecture", filters.prefecture);
  } else if (filters.region) {
    filtered = filtered.in("prefecture", getRegionPrefectures(filters.region));
  }
  if (filters.city) filtered = filtered.eq("city", filters.city);
  if (filters.minPrice !== undefined) filtered = filtered.gte("price_yen", filters.minPrice);
  if (filters.maxPrice !== undefined) filtered = filtered.lte("price_yen", filters.maxPrice);
  if (filters.propertyType) {
    filtered = filtered.or(`property_category.eq.${filters.propertyType},property_type.eq.${filters.propertyType}`);
  }
  const keyword = normalizeServerKeyword(filters.keyword);
  if (keyword) {
    const likePattern = `%${keyword}%`;
    filtered = filtered.or(
      [
        `title.ilike.${likePattern}`,
        `prefecture.ilike.${likePattern}`,
        `city.ilike.${likePattern}`,
        `address_display.ilike.${likePattern}`,
        `property_type.ilike.${likePattern}`,
        `property_category.ilike.${likePattern}`
      ].join(",")
    );
  }
  return filtered;
}

export async function getPublishedProperty(id: string) {
  const startedAt = Date.now();
  const supabase = await createPropertyMemberReadClient();

  if (!supabase) {
    if (!shouldUseSampleFallback()) return null;
    const property = sampleProperties.find((candidate) => candidate.id === id && candidate.status === "published");
    return property ? sanitizePublicDetailProperty(property) : null;
  }

  const { data, error } = await supabase
    .from("properties")
    .select(PUBLIC_PROPERTY_DETAIL_SELECT)
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (error) {
    logPropertyPerformance("detail", startedAt, 1, 0, "not_found_or_error");
    return null;
  }
  logPropertyPerformance("detail", startedAt, 1, 1, "success");
  return sanitizePublicDetailProperty(data as unknown as Property);
}

export async function getAdminProperties(filters: PropertyFilters = {}) {
  const supabase = await createPropertyAdminReadClient();
  if (!supabase) return shouldUseSampleFallback() ? sortProperties(filterProperties(sampleProperties, filters), filters.sort) : [];

  let { data, error } = await fetchAdminProperties(supabase, filters, { includeSources: true });
  if (error && isOptionalSourceRelationError(error)) {
    ({ data, error } = await fetchAdminProperties(supabase, filters, { includeSources: false }));
  }
  if (error) {
    logPropertyQueryError("admin properties", error);
    return shouldUseSampleFallback() ? sortProperties(filterProperties(sampleProperties, filters), filters.sort) : [];
  }
  return sortProperties(filterProperties((data ?? []) as unknown as Property[], filters), filters.sort);
}

export async function getAdminProperty(id: string) {
  const supabase = await createPropertyAdminReadClient();
  if (!supabase) return shouldUseSampleFallback() ? sampleProperties.find((property) => property.id === id) ?? null : null;

  let { data, error } = await supabase
    .from("properties")
    .select("*, property_sources(name, website_url)")
    .eq("id", id)
    .single();

  if (error && isOptionalSourceRelationError(error)) {
    ({ data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("id", id)
      .single());
  }

  if (error) return null;
  return data as Property;
}

async function createPropertyMemberReadClient() {
  return createSupabaseServerClient();
}

async function createPropertyAdminReadClient() {
  return createSupabaseServiceRoleClient() ?? await createSupabaseServerClient();
}

async function fetchAdminProperties(
  supabase: NonNullable<Awaited<ReturnType<typeof createPropertyAdminReadClient>>>,
  filters: PropertyFilters,
  { includeSources }: { includeSources: boolean }
) {
  let query = supabase
    .from("properties")
    .select(includeSources ? "*, property_sources(name, website_url)" : "*");

  query = applyServerFilters(query, filters);
  query = applyServerSort(query, filters.sort);

  return query;
}

function isOptionalSourceRelationError(error: { message?: string }) {
  return /property_sources|relationship|schema cache/i.test(error.message ?? "");
}

function filterProperties(properties: Property[], filters: PropertyFilters) {
  const keyword = filters.keyword?.toLowerCase();

  return properties.filter((property) => {
    if (filters.region && !getRegionPrefectures(filters.region).includes(property.prefecture)) return false;
    if (filters.prefecture && property.prefecture !== filters.prefecture) return false;
    if (filters.city && property.city !== filters.city) return false;
    if (filters.minPrice !== undefined && property.price_yen < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && property.price_yen > filters.maxPrice) return false;
    if (filters.propertyType && getPropertyCategory(property) !== filters.propertyType && property.property_type !== filters.propertyType) return false;
    if (keyword && !matchesKeyword(property, keyword)) return false;
    return true;
  });
}

function getFallbackPublishedProperties(filters: PropertyFilters) {
  return sanitizePublicListProperties(sortProperties(filterProperties(sampleProperties.filter((property) => property.status === "published"), filters), filters.sort));
}

function getFallbackPublishedPropertiesResult(filters: PropertyFilters, page: number, pageSize: number): PublishedPropertiesResult {
  const properties = getFallbackPublishedProperties(filters);
  return {
    properties: properties.slice((page - 1) * pageSize, page * pageSize),
    totalCount: properties.length,
    page,
    pageSize,
    errorMessage: null
  };
}

function getFailedPublishedPropertiesResult(page: number, pageSize: number): PublishedPropertiesResult {
  return {
    properties: [],
    totalCount: 0,
    page,
    pageSize,
    errorMessage: "物件情報を取得できませんでした。時間をおいて再度お試しください。"
  };
}

function getFallbackPropertyLocations(publishedOnly: boolean) {
  return uniqueLocations(publishedOnly ? sampleProperties.filter((property) => property.status === "published") : sampleProperties);
}

function logPropertyQueryError(scope: string, error: { message?: string }) {
  console.error(`[properties] Failed to load ${scope}: ${error.message ?? "unknown error"}`);
}

function logPropertyPerformance(
  scope: "list" | "detail",
  startedAt: number,
  queryCount: number,
  rowCount: number,
  outcome: string
) {
  console.info("[property-performance] property query completed", {
    scope,
    durationMs: Date.now() - startedAt,
    queryCount,
    rowCount,
    outcome
  });
}

function shouldUseSampleFallback() {
  return process.env.NODE_ENV !== "production";
}

function normalizePage(value?: number) {
  return Number.isInteger(value) && value && value > 0 ? value : 1;
}

function normalizePageSize(value?: number) {
  if (!Number.isInteger(value) || !value || value < 1) return 100;
  return Math.min(value, 100);
}

function normalizeServerKeyword(value?: string) {
  return value
    ?.replace(/[%,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPropertyCategory(property: Property) {
  return property.property_category ?? property.property_type;
}

function matchesKeyword(property: Property, keyword: string) {
  return [
    property.title,
    property.prefecture,
    property.city,
    property.address_display,
    getPropertyCategory(property)
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(keyword));
}

function applyServerSort<T extends PropertyQuery<T>>(query: T, sort: PropertySort = "newest"): T {
  if (sort === "source-newest") {
    return applyNewestTieBreakers(query.order("source_published_at", { ascending: false, nullsFirst: false }), { includeSourcePublishedAt: false });
  }

  if (sort === "price-asc") {
    return applyNewestTieBreakers(query.order("price_yen", { ascending: true, nullsFirst: false }));
  }

  if (sort === "price-desc") {
    return applyNewestTieBreakers(query.order("price_yen", { ascending: false, nullsFirst: false }));
  }

  return applyNewestTieBreakers(query);
}

function applyNewestTieBreakers<T extends PropertyQuery<T>>(query: T, options: { includeSourcePublishedAt?: boolean } = {}): T {
  const includeSourcePublishedAt = options.includeSourcePublishedAt ?? true;
  let sorted = query.order("first_detected_at", { ascending: false, nullsFirst: false });
  if (includeSourcePublishedAt) {
    sorted = sorted.order("source_published_at", { ascending: false, nullsFirst: false });
  }
  return sorted
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false });
}

function sortProperties(properties: Property[], sort: PropertySort = "newest") {
  return [...properties].sort((a, b) => compareProperties(a, b, sort));
}

function compareProperties(a: Property, b: Property, sort: PropertySort) {
  if (sort === "source-newest") {
    return compareDateDesc(a.source_published_at, b.source_published_at)
      || compareNewest(a, b, { includeSourcePublishedAt: false });
  }

  if (sort === "price-asc") {
    return compareNumberAsc(a.price_yen, b.price_yen) || compareNewest(a, b);
  }

  if (sort === "price-desc") {
    return compareNumberDesc(a.price_yen, b.price_yen) || compareNewest(a, b);
  }

  return compareNewest(a, b);
}

function compareNewest(a: Property, b: Property, options: { includeSourcePublishedAt?: boolean } = {}) {
  const includeSourcePublishedAt = options.includeSourcePublishedAt ?? true;
  return compareDateDesc(a.first_detected_at, b.first_detected_at)
    || (includeSourcePublishedAt ? compareDateDesc(a.source_published_at, b.source_published_at) : 0)
    || compareDateDesc(a.updated_at, b.updated_at)
    || compareDateDesc(a.created_at, b.created_at);
}

function compareDateDesc(a?: string | null, b?: string | null) {
  return toTime(b) - toTime(a);
}

function compareNumberAsc(a: number, b: number) {
  return a - b;
}

function compareNumberDesc(a: number, b: number) {
  return b - a;
}

function toTime(value?: string | null) {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
}

function sanitizePublicListProperties(properties: Property[]) {
  return properties.map((property) => sanitizePublicProperty(property, { keepSourceUrl: false }));
}

function sanitizePublicDetailProperty(property: Property) {
  return sanitizePublicProperty(property, { keepSourceUrl: true });
}

function sanitizePublicProperty(property: Property, { keepSourceUrl }: { keepSourceUrl: boolean }): Property {
  return {
    id: property.id,
    title: property.title,
    property_type: property.property_type,
    property_category: property.property_category ?? null,
    price_yen: property.price_yen,
    prefecture: property.prefecture,
    city: property.city,
    address_display: property.address_display,
    land_area_m2: property.land_area_m2,
    building_area_m2: property.building_area_m2,
    construction_year: property.construction_year,
    latitude: property.latitude,
    longitude: property.longitude,
    source_id: null,
    source_url: keepSourceUrl ? property.source_url : "",
    transaction_type: property.transaction_type ?? null,
    listed_at: property.listed_at ?? null,
    source_published_at: property.source_published_at ?? null,
    source_updated_at: property.source_updated_at ?? null,
    scraped_at: property.scraped_at ?? null,
    first_detected_at: property.first_detected_at ?? null,
    last_checked_at: property.last_checked_at ?? null,
    last_changed_at: property.last_changed_at ?? null,
    has_updates: property.has_updates ?? false,
    previous_snapshot_hash: null,
    price_band: property.price_band ?? null,
    risk_tags: [],
    remarks: null,
    publication_permission: property.publication_permission,
    status: property.status,
    published_at: property.published_at,
    created_at: property.created_at ?? null,
    updated_at: property.updated_at,
    property_sources: null,
    property_images: []
  };
}

function uniqueLocations(properties: Pick<Property, "prefecture" | "city">[]) {
  const seen = new Set<string>();
  const locations: PropertyLocationOption[] = [];

  for (const property of properties) {
    if (!property.prefecture || !property.city) continue;
    const key = `${property.prefecture}\n${property.city}`;
    if (seen.has(key)) continue;
    seen.add(key);
    locations.push({ prefecture: property.prefecture, city: property.city });
  }

  return locations.sort((a, b) => `${a.prefecture}${a.city}`.localeCompare(`${b.prefecture}${b.city}`, "ja"));
}
