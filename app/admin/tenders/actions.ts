"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function optionalString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

export async function saveTenderAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase environment variables are not set.");

  const id = optionalString(formData, "id");
  const sourceName = requiredString(formData, "source_name");
  const sourceUrl = requiredString(formData, "source_url");

  const { data: source, error: sourceError } = await supabase
    .from("tender_sources")
    .insert({
      name: sourceName,
      url: sourceUrl,
      source_type: optionalString(formData, "source_type") ?? "manual",
      source_name: sourceName,
      base_url: sourceUrl,
      tender_list_url: sourceUrl,
      crawler_type: optionalString(formData, "source_type") ?? "manual_only",
      organization_type: "other",
      target_types: ["goods", "services", "open_counter", "qualification_required"],
      source_format: "html",
      crawler_difficulty: "medium",
      crawl_priority: "C",
      is_active: true,
      crawl_frequency: "manual",
      crawl_ready: false
    })
    .select("id")
    .single();

  if (sourceError) throw new Error(sourceError.message);

  const payload = {
    title: requiredString(formData, "title"),
    agency_name: requiredString(formData, "agency_name"),
    tender_type: requiredString(formData, "tender_type"),
    region: requiredString(formData, "region"),
    prefecture: requiredString(formData, "prefecture"),
    published_at: optionalString(formData, "published_at"),
    deadline_at: optionalString(formData, "deadline_at"),
    bid_at: optionalString(formData, "bid_at"),
    qualification_required: formData.get("qualification_required") === "on",
    required_qualification: optionalString(formData, "required_qualification"),
    source_url: requiredString(formData, "source_url"),
    pdf_url: optionalString(formData, "pdf_url"),
    detail_memo: optionalString(formData, "detail_memo"),
    is_new: formData.get("is_new") === "on",
    is_deadline_soon: formData.get("is_deadline_soon") === "on",
    is_defense: formData.get("is_defense") === "on",
    status: requiredString(formData, "status"),
    fetched_at: new Date().toISOString(),
    source_id: source.id
  };

  const result = id
    ? await supabase.from("tenders").update(payload).eq("id", id)
    : await supabase.from("tenders").insert(payload);

  if (result.error) throw new Error(result.error.message);

  revalidatePath("/");
  revalidatePath("/tenders");
  revalidatePath("/admin/tenders");
  redirect("/admin/tenders");
}

export async function deleteTenderAction(formData: FormData) {
  await requireAdmin();
  const id = requiredString(formData, "id");
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase environment variables are not set.");

  const { error } = await supabase.from("tenders").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/tenders");
  revalidatePath("/admin/tenders");
  redirect("/admin/tenders");
}

export async function saveTenderSourceAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("Supabase environment variables are not set.");

  const { error } = await supabase.from("tender_sources").insert({
    name: requiredString(formData, "name"),
    url: requiredString(formData, "url"),
    source_type: requiredString(formData, "source_type"),
    source_name: requiredString(formData, "name"),
    base_url: requiredString(formData, "url"),
    tender_list_url: requiredString(formData, "url"),
    crawler_type: requiredString(formData, "source_type"),
    organization_type: "other",
    target_types: ["goods", "services", "open_counter", "qualification_required"],
    source_format: "html",
    crawler_difficulty: "medium",
    crawl_priority: "C",
    is_active: formData.get("is_active") === "on",
    crawl_frequency: requiredString(formData, "crawl_frequency"),
    crawl_ready: false
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/tender-sources");
  redirect("/admin/tender-sources");
}
