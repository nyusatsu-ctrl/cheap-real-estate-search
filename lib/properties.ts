import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sampleProperties } from "@/lib/sample-data";
import { getRegionPrefectures } from "@/lib/property-filters";
import type { Property, PropertyFilters, PropertyLocationOption } from "@/lib/types";

type PropertyQuery<T> = {
  eq: (column: string, value: string | number) => T;
  gte: (column: string, value: number) => T;
  lte: (column: string, value: number) => T;
  in: (column: string, values: readonly string[]) => T;
};

export async function getPublishedProperties(filters: PropertyFilters = {}) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return filterProperties(sampleProperties.filter((property) => property.status === "published"), filters);
  }

  let query = supabase
    .from("properties")
    .select("*, property_sources(name, website_url), property_images(*)")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  query = applyServerFilters(query, filters);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return filterProperties((data ?? []) as Property[], filters);
}

export async function getPublishedPropertyLocations() {
  return getPropertyLocations({ publishedOnly: true });
}

export async function getAdminPropertyLocations() {
  return getPropertyLocations({ publishedOnly: false });
}

async function getPropertyLocations({ publishedOnly }: { publishedOnly: boolean }): Promise<PropertyLocationOption[]> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return uniqueLocations(publishedOnly ? sampleProperties.filter((property) => property.status === "published") : sampleProperties);
  }

  let query = supabase.from("properties").select("prefecture, city").order("prefecture", { ascending: true }).order("city", { ascending: true });
  if (publishedOnly) query = query.eq("status", "published");

  const { data, error } = await query;
  if (error) throw new Error(error.message);

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
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return sampleProperties.find((property) => property.id === id && property.status === "published") ?? null;
  }

  const { data, error } = await supabase
    .from("properties")
    .select("*, property_sources(name, website_url), property_images(*)")
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (error) return null;
  return data as Property;
}

export async function getAdminProperties(filters: PropertyFilters = {}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return filterProperties(sampleProperties, filters);

  let query = supabase
    .from("properties")
    .select("*, property_sources(name, website_url)")
    .order("updated_at", { ascending: false });

  query = applyServerFilters(query, filters);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return filterProperties((data ?? []) as Property[], filters);
}

export async function getAdminProperty(id: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return sampleProperties.find((property) => property.id === id) ?? null;

  const { data, error } = await supabase
    .from("properties")
    .select("*, property_sources(name, website_url)")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as Property;
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

function getPropertyCategory(property: Property) {
  return property.property_category ?? property.property_type;
}

function matchesKeyword(property: Property, keyword: string) {
  return [
    property.title,
    property.prefecture,
    property.city,
    property.address_display,
    property.property_sources?.name,
    property.source_url,
    property.remarks
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(keyword));
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
