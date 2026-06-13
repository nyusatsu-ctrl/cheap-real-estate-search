"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import type { PropertyStatus } from "@/lib/types";

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function nullableNumber(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function signInAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase environment variables are not set.");

  const email = requiredString(formData, "email");
  const password = requiredString(formData, "password");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/admin/login?error=${encodeURIComponent(error.message)}`);

  if (process.env.ADMIN_AUTH_DEBUG === "1" || process.env.NODE_ENV === "development") {
    console.info("[admin-auth] sign_in", {
      userId: data.user?.id ?? null,
      email: data.user?.email ?? null,
      hasSession: Boolean(data.session)
    });
  }

  redirect("/admin/diagnoses");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function savePropertyAction(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase environment variables are not set.");

  const id = String(formData.get("id") ?? "").trim();
  const status = requiredString(formData, "status") as PropertyStatus;
  const sourceName = requiredString(formData, "source_name");
  const sourceWebsiteUrl = String(formData.get("source_website_url") ?? "").trim() || null;

  const { data: source, error: sourceError } = await supabase
    .from("property_sources")
    .insert({ name: sourceName, website_url: sourceWebsiteUrl })
    .select("id")
    .single();

  if (sourceError) throw new Error(sourceError.message);

  const payload = {
    title: requiredString(formData, "title"),
    property_type: requiredString(formData, "property_type"),
    property_category: requiredString(formData, "property_category"),
    price_yen: Number(requiredString(formData, "price_yen")),
    prefecture: requiredString(formData, "prefecture"),
    city: requiredString(formData, "city"),
    address_display: requiredString(formData, "address_display"),
    land_area_m2: nullableNumber(formData, "land_area_m2"),
    building_area_m2: nullableNumber(formData, "building_area_m2"),
    construction_year: nullableNumber(formData, "construction_year"),
    latitude: nullableNumber(formData, "latitude"),
    longitude: nullableNumber(formData, "longitude"),
    source_id: source.id,
    source_url: requiredString(formData, "source_url"),
    publication_permission: requiredString(formData, "publication_permission"),
    status,
    published_at: status === "published" ? new Date().toISOString() : null,
    created_by: admin.id
  };

  const result = id
    ? await supabase.from("properties").update(payload).eq("id", id)
    : await supabase.from("properties").insert(payload);

  if (result.error) throw new Error(result.error.message);

  revalidatePath("/");
  revalidatePath("/properties");
  revalidatePath("/admin/properties");
  redirect("/admin/properties");
}
