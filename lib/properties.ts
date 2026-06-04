import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sampleProperties } from "@/lib/sample-data";
import type { Property, PropertyFilters } from "@/lib/types";

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

  if (filters.prefecture) query = query.eq("prefecture", filters.prefecture);
  if (filters.maxPrice !== undefined) query = query.lte("price_yen", filters.maxPrice);
  if (filters.propertyType) query = query.eq("property_type", filters.propertyType);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []) as Property[];
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

export async function getAdminProperties() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return sampleProperties;

  const { data, error } = await supabase
    .from("properties")
    .select("*, property_sources(name, website_url)")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Property[];
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
  return properties.filter((property) => {
    if (filters.prefecture && property.prefecture !== filters.prefecture) return false;
    if (filters.maxPrice !== undefined && property.price_yen > filters.maxPrice) return false;
    if (filters.propertyType && property.property_type !== filters.propertyType) return false;
    return true;
  });
}
