"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createTenderSupabaseServiceRoleClient } from "@/lib/supabase/tenders-server";
import { requireUsableTenderMember } from "@/lib/tender-access";

function optionalString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function nonNegativeInt(formData: FormData, key: string) {
  const value = Number(String(formData.get(key) ?? "0"));
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

async function requireUsableMember() {
  return requireUsableTenderMember();
}

export async function saveTenderNotificationRuleAction(formData: FormData) {
  const member = await requireUsableMember();
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) redirect("/notifications?error=setup");

  const id = optionalString(formData, "id");
  const payload = {
    user_id: member.userId,
    name: optionalString(formData, "name") ?? "通知条件",
    keyword: optionalString(formData, "keyword"),
    exclude_keyword: optionalString(formData, "exclude_keyword"),
    agency_name: optionalString(formData, "agency_name"),
    region: optionalString(formData, "region"),
    prefecture: optionalString(formData, "prefecture"),
    tender_type: optionalString(formData, "tender_type"),
    participation_condition: optionalString(formData, "participation_condition"),
    defense_only: checkbox(formData, "defense_only"),
    open_counter_only: checkbox(formData, "open_counter_only"),
    qualification_required_only: checkbox(formData, "qualification_required_only"),
    deadline_soon_only: checkbox(formData, "deadline_soon_only"),
    min_days_until_deadline: nonNegativeInt(formData, "min_days_until_deadline"),
    include_unknown_deadline: checkbox(formData, "include_unknown_deadline"),
    app_enabled: checkbox(formData, "app_enabled"),
    email_enabled: checkbox(formData, "email_enabled"),
    is_active: checkbox(formData, "is_active"),
    deleted_at: null
  };

  const result = id
    ? await supabase.from("tender_notifications").update(payload).eq("id", id).eq("user_id", member.userId)
    : await supabase.from("tender_notifications").insert(payload);

  if (result.error) redirect(`/notifications?error=${encodeURIComponent(result.error.message)}`);

  revalidatePath("/notifications");
  redirect("/notifications?saved=1");
}

export async function toggleTenderNotificationRuleAction(formData: FormData) {
  const member = await requireUsableMember();
  const id = optionalString(formData, "id");
  if (!id) redirect("/notifications?error=missing_rule");
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) redirect("/notifications?error=setup");

  const { error } = await supabase
    .from("tender_notifications")
    .update({ is_active: checkbox(formData, "is_active") })
    .eq("id", id)
    .eq("user_id", member.userId);

  if (error) redirect(`/notifications?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/notifications");
  redirect("/notifications");
}

export async function deleteTenderNotificationRuleAction(formData: FormData) {
  const member = await requireUsableMember();
  const id = optionalString(formData, "id");
  const confirmation = optionalString(formData, "confirm_delete");
  if (!id || confirmation !== "delete") redirect("/notifications?error=delete_confirmation");
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) redirect("/notifications?error=setup");

  const { error } = await supabase
    .from("tender_notifications")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", id)
    .eq("user_id", member.userId);

  if (error) redirect(`/notifications?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/notifications");
  redirect("/notifications?deleted=1");
}

export async function markTenderNotificationReadAction(formData: FormData) {
  const member = await requireUsableMember();
  const id = optionalString(formData, "id");
  if (!id) redirect("/notifications?error=missing_notification");
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) redirect("/notifications?error=setup");

  const { error } = await supabase
    .from("tender_notification_events")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", member.userId);

  if (error) redirect(`/notifications?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/notifications");
  redirect("/notifications");
}

export async function markAllTenderNotificationsReadAction() {
  const member = await requireUsableMember();
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) redirect("/notifications?error=setup");

  const { error } = await supabase
    .from("tender_notification_events")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", member.userId)
    .eq("is_read", false)
    .is("deleted_at", null);

  if (error) redirect(`/notifications?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/notifications");
  redirect("/notifications");
}

export async function deleteTenderNotificationEventAction(formData: FormData) {
  const member = await requireUsableMember();
  const id = optionalString(formData, "id");
  if (!id) redirect("/notifications?error=missing_notification");
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) redirect("/notifications?error=setup");

  const { error } = await supabase
    .from("tender_notification_events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", member.userId);

  if (error) redirect(`/notifications?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/notifications");
  redirect("/notifications");
}
