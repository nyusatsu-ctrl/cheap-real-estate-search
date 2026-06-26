"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createTenderSupabaseServiceRoleClient } from "@/lib/supabase/tenders-server";
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

  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) {
    revalidatePath("/favorites");
    redirect("/favorites");
  }

  const { error } = await supabase.from("tender_favorites").upsert(
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

  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) {
    revalidatePath("/notifications");
    redirect("/notifications?saved=1");
  }

  const { error } = await supabase.from("tender_notifications").insert({
    user_id: member.id,
    name: optionalString(formData, "name") ?? "案件詳細から作成した通知条件",
    region: optionalString(formData, "region"),
    prefecture: optionalString(formData, "prefecture"),
    tender_type: optionalString(formData, "tender_type"),
    participation_condition: optionalString(formData, "participation_condition"),
    keyword: optionalString(formData, "keyword"),
    exclude_keyword: optionalString(formData, "exclude_keyword"),
    agency_name: optionalString(formData, "agency_name"),
    defense_only: formData.get("defense_only") === "on",
    open_counter_only: formData.get("open_counter_only") === "on",
    qualification_required_only: formData.get("qualification_required_only") === "on",
    deadline_soon_only: formData.get("deadline_soon_only") === "on",
    min_days_until_deadline: Number(formData.get("min_days_until_deadline") ?? 0) || 0,
    include_unknown_deadline: formData.get("include_unknown_deadline") === "on",
    email_enabled: formData.get("email_enabled") === "on",
    app_enabled: formData.get("app_enabled") === "on",
    is_active: formData.get("is_active") !== "off"
  });

  if (error) throw new Error(error.message);

  revalidatePath("/notifications");
  redirect("/notifications?saved=1");
}
