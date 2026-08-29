"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  createManagementNumber,
  generateOpaqueToken,
  maskEmail,
  sha256
} from "@/lib/econtracts/crypto";
import { getEcontractBaseUrl, sendEcontractLinkEmail } from "@/lib/econtracts/email";
import { insertEcontractEvent, isEcontractFeatureEnabled, requireEcontractFeatureEnabled } from "@/lib/econtracts/server";
import { canIssueLoanEcontract, ECONTRACT_DISABLED_MESSAGE } from "@/lib/econtracts/rules";
import { buildEcontractDocument } from "@/lib/econtracts/templates";
import type {
  EcontractCustomerSnapshot,
  EcontractDocumentSnapshot,
  SalesEcontract
} from "@/lib/econtracts/types";
import type { SalesContract, SalesCustomer, SalesLoan, SalesVehicle } from "@/lib/sales-contracts/types";

const LINK_TTL_DAYS = 14;

type SourceDetail = {
  contract: SalesContract;
  customer: SalesCustomer;
  vehicle: SalesVehicle | null;
  loan: SalesLoan;
};

export async function issueEcontractAction(formData: FormData) {
  const admin = await requireAdmin();
  const contractId = requiredString(formData, "contract_id");
  requireAdminEcontractFeature(contractId);
  const client = requireClient();
  const source = await loadSourceDetail(contractId);
  requireEligibleSource(source, contractId);
  const customer = buildCustomerSnapshot(source.customer);
  const document = buildEcontractDocument(customer);
  await createAndSendEcontract({
    client,
    adminId: admin.id,
    source,
    customer,
    document,
    terms: buildTermsSnapshot(source)
  });
  revalidate(contractId);
  success(contractId, "電子契約をメール送信しました。");
}

export async function resendEcontractAction(formData: FormData) {
  const admin = await requireAdmin();
  const contractId = requiredString(formData, "contract_id");
  requireAdminEcontractFeature(contractId);
  const econtractId = requiredString(formData, "econtract_id");
  const client = requireClient();
  const result = await client.from("sales_econtracts").select("*").eq("id", econtractId).eq("contract_id", contractId).maybeSingle();
  if (result.error) throw result.error;
  const econtract = result.data as SalesEcontract | null;
  if (!econtract || econtract.contract_kind !== "purchase_intent" || econtract.status === "signed" || econtract.status === "cancelled") {
    fail(contractId, "この電子契約は再送できません。");
  }
  const source = await loadSourceDetail(contractId);
  requireEligibleSource(source, contractId);
  const destination = econtract.customer_snapshot.email;
  if (!isEmail(destination)) fail(contractId, "顧客のメールアドレスを確認してください。");
  const token = generateOpaqueToken();
  const baseUrl = getEcontractBaseUrl();
  if (!baseUrl) fail(contractId, "電子契約の公開URL設定が未完了です。");
  const now = new Date();
  const expiresAt = addDays(now, LINK_TTL_DAYS).toISOString();
  const updateResult = await client.from("sales_econtracts").update({
    link_token_hash: sha256(token),
    link_expires_at: expiresAt,
    delivery_revision: econtract.delivery_revision + 1,
    status: "sent",
    sent_at: now.toISOString(),
    sent_by_profile_id: admin.id,
    opened_at: null,
    identity_confirmed_at: null,
    verified_at: null
  }).eq("id", econtract.id)
    .eq("delivery_revision", econtract.delivery_revision)
    .in("status", ["draft", "sent", "opened", "verified"])
    .select("id")
    .maybeSingle();
  if (updateResult.error) throw updateResult.error;
  if (!updateResult.data) fail(contractId, "電子契約の状態が更新されています。画面を更新してから再送してください。");
  await invalidateCustomerSessions(client, econtract.id, now.toISOString());

  const delivery = await sendEcontractLinkEmail({
    to: destination,
    customerName: econtract.customer_snapshot.name,
    documentTitle: econtract.document_title,
    managementNumber: econtract.management_number,
    signingUrl: `${baseUrl}/econtracts/${token}`
  });
  if (!delivery.ok) {
    await client.from("sales_econtracts").update({ status: "draft", sent_at: null }).eq("id", econtract.id);
    await insertEcontractEvent({ econtractId: econtract.id, eventType: "delivery_failed", actorKind: "admin", actorProfileId: admin.id });
    fail(contractId, delivery.error);
  }
  await Promise.all([
    insertEcontractEvent({
      econtractId: econtract.id,
      eventType: "resent",
      actorKind: "admin",
      actorProfileId: admin.id,
      metadata: { deliveryMethod: "email", providerMessageId: delivery.providerMessageId }
    }),
    insertAudit(client, admin.id, econtract.id, "econtract_resend", { status: "sent", revision: econtract.revision })
  ]);
  revalidate(contractId);
  success(contractId, "電子契約を再送しました。");
}

export async function cancelEcontractAction(formData: FormData) {
  const admin = await requireAdmin();
  const contractId = requiredString(formData, "contract_id");
  requireAdminEcontractFeature(contractId);
  const econtractId = requiredString(formData, "econtract_id");
  const reason = requiredString(formData, "cancelled_reason").slice(0, 1000);
  const client = requireClient();
  const result = await client.from("sales_econtracts").select("id,status").eq("id", econtractId).eq("contract_id", contractId).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data || result.data.status === "signed" || result.data.status === "cancelled") {
    fail(contractId, "署名済みまたは取消済みの電子契約は取消できません。");
  }
  const now = new Date().toISOString();
  const updateResult = await client.from("sales_econtracts").update({
    status: "cancelled",
    cancelled_at: now,
    cancelled_reason: reason
  }).eq("id", econtractId).select("id").single();
  if (updateResult.error) throw updateResult.error;
  await invalidateCustomerSessions(client, econtractId, now);
  await Promise.all([
    insertEcontractEvent({ econtractId, eventType: "cancelled", actorKind: "admin", actorProfileId: admin.id, metadata: { reason } }),
    insertAudit(client, admin.id, econtractId, "econtract_cancel", { status: "cancelled", reason })
  ]);
  revalidate(contractId);
  success(contractId, "電子契約を取消しました。");
}

async function createAndSendEcontract(input: {
  client: NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>;
  adminId: string;
  source: SourceDetail;
  customer: EcontractCustomerSnapshot;
  document: EcontractDocumentSnapshot;
  terms: Record<string, unknown>;
}) {
  if (!isEmail(input.customer.email)) fail(input.source.contract.id, "顧客のメールアドレスを登録してください。");
  const baseUrl = getEcontractBaseUrl();
  if (!baseUrl) fail(input.source.contract.id, "電子契約の公開URL設定が未完了です。");
  const existingResult = await input.client
    .from("sales_econtracts")
    .select("id,status")
    .eq("contract_id", input.source.contract.id)
    .eq("contract_kind", "purchase_intent");
  if (existingResult.error) throw existingResult.error;
  if (existingResult.data?.some((contract) => contract.status === "signed")) {
    fail(input.source.contract.id, "締結済みの電子契約があるため、新しい電子契約は発行できません。");
  }
  if (existingResult.data?.some((contract) => ["draft", "sent", "opened", "verified"].includes(contract.status))) {
    fail(input.source.contract.id, "未完了の電子契約があります。再送または取消を使用してください。");
  }
  const revisionResult = await input.client
    .from("sales_econtracts")
    .select("revision")
    .eq("contract_id", input.source.contract.id)
    .eq("contract_kind", "purchase_intent")
    .order("revision", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (revisionResult.error) throw revisionResult.error;
  const revision = Number(revisionResult.data?.revision ?? 0) + 1;
  const token = generateOpaqueToken();
  const now = new Date();
  const managementNumber = createManagementNumber("purchase_intent", now);
  const insertResult = await input.client.from("sales_econtracts").insert({
    contract_id: input.source.contract.id,
    customer_id: input.source.customer.id,
    loan_id: input.source.loan.id,
    loan_application_number_snapshot: input.source.loan.application_number,
    contract_kind: "purchase_intent",
    revision,
    management_number: managementNumber,
    status: "draft",
    document_title: input.document.title,
    document_version: input.document.version,
    document_html_snapshot: input.document.html,
    document_text_snapshot: input.document.text,
    document_hash: sha256(input.document.text),
    customer_snapshot: input.customer,
    terms_snapshot: input.terms,
    important_items_snapshot: input.document.importantItems,
    link_token_hash: sha256(token),
    link_expires_at: addDays(now, LINK_TTL_DAYS).toISOString(),
    delivery_method: "email",
    delivery_destination_masked: maskEmail(input.customer.email),
    created_by_profile_id: input.adminId
  }).select("*").single();
  if (insertResult.error) throw insertResult.error;
  const econtract = insertResult.data as SalesEcontract;
  const sentAt = new Date().toISOString();
  const markSentResult = await input.client.from("sales_econtracts").update({
    status: "sent",
    sent_at: sentAt,
    sent_by_profile_id: input.adminId
  }).eq("id", econtract.id).select("id").single();
  if (markSentResult.error) throw markSentResult.error;
  const delivery = await sendEcontractLinkEmail({
    to: input.customer.email,
    customerName: input.customer.name,
    documentTitle: input.document.title,
    managementNumber,
    signingUrl: `${baseUrl}/econtracts/${token}`
  });
  if (!delivery.ok) {
    await input.client.from("sales_econtracts").update({ status: "draft", sent_at: null }).eq("id", econtract.id);
    await insertEcontractEvent({ econtractId: econtract.id, eventType: "delivery_failed", actorKind: "admin", actorProfileId: input.adminId });
    fail(input.source.contract.id, delivery.error);
  }
  await Promise.all([
    insertEcontractEvent({
      econtractId: econtract.id,
      eventType: "sent",
      actorKind: "admin",
      actorProfileId: input.adminId,
      metadata: { deliveryMethod: "email", providerMessageId: delivery.providerMessageId }
    }),
    insertAudit(input.client, input.adminId, econtract.id, "econtract_issue", {
      contractKind: "purchase_intent",
      revision,
      managementNumber,
      documentHash: econtract.document_hash,
      status: "sent"
    })
  ]);
}

async function loadSourceDetail(contractId: string): Promise<SourceDetail> {
  const client = requireClient();
  const contractResult = await client.from("sales_contracts").select("*").eq("id", contractId).is("deleted_at", null).maybeSingle();
  if (contractResult.error) throw contractResult.error;
  if (!contractResult.data) throw new Error("対象の販売契約が見つかりません。");
  const contract = contractResult.data as SalesContract;
  const [customerResult, vehicleResult, loanResult] = await Promise.all([
    client.from("sales_customers").select("*").eq("id", contract.customer_id).is("deleted_at", null).maybeSingle(),
    client.from("sales_vehicles").select("*").eq("contract_id", contractId).is("deleted_at", null).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    client.from("sales_loans").select("*").eq("contract_id", contractId).is("deleted_at", null).order("updated_at", { ascending: false }).limit(1).maybeSingle()
  ]);
  const error = customerResult.error || vehicleResult.error || loanResult.error;
  if (error) throw error;
  if (!customerResult.data || !loanResult.data) throw new Error("顧客またはローン情報が見つかりません。");
  return {
    contract,
    customer: customerResult.data as SalesCustomer,
    vehicle: (vehicleResult.data as SalesVehicle | null) ?? null,
    loan: loanResult.data as SalesLoan
  };
}

function buildCustomerSnapshot(customer: SalesCustomer): EcontractCustomerSnapshot {
  return {
    id: customer.id,
    name: customer.name.trim(),
    kana: customer.kana,
    email: String(customer.email ?? "").trim().toLowerCase(),
    phone: customer.phone,
    postalCode: customer.postal_code,
    address: customer.address
  };
}

function buildTermsSnapshot(source: SourceDetail) {
  return {
    vehicleType: source.contract.vehicle_type,
    desiredVehicle: source.vehicle?.model ?? "",
    financeCompany: source.loan.finance_company,
    approvalStatus: source.loan.approval_status,
    applicationNumber: source.loan.application_number,
    sourceRowKey: source.contract.source_row_key,
    sourceRowNumber: source.contract.source_row_number
  };
}

function requireEligibleSource(source: SourceDetail, contractId: string) {
  if (!canIssueLoanEcontract({
    contractType: source.contract.contract_type,
    approvalStatus: source.loan.approval_status,
    financeCompany: source.loan.finance_company
  })) {
    fail(contractId, "電子契約はプレミアまたはアストで可決済みの自社ローン顧客だけに送信できます。");
  }
}

async function invalidateCustomerSessions(client: NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>, econtractId: string, now: string) {
  const [sessions, verifications] = await Promise.all([
    client.from("sales_econtract_access_sessions").update({ revoked_at: now }).eq("econtract_id", econtractId).is("revoked_at", null),
    client.from("sales_econtract_verifications").update({ invalidated_at: now }).eq("econtract_id", econtractId).is("invalidated_at", null).is("verified_at", null)
  ]);
  if (sessions.error) throw sessions.error;
  if (verifications.error) throw verifications.error;
}

async function insertAudit(
  client: NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>,
  adminId: string,
  econtractId: string,
  action: string,
  afterJson: Record<string, unknown>
) {
  const result = await client.from("sales_audit_logs").insert({
    actor_profile_id: adminId,
    target_table: "sales_econtracts",
    target_id: econtractId,
    action,
    before_json: null,
    after_json: afterJson,
    memo: "電子契約操作"
  });
  if (result.error) throw result.error;
}

function requireClient() {
  requireEcontractFeatureEnabled();
  const client = createSupabaseServiceRoleClient();
  if (!client) throw new Error("電子契約データベース設定が未完了です。");
  return client;
}

function requiredString(formData: FormData, key: string) {
  const value = optionalString(formData, key);
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function requireAdminEcontractFeature(contractId: string) {
  if (!isEcontractFeatureEnabled()) fail(contractId, ECONTRACT_DISABLED_MESSAGE);
}

function optionalString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim().slice(0, 2000);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function revalidate(contractId: string) {
  revalidatePath("/admin/sales-contracts");
  revalidatePath(`/admin/sales-contracts/${contractId}`);
}

function success(contractId: string, message: string): never {
  redirect(`/admin/sales-contracts/${contractId}?econtract_message=${encodeURIComponent(message)}#econtracts`);
}

function fail(contractId: string, message: string): never {
  redirect(`/admin/sales-contracts/${contractId}?econtract_error=${encodeURIComponent(message)}#econtracts`);
}
