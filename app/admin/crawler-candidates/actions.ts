"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

function requiredId(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("id is required");
  return id;
}

function returnPath(formData: FormData) {
  const value = String(formData.get("returnTo") ?? "").trim();
  return value.startsWith("/admin/crawler-candidates") ? value : "/admin/crawler-candidates";
}

async function updateCandidate(id: string, payload: Record<string, unknown>) {
  await requireAdmin();
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) throw new Error("Supabase service role environment variables are not set.");

  const { data: property, error: selectError } = await supabase
    .from("properties")
    .select("id, crawler_source_id, crawl_status")
    .eq("id", id)
    .single();

  if (selectError) throw new Error(selectError.message);
  if (!property?.crawler_source_id && !["candidate", "checked", "test_reverted", "rejected"].includes(property?.crawl_status ?? "")) {
    throw new Error("クローラー取込候補ではない物件はこの画面から更新できません。");
  }

  const { error } = await supabase
    .from("properties")
    .update({
      ...payload,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/properties");
  revalidatePath("/admin/properties");
  revalidatePath("/admin/crawler-candidates");
}

export async function publishCrawlerCandidateAction(formData: FormData) {
  const id = requiredId(formData);
  const redirectTo = returnPath(formData);

  await updateCandidate(id, {
    status: "published",
    // Existing production schema uses permitted/denied. The UI labels this as approved.
    publication_permission: "permitted",
    published_at: new Date().toISOString(),
    crawl_status: "checked"
  });

  redirect(redirectTo);
}

export async function keepCrawlerCandidateDraftAction(formData: FormData) {
  const id = requiredId(formData);
  const redirectTo = returnPath(formData);

  await updateCandidate(id, {
    status: "draft",
    publication_permission: "pending",
    published_at: null,
    crawl_status: "checked"
  });

  redirect(redirectTo);
}

export async function rejectCrawlerCandidateAction(formData: FormData) {
  const id = requiredId(formData);
  const redirectTo = returnPath(formData);

  await updateCandidate(id, {
    status: "draft",
    // Existing production schema uses permitted/denied. The UI labels this as rejected.
    publication_permission: "denied",
    published_at: null,
    crawl_status: "rejected"
  });

  redirect(redirectTo);
}
