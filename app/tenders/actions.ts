"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canUseMemberFeatures, normalizeFavoriteStatus } from "@/lib/tenders";
import { requireMember } from "@/lib/user";

function optionalString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

export async function saveFavoriteTenderAction(formData: FormData) {
  const member = await requireMember();
  if (!canUseMemberFeatures(member)) redirect("/billing?trial=expired");

  const tenderId = String(formData.get("tender_id") ?? "").trim();
  if (!tenderId) throw new Error("tender_id is required");

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    revalidatePath("/favorites");
    redirect("/favorites");
  }

  const { error } = await supabase.from("user_favorites").upsert(
    {
      user_id: member.id,
      tender_id: tenderId,
      memo: optionalString(formData, "memo"),
      status: normalizeFavoriteStatus(formData.get("status"))
    },
    { onConflict: "user_id,tender_id" }
  );

  if (error) throw new Error(error.message);

  revalidatePath("/favorites");
  revalidatePath(`/tenders/${tenderId}`);
  redirect("/favorites");
}

export async function saveNotificationAction(formData: FormData) {
  const member = await requireMember();
  if (!canUseMemberFeatures(member)) redirect("/billing?trial=expired");

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    revalidatePath("/notifications");
    redirect("/notifications?saved=1");
  }

  const { error } = await supabase.from("user_notifications").insert({
    user_id: member.id,
    region: optionalString(formData, "region"),
    prefecture: optionalString(formData, "prefecture"),
    tender_type: optionalString(formData, "tender_type"),
    keyword: optionalString(formData, "keyword"),
    defense_only: formData.get("defense_only") === "on",
    open_counter_only: formData.get("open_counter_only") === "on",
    qualification_required_only: formData.get("qualification_required_only") === "on",
    deadline_soon_only: formData.get("deadline_soon_only") === "on",
    email_enabled: formData.get("email_enabled") === "on",
    app_enabled: formData.get("app_enabled") === "on"
  });

  if (error) throw new Error(error.message);

  revalidatePath("/notifications");
  redirect("/notifications?saved=1");
}
