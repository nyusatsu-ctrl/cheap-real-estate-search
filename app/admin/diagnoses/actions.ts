"use server";

import { revalidatePath } from "next/cache";
import { requireDiagnosisAdmin } from "@/lib/diagnosis-admin";
import { normalizeLeadStatus } from "@/lib/construction-diagnosis";
import {
  normalizeDiagnosisV2DealStatus,
  normalizeDiagnosisV2SalesStatus
} from "@/lib/construction-diagnosis-v2/data";
import { createDiagnosisSupabaseServiceRoleClient } from "@/lib/supabase/diagnosis-server";

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
  await requireDiagnosisAdmin();
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) throw new Error("Diagnosis Supabase service role environment variable is not set.");
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

export async function updateDiagnosisV2AdminAction(formData: FormData) {
  const supabase = await getAdminServiceRoleClient();
  const id = requiredString(formData, "id");
  const dealAmountValue = nullableString(formData, "deal_amount");
  const dealAmount = dealAmountValue && Number.isFinite(Number(dealAmountValue)) ? Number(dealAmountValue) : null;
  const adminNotes = nullableString(formData, "admin_notes");

  const { error } = await supabase
    .from("construction_diagnoses")
    .update({
      sales_status: normalizeDiagnosisV2SalesStatus(requiredString(formData, "sales_status")),
      deal_status: normalizeDiagnosisV2DealStatus(requiredString(formData, "deal_status")),
      meeting_at: nullableDateTime(formData, "meeting_at"),
      next_action_at: nullableDateTime(formData, "next_action_at"),
      deal_amount: dealAmount,
      loss_reason: nullableString(formData, "loss_reason"),
      admin_notes: adminNotes,
      admin_memo: adminNotes,
      admin_memo_updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/diagnoses");
  revalidatePath(`/admin/diagnoses/${id}`);
}
