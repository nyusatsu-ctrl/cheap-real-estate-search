"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { normalizeLeadStatus } from "@/lib/construction-diagnosis";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function nullableString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

function nullableDateTime(formData: FormData, key: string) {
  const value = nullableString(formData, key);
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

async function getAdminServiceRoleClient() {
  await requireAdmin();
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) throw new Error("Supabase service role environment variable is not set.");
  return supabase;
}

export async function updateDiagnosisLeadStatusAction(formData: FormData) {
  const supabase = await getAdminServiceRoleClient();
  const id = requiredString(formData, "id");
  const leadStatus = normalizeLeadStatus(requiredString(formData, "lead_status"));
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("construction_diagnoses")
    .update({
      lead_status: leadStatus,
      lead_updated_at: now
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/diagnoses");
  revalidatePath(`/admin/diagnoses/${id}`);
}

export async function updateDiagnosisLeadDetailsAction(formData: FormData) {
  const supabase = await getAdminServiceRoleClient();
  const id = requiredString(formData, "id");
  const leadStatus = normalizeLeadStatus(requiredString(formData, "lead_status"));
  const now = new Date().toISOString();
  const lastContactedAt = nullableDateTime(formData, "last_contacted_at");

  const { error } = await supabase
    .from("construction_diagnoses")
    .update({
      lead_status: leadStatus,
      admin_memo: nullableString(formData, "admin_memo"),
      admin_memo_updated_at: now,
      last_contacted_at: lastContactedAt,
      lead_updated_at: now
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/diagnoses");
  revalidatePath(`/admin/diagnoses/${id}`);
}
