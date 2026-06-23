import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { sampleProperties } from "@/lib/sample-data";
import { getRegionPrefectures } from "@/lib/property-filters";
import type { Property, PropertyFilters, PropertyLocationOption, PropertySort } from "@/lib/types";

type PropertyQuery<T> = {
  eq: (column: string, value: string | number) => T;
  gte: (column: string, value: number) => T;
  lte: (column: string, value: number) => T;
  in: (column: string, values: readonly string[]) => T;
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => T;
};

export type PublishedPropertiesResult = {
  properties: Property[];
  errorMessage: string | null;
};

export async function getPublishedProperties(filters: PropertyFilters = {}) {
  const result = await getPublishedPropertiesResult(filters);
  return result.properties;
}

export async function getPublishedPropertiesResult(filters: PropertyFilters = {}): Promise<PublishedPropertiesResult> {
  const supabase = await createPropertyReadClient();

  if (!supabase) {
    if (shouldUseSampleFallback()) {
      return { properties: getFallbackPublishedProperties(filters), errorMessage: null };
    }
    return { properties: [], errorMessage: "物件情報を取得できませんでした。時間をおいて再度お試しください。" };
  }

  let query = supabase
    .from("properties")
    .select("*")
    .eq("status", "published");

  query = applyServerFilters(query, filters);
  query = applyServerSort(query, filters.sort);

  const { data, error } = await query;
  if (error) {
    logPropertyQueryError("published properties", error);
    if (shouldUseSampleFallback()) {
      return { properties: getFallbackPublishedProperties(filters), errorMessage: null };
    }
    return { properties: [], errorMessage: "物件情報を取得できませんでした。時間をおいて再度お試しください。" };
  }

  return {
    properties: sanitizePublicListProperties(sortProperties(filterProperties((data ?? []) as Property[], filters), filters.sort)),
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
  const supabase = await createPropertyReadClient();

  if (!supabase) {
    return shouldUseSampleFallback()
      ? uniqueLocations(publishedOnly ? sampleProperties.filter((property) => property.status === "published") : sampleProperties)
      : [];
  }

  let query = supabase.from("properties").select("prefecture, city").order("prefecture", { ascending: true }).order("city", { ascending: true });
  if (publishedOnly) query = query.eq("status", "published");

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
  return filtered;
}

export async function getPublishedProperty(id: string) {
  const supabase = await createPropertyReadClient();

  if (!supabase) {
    if (!shouldUseSampleFallback()) return null;
    const property = sampleProperties.find((candidate) => candidate.id === id && candidate.status === "published");
    return property ? sanitizePublicDetailProperty(property) : null;
  }

  const { data, error } = await supabase
    .from("properties")
    .select("*, property_images(*)")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (error) return null;
  return sanitizePublicDetailProperty(data as Property);
}

export async function getAdminProperties(filters: PropertyFilters = {}) {
  const supabase = await createPropertyReadClient();
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
  const supabase = await createPropertyReadClient();
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

async function createPropertyReadClient() {
  return createSupabaseServiceRoleClient() ?? await createSupabaseServerClient();
}

async function fetchAdminProperties(
  supabase: NonNullable<Awaited<ReturnType<typeof createPropertyReadClient>>>,
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

function getFallbackPropertyLocations(publishedOnly: boolean) {
  return uniqueLocations(publishedOnly ? sampleProperties.filter((property) => property.status === "published") : sampleProperties);
}

function logPropertyQueryError(scope: string, error: { message?: string }) {
  console.error(`[properties] Failed to load ${scope}: ${error.message ?? "unknown error"}`);
}

function shouldUseSampleFallback() {
  return process.env.NODE_ENV !== "production";
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
