"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type {
  SalesContactMethod,
  SalesContactStatus,
  SalesLeaseMaturityChoice,
  SalesLeaseMaturityStatus
} from "@/lib/sales-contracts/types";

type SupabaseMutationError = {
  code?: string;
  message?: string;
};

const SETUP_REDIRECT = "/admin/sales-lease-maturities?setup=missing";

export async function upsertLeaseMaturityAction(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) redirect(SETUP_REDIRECT);

  const maturityId = nullableString(formData, "maturity_id");
  const contractId = requiredString(formData, "contract_id");
  const leaseId = requiredString(formData, "lease_id");
  const returnTo = safeReturnPath(nullableString(formData, "return_to"), `/admin/sales-contracts/${contractId}`);
  const now = new Date().toISOString();
  const payload = getLeaseMaturityPayload(formData, contractId, leaseId);

  const beforeResult = maturityId
    ? await supabase.from("sales_lease_maturities").select("*").eq("id", maturityId).maybeSingle()
    : { data: null, error: null };
  if (beforeResult.error) handleMutationError(beforeResult.error);

  const result = maturityId
    ? await supabase
      .from("sales_lease_maturities")
      .update({ ...payload, deleted_at: null, updated_at: now })
      .eq("id", maturityId)
      .select("*")
      .single()
    : await supabase
      .from("sales_lease_maturities")
      .insert({ ...payload, created_at: now, updated_at: now })
      .select("*")
      .single();
  if (result.error) handleMutationError(result.error);

  await insertAuditLog(
    supabase,
    admin.id,
    "sales_lease_maturities",
    result.data.id,
    maturityId ? "update" : "create",
    beforeResult.data,
    result.data,
    maturityId ? "リース満期管理を更新" : "リース満期管理を作成"
  );

  revalidatePath("/admin/sales-lease-maturities");
  revalidatePath(`/admin/sales-contracts/${contractId}`);
  redirect(returnTo);
}

export async function addLeaseMaturityHistoryAction(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) redirect(SETUP_REDIRECT);

  const maturityId = requiredString(formData, "maturity_id");
  const contractId = requiredString(formData, "contract_id");
  const customerId = nullableString(formData, "customer_id");
  const returnTo = safeReturnPath(nullableString(formData, "return_to"), `/admin/sales-contracts/${contractId}`);
  const content = nullableString(formData, "history_content");
  if (!content) redirect(`${returnTo}?error=${encodeURIComponent("満期対応履歴の内容を入力してください。")}`);

  const now = new Date().toISOString();
  const payload = {
    maturity_id: maturityId,
    contract_id: contractId,
    customer_id: customerId,
    handled_at: nullableString(formData, "history_handled_at"),
    handled_by: nullableString(formData, "history_handled_by"),
    method: normalizeContactMethod(nullableString(formData, "history_method")),
    content,
    next_action_date: nullableString(formData, "history_next_action_date"),
    status: normalizeContactStatus(nullableString(formData, "history_status")),
    attachment_url: nullableString(formData, "history_attachment_url"),
    memo: nullableString(formData, "history_memo"),
    created_at: now,
    updated_at: now
  };

  const result = await supabase
    .from("sales_lease_maturity_histories")
    .insert(payload)
    .select("id")
    .single();
  if (result.error) handleMutationError(result.error);

  await insertAuditLog(supabase, admin.id, "sales_lease_maturity_histories", result.data.id, "create", null, payload, "リース満期対応履歴を追加");

  revalidatePath("/admin/sales-lease-maturities");
  revalidatePath(`/admin/sales-contracts/${contractId}`);
  redirect(returnTo);
}

function getLeaseMaturityPayload(formData: FormData, contractId: string, leaseId: string) {
  return {
    contract_id: contractId,
    lease_id: leaseId,
    maturity_date: nullableString(formData, "maturity_date"),
    maturity_status: normalizeMaturityStatus(nullableString(formData, "maturity_status")),
    customer_choice: normalizeCustomerChoice(nullableString(formData, "customer_choice")),
    residual_value_amount: numberField(formData, "residual_value_amount"),
    maturity_mileage: numberField(formData, "maturity_mileage"),
    contracted_mileage_limit: numberField(formData, "contracted_mileage_limit"),
    mileage_over_limit: checkboxField(formData, "mileage_over_limit"),
    mileage_excess_km: nonNegativeNumberField(formData, "mileage_excess_km"),
    mileage_overage_rate_yen: nonNegativeNumberField(formData, "mileage_overage_rate_yen"),
    mileage_overage_amount: nonNegativeNumberField(formData, "mileage_overage_amount"),
    vehicle_condition_memo: nullableString(formData, "vehicle_condition_memo"),
    condition_settlement_amount: nonNegativeNumberField(formData, "condition_settlement_amount"),
    additional_settlement_amount: numberField(formData, "additional_settlement_amount"),
    additional_settlement_reason: nullableString(formData, "additional_settlement_reason"),
    renewal_maintenance_fee_amount: nonNegativeNumberField(formData, "renewal_maintenance_fee_amount"),
    final_settlement_amount: numberField(formData, "final_settlement_amount"),
    purchase_payment_due_date: nullableString(formData, "purchase_payment_due_date"),
    purchase_paid_date: nullableString(formData, "purchase_paid_date"),
    renewal_contract_id: nullableString(formData, "renewal_contract_id"),
    return_scheduled_date: nullableString(formData, "return_scheduled_date"),
    return_completed_date: nullableString(formData, "return_completed_date"),
    maturity_notice_sent_date: nullableString(formData, "maturity_notice_sent_date"),
    next_contact_date: nullableString(formData, "next_contact_date"),
    memo: nullableString(formData, "maturity_memo")
  };
}

async function insertAuditLog(
  supabase: NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>,
  actorProfileId: string,
  targetTable: string,
  targetId: string,
  action: string,
  beforeJson: unknown,
  afterJson: unknown,
  memo: string
) {
  await supabase.from("sales_audit_logs").insert({
    actor_profile_id: actorProfileId,
    target_table: targetTable,
    target_id: targetId,
    action,
    before_json: beforeJson,
    after_json: afterJson,
    memo
  });
}

function requiredString(formData: FormData, key: string) {
  const value = nullableString(formData, key);
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function nullableString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

function numberField(formData: FormData, key: string) {
  const value = nullableString(formData, key);
  if (!value) return null;
  const normalized = value.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)).replace(/[,\s円回km]/g, "");
  const number = Number.parseInt(normalized, 10);
  return Number.isFinite(number) ? number : null;
}

function nonNegativeNumberField(formData: FormData, key: string) {
  const value = numberField(formData, key);
  if (value !== null && value < 0) throw new Error(`${key} must be greater than or equal to 0`);
  return value;
}

function checkboxField(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function normalizeMaturityStatus(value: string | null): SalesLeaseMaturityStatus {
  const allowed: SalesLeaseMaturityStatus[] = ["not_started", "notified", "waiting_response", "purchase_planned", "renewal_planned", "return_planned", "completed"];
  return allowed.includes(value as SalesLeaseMaturityStatus) ? (value as SalesLeaseMaturityStatus) : "not_started";
}

function normalizeCustomerChoice(value: string | null): SalesLeaseMaturityChoice {
  const allowed: SalesLeaseMaturityChoice[] = ["undecided", "purchase", "renewal", "return"];
  return allowed.includes(value as SalesLeaseMaturityChoice) ? (value as SalesLeaseMaturityChoice) : "undecided";
}

function normalizeContactMethod(value: string | null): SalesContactMethod {
  const allowed: SalesContactMethod[] = ["phone", "line", "email", "sms", "visit", "other"];
  return allowed.includes(value as SalesContactMethod) ? (value as SalesContactMethod) : "phone";
}

function normalizeContactStatus(value: string | null): SalesContactStatus {
  const allowed: SalesContactStatus[] = ["normal", "caution", "payment_delay", "repair_consultation", "complaint", "completed"];
  return allowed.includes(value as SalesContactStatus) ? (value as SalesContactStatus) : "normal";
}

function safeReturnPath(value: string | null, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

function handleMutationError(error: SupabaseMutationError): never {
  if (isMissingSalesTableError(error)) redirect(SETUP_REDIRECT);
  throw new Error(error.message || "リース満期管理データを保存できませんでした。");
}

function isMissingSalesTableError(error: SupabaseMutationError) {
  const message = String(error.message || "").toLowerCase();
  return error.code === "42P01" || error.code === "PGRST205" || message.includes("does not exist") || message.includes("schema cache");
}
