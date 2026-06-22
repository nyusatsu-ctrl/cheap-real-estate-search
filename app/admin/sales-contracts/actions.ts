"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  DOCUMENT_TYPE_OPTIONS,
  validateSalesContractSelection
} from "@/lib/sales-contracts/rules";
import type {
  SalesApprovalStatus,
  SalesContactMethod,
  SalesContactStatus,
  SalesContractStatus,
  SalesContractType,
  SalesDocumentVisibility,
  SalesFinanceCompany,
  SalesLeaseCompany,
  SalesVehicleType
} from "@/lib/sales-contracts/types";

type SupabaseMutationError = {
  code?: string;
  message?: string;
};

const SETUP_REDIRECT = "/admin/sales-contracts?setup=missing";

export async function createSalesContractAction(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) redirect(SETUP_REDIRECT);

  const input = getValidatedFormInput(formData, "/admin/sales-contracts/new");
  const now = new Date().toISOString();

  const customerResult = await supabase
    .from("sales_customers")
    .insert({ ...input.customer, created_at: now, updated_at: now })
    .select("*")
    .single();
  if (customerResult.error) handleMutationError(customerResult.error);

  const contractResult = await supabase
    .from("sales_contracts")
    .insert({
      ...input.contract,
      customer_id: customerResult.data.id,
      created_at: now,
      updated_at: now
    })
    .select("*")
    .single();
  if (contractResult.error) handleMutationError(contractResult.error);

  const contractId = contractResult.data.id as string;
  const vehicleResult = await supabase
    .from("sales_vehicles")
    .insert({
      ...input.vehicle,
      contract_id: contractId,
      vehicle_type: input.contract.vehicle_type,
      created_at: now,
      updated_at: now
    })
    .select("id")
    .single();
  if (vehicleResult.error) handleMutationError(vehicleResult.error);

  if (input.contract.contract_type === "loan" && input.loan) {
    const loanResult = await supabase
      .from("sales_loans")
      .insert({ ...input.loan, contract_id: contractId, created_at: now, updated_at: now })
      .select("id")
      .single();
    if (loanResult.error) handleMutationError(loanResult.error);
  }

  if (input.contract.contract_type === "lease" && input.lease) {
    const leaseResult = await supabase
      .from("sales_leases")
      .insert({ ...input.lease, contract_id: contractId, created_at: now, updated_at: now })
      .select("id")
      .single();
    if (leaseResult.error) handleMutationError(leaseResult.error);
  }

  if (input.guarantor) {
    const guarantorResult = await supabase
      .from("sales_guarantors")
      .insert({ ...input.guarantor, contract_id: contractId, created_at: now, updated_at: now })
      .select("id")
      .single();
    if (guarantorResult.error) handleMutationError(guarantorResult.error);
  }

  for (const document of input.documents) {
    const documentResult = await supabase
      .from("sales_documents")
      .insert({ ...document, contract_id: contractId, created_at: now, updated_at: now })
      .select("id")
      .single();
    if (documentResult.error) handleMutationError(documentResult.error);
  }

  if (input.initialContactHistory) {
    const contactResult = await supabase
      .from("sales_contact_histories")
      .insert({
        ...input.initialContactHistory,
        contract_id: contractId,
        customer_id: customerResult.data.id,
        created_at: now,
        updated_at: now
      })
      .select("id")
      .single();
    if (contactResult.error) handleMutationError(contactResult.error);
  }

  await insertAuditLog(supabase, admin.id, "sales_contracts", contractId, "create", null, contractResult.data, "契約を作成");

  revalidatePath("/admin/sales-contracts");
  redirect(`/admin/sales-contracts/${contractId}?created=1`);
}

export async function updateSalesContractAction(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) redirect(SETUP_REDIRECT);

  const contractId = requiredString(formData, "contract_id");
  const customerId = requiredString(formData, "customer_id");
  const vehicleId = requiredString(formData, "vehicle_id");
  const input = getValidatedFormInput(formData, `/admin/sales-contracts/${contractId}`);
  const now = new Date().toISOString();

  const beforeResult = await supabase.from("sales_contracts").select("*").eq("id", contractId).maybeSingle();
  if (beforeResult.error) handleMutationError(beforeResult.error);

  const customerResult = await supabase
    .from("sales_customers")
    .update({ ...input.customer, updated_at: now })
    .eq("id", customerId)
    .select("*")
    .single();
  if (customerResult.error) handleMutationError(customerResult.error);

  const contractResult = await supabase
    .from("sales_contracts")
    .update({ ...input.contract, customer_id: customerId, updated_at: now })
    .eq("id", contractId)
    .select("*")
    .single();
  if (contractResult.error) handleMutationError(contractResult.error);

  const vehicleResult = await supabase
    .from("sales_vehicles")
    .update({ ...input.vehicle, vehicle_type: input.contract.vehicle_type, updated_at: now })
    .eq("id", vehicleId)
    .select("id")
    .single();
  if (vehicleResult.error) handleMutationError(vehicleResult.error);

  if (input.contract.contract_type === "loan" && input.loan) {
    const loanId = nullableString(formData, "loan_id");
    const loanResult = loanId
      ? await supabase.from("sales_loans").update({ ...input.loan, deleted_at: null, updated_at: now }).eq("id", loanId).select("id").single()
      : await supabase.from("sales_loans").insert({ ...input.loan, contract_id: contractId, created_at: now, updated_at: now }).select("id").single();
    if (loanResult.error) handleMutationError(loanResult.error);
    const softDeleteLeases = await supabase.from("sales_leases").update({ deleted_at: now, updated_at: now }).eq("contract_id", contractId).is("deleted_at", null);
    if (softDeleteLeases.error) handleMutationError(softDeleteLeases.error);
  } else if (input.contract.contract_type === "lease" && input.lease) {
    const leaseId = nullableString(formData, "lease_id");
    const leaseResult = leaseId
      ? await supabase.from("sales_leases").update({ ...input.lease, deleted_at: null, updated_at: now }).eq("id", leaseId).select("id").single()
      : await supabase.from("sales_leases").insert({ ...input.lease, contract_id: contractId, created_at: now, updated_at: now }).select("id").single();
    if (leaseResult.error) handleMutationError(leaseResult.error);
    const softDeleteLoans = await supabase.from("sales_loans").update({ deleted_at: now, updated_at: now }).eq("contract_id", contractId).is("deleted_at", null);
    if (softDeleteLoans.error) handleMutationError(softDeleteLoans.error);
  } else {
    const [softDeleteLoans, softDeleteLeases] = await Promise.all([
      supabase.from("sales_loans").update({ deleted_at: now, updated_at: now }).eq("contract_id", contractId).is("deleted_at", null),
      supabase.from("sales_leases").update({ deleted_at: now, updated_at: now }).eq("contract_id", contractId).is("deleted_at", null)
    ]);
    if (softDeleteLoans.error) handleMutationError(softDeleteLoans.error);
    if (softDeleteLeases.error) handleMutationError(softDeleteLeases.error);
  }

  await upsertPrimaryGuarantor(supabase, formData, contractId, input.guarantor, now);
  await upsertDocuments(supabase, formData, contractId, input.documents, now);
  await insertAuditLog(supabase, admin.id, "sales_contracts", contractId, "update", beforeResult.data, contractResult.data, "契約を更新");

  revalidatePath("/admin/sales-contracts");
  revalidatePath(`/admin/sales-contracts/${contractId}`);
  redirect(`/admin/sales-contracts/${contractId}`);
}

export async function addContactHistoryAction(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) redirect(SETUP_REDIRECT);

  const contractId = requiredString(formData, "contract_id");
  const customerId = nullableString(formData, "customer_id");
  const contact = getContactHistoryPayload(formData);
  if (!contact) redirect(`/admin/sales-contracts/${contractId}?error=${encodeURIComponent("対応内容を入力してください。")}`);

  const now = new Date().toISOString();
  const result = await supabase
    .from("sales_contact_histories")
    .insert({ ...contact, contract_id: contractId, customer_id: customerId, created_at: now, updated_at: now })
    .select("id")
    .single();
  if (result.error) handleMutationError(result.error);

  await insertAuditLog(supabase, admin.id, "sales_contact_histories", result.data.id, "create", null, contact, "対応履歴を追加");

  revalidatePath(`/admin/sales-contracts/${contractId}`);
  redirect(`/admin/sales-contracts/${contractId}`);
}

export async function addDocumentAction(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) redirect(SETUP_REDIRECT);

  const contractId = requiredString(formData, "contract_id");
  const fileUrl = nullableString(formData, "file_url");
  const storagePath = nullableString(formData, "storage_path");
  if (!fileUrl && !storagePath) {
    redirect(`/admin/sales-contracts/${contractId}?error=${encodeURIComponent("書類URLまたはstorage_pathを入力してください。")}`);
  }

  const now = new Date().toISOString();
  const payload = {
    document_type: normalizeDocumentType(nullableString(formData, "document_type")),
    title: nullableString(formData, "title"),
    file_url: fileUrl,
    storage_path: storagePath,
    visibility: normalizeDocumentVisibility(nullableString(formData, "visibility")),
    memo: nullableString(formData, "document_memo")
  };
  const result = await supabase
    .from("sales_documents")
    .insert({ ...payload, contract_id: contractId, created_at: now, updated_at: now })
    .select("id")
    .single();
  if (result.error) handleMutationError(result.error);

  await insertAuditLog(supabase, admin.id, "sales_documents", result.data.id, "create", null, payload, "書類を追加");

  revalidatePath(`/admin/sales-contracts/${contractId}`);
  redirect(`/admin/sales-contracts/${contractId}`);
}

export async function hideTestSalesContractAction(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) redirect(SETUP_REDIRECT);

  const contractId = requiredString(formData, "contract_id");
  const now = new Date().toISOString();

  const contractResult = await supabase
    .from("sales_contracts")
    .select("*")
    .eq("id", contractId)
    .is("deleted_at", null)
    .maybeSingle();
  if (contractResult.error) handleMutationError(contractResult.error);
  if (!contractResult.data) redirect("/admin/sales-contracts");

  const customerId = String(contractResult.data.customer_id);
  const customerResult = await supabase
    .from("sales_customers")
    .select("*")
    .eq("id", customerId)
    .is("deleted_at", null)
    .maybeSingle();
  if (customerResult.error) handleMutationError(customerResult.error);

  if (!isTestSalesRecord(contractResult.data, customerResult.data)) {
    redirect(`/admin/sales-contracts/${contractId}?error=${encodeURIComponent("テストデータと判定できないため非表示にできません。")}`);
  }

  const relatedBefore = await Promise.all([
    supabase.from("sales_vehicles").select("id").eq("contract_id", contractId).is("deleted_at", null),
    supabase.from("sales_loans").select("id").eq("contract_id", contractId).is("deleted_at", null),
    supabase.from("sales_leases").select("id").eq("contract_id", contractId).is("deleted_at", null),
    supabase.from("sales_guarantors").select("id").eq("contract_id", contractId).is("deleted_at", null),
    supabase.from("sales_documents").select("id").eq("contract_id", contractId).is("deleted_at", null),
    supabase.from("sales_contact_histories").select("id").eq("contract_id", contractId).is("deleted_at", null),
    supabase.from("sales_lease_maturities").select("id").eq("contract_id", contractId).is("deleted_at", null),
    supabase.from("sales_lease_maturity_histories").select("id").eq("contract_id", contractId).is("deleted_at", null),
    supabase.from("sales_contracts").select("id").eq("customer_id", customerId).neq("id", contractId).is("deleted_at", null).limit(1)
  ]);
  const firstReadError = relatedBefore.map((result) => result.error).find(Boolean);
  if (firstReadError) handleMutationError(firstReadError);

  const hasOtherActiveContracts = Boolean(relatedBefore[8].data?.length);
  const hidePayload = { deleted_at: now, updated_at: now };
  const updates = await Promise.all([
    supabase.from("sales_lease_maturity_histories").update(hidePayload).eq("contract_id", contractId).is("deleted_at", null),
    supabase.from("sales_lease_maturities").update(hidePayload).eq("contract_id", contractId).is("deleted_at", null),
    supabase.from("sales_contact_histories").update(hidePayload).eq("contract_id", contractId).is("deleted_at", null),
    supabase.from("sales_documents").update(hidePayload).eq("contract_id", contractId).is("deleted_at", null),
    supabase.from("sales_guarantors").update(hidePayload).eq("contract_id", contractId).is("deleted_at", null),
    supabase.from("sales_loans").update(hidePayload).eq("contract_id", contractId).is("deleted_at", null),
    supabase.from("sales_leases").update(hidePayload).eq("contract_id", contractId).is("deleted_at", null),
    supabase.from("sales_vehicles").update(hidePayload).eq("contract_id", contractId).is("deleted_at", null),
    supabase.from("sales_contracts").update(hidePayload).eq("id", contractId).is("deleted_at", null),
    hasOtherActiveContracts
      ? Promise.resolve({ error: null })
      : supabase.from("sales_customers").update(hidePayload).eq("id", customerId).is("deleted_at", null)
  ]);
  const firstUpdateError = updates.map((result) => result.error).find(Boolean);
  if (firstUpdateError) handleMutationError(firstUpdateError);

  await insertAuditLog(
    supabase,
    admin.id,
    "sales_contracts",
    contractId,
    "hide_test_data",
    {
      contract: contractResult.data,
      customer: customerResult.data,
      related_counts: {
        vehicles: relatedBefore[0].data?.length ?? 0,
        loans: relatedBefore[1].data?.length ?? 0,
        leases: relatedBefore[2].data?.length ?? 0,
        guarantors: relatedBefore[3].data?.length ?? 0,
        documents: relatedBefore[4].data?.length ?? 0,
        contact_histories: relatedBefore[5].data?.length ?? 0,
        lease_maturities: relatedBefore[6].data?.length ?? 0,
        lease_maturity_histories: relatedBefore[7].data?.length ?? 0
      }
    },
    { deleted_at: now, customer_hidden: !hasOtherActiveContracts },
    "テストデータを論理削除で非表示"
  );

  revalidatePath("/admin/sales-contracts");
  revalidatePath("/admin/sales-lease-maturities");
  revalidatePath(`/admin/sales-contracts/${contractId}`);
  revalidatePath(`/admin/sales-customers/${customerId}`);
  redirect("/admin/sales-contracts?hidden=test-data");
}

async function upsertPrimaryGuarantor(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  formData: FormData,
  contractId: string,
  guarantor: Record<string, unknown> | null,
  now: string
) {
  if (!supabase) redirect(SETUP_REDIRECT);
  const guarantorId = nullableString(formData, "guarantor_id");
  if (!guarantor) {
    if (guarantorId) {
      const result = await supabase.from("sales_guarantors").update({ deleted_at: now, updated_at: now }).eq("id", guarantorId);
      if (result.error) handleMutationError(result.error);
    }
    return;
  }

  const result = guarantorId
    ? await supabase.from("sales_guarantors").update({ ...guarantor, deleted_at: null, updated_at: now }).eq("id", guarantorId).select("id").single()
    : await supabase.from("sales_guarantors").insert({ ...guarantor, contract_id: contractId, created_at: now, updated_at: now }).select("id").single();
  if (result.error) handleMutationError(result.error);
}

async function upsertDocuments(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  formData: FormData,
  contractId: string,
  documents: Record<string, unknown>[],
  now: string
) {
  if (!supabase) redirect(SETUP_REDIRECT);
  for (const document of documents) {
    const type = String(document.document_type);
    const documentId = nullableString(formData, `document_${type}_id`);
    const result = documentId
      ? await supabase.from("sales_documents").update({ ...document, deleted_at: null, updated_at: now }).eq("id", documentId).select("id").single()
      : await supabase.from("sales_documents").insert({ ...document, contract_id: contractId, created_at: now, updated_at: now }).select("id").single();
    if (result.error) handleMutationError(result.error);
  }
}

function getValidatedFormInput(formData: FormData, failurePath: string) {
  const vehicleType = normalizeVehicleType(requiredString(formData, "vehicle_type"));
  const contractType = normalizeContractType(requiredString(formData, "contract_type"));
  const financeCompany = nullableString(formData, "finance_company") as SalesFinanceCompany | "";
  const leaseCompany = nullableString(formData, "lease_company") as SalesLeaseCompany | "";
  const installmentCount = numberField(formData, "installment_count");
  const salePrice = numberField(formData, "sale_price");
  const selection = validateSalesContractSelection({
    vehicleType,
    contractType,
    financeCompany,
    leaseCompany,
    installmentCount
  });

  const customerName = nullableString(formData, "customer_name");
  const errors = [...selection.errors];
  if (!customerName) errors.push("顧客名を入力してください。");
  if (salePrice === null) errors.push("契約金額を入力してください。");
  if (errors.length > 0) {
    redirect(`${failurePath}?error=${encodeURIComponent(errors.join(" / "))}`);
  }

  return {
    customer: {
      name: customerName,
      kana: nullableString(formData, "customer_kana"),
      postal_code: nullableString(formData, "postal_code"),
      address: nullableString(formData, "address"),
      phone: nullableString(formData, "phone"),
      email: nullableString(formData, "email"),
      birth_date: nullableString(formData, "birth_date"),
      occupation: nullableString(formData, "occupation"),
      employer_name: nullableString(formData, "employer_name"),
      employer_phone: nullableString(formData, "employer_phone"),
      annual_income: numberField(formData, "annual_income"),
      memo: nullableString(formData, "customer_memo")
    },
    contract: {
      source_system: nullableString(formData, "source_system"),
      source_row_key: nullableString(formData, "source_row_key"),
      source_row_number: numberField(formData, "source_row_number"),
      source_received_at: nullableString(formData, "source_received_at"),
      source_snapshot_json: jsonField(formData, "source_snapshot_json"),
      contract_date: nullableString(formData, "contract_date"),
      delivery_date: nullableString(formData, "delivery_date"),
      vehicle_type: vehicleType,
      contract_type: contractType,
      sale_price: salePrice,
      fees: numberField(formData, "fees"),
      total_price: numberField(formData, "total_price"),
      down_payment: numberField(formData, "down_payment"),
      trade_in_amount: numberField(formData, "trade_in_amount"),
      financed_amount: numberField(formData, "financed_amount"),
      staff_name: nullableString(formData, "staff_name"),
      status: normalizeContractStatus(nullableString(formData, "status")),
      memo: nullableString(formData, "contract_memo")
    },
    vehicle: {
      maker: nullableString(formData, "maker"),
      model: nullableString(formData, "model"),
      grade: nullableString(formData, "grade"),
      model_year: numberField(formData, "model_year"),
      mileage: numberField(formData, "mileage"),
      color: nullableString(formData, "color"),
      chassis_number: nullableString(formData, "chassis_number"),
      registration_number: nullableString(formData, "registration_number"),
      inspection_expiry_date: nullableString(formData, "inspection_expiry_date"),
      compulsory_insurance_expiry_date: nullableString(formData, "compulsory_insurance_expiry_date"),
      warranty_period: nullableString(formData, "warranty_period"),
      gps_installed: checkboxField(formData, "gps_installed"),
      memo: nullableString(formData, "vehicle_memo")
    },
    loan: contractType === "loan" ? getLoanPayload(formData, financeCompany as SalesFinanceCompany, installmentCount) : null,
    lease: contractType === "lease" ? getLeasePayload(formData, leaseCompany as SalesLeaseCompany) : null,
    guarantor: getGuarantorPayload(formData),
    documents: getDocumentPayloads(formData),
    initialContactHistory: getContactHistoryPayload(formData)
  };
}

function getLoanPayload(formData: FormData, financeCompany: SalesFinanceCompany, installmentCount: number | null) {
  return {
    finance_company: financeCompany,
    application_number: nullableString(formData, "application_number"),
    contract_number: nullableString(formData, "loan_contract_number"),
    approval_status: normalizeApprovalStatus(nullableString(formData, "approval_status")),
    interest_rate: decimalField(formData, "interest_rate"),
    principal: numberField(formData, "principal"),
    installment_count: installmentCount,
    initial_payment_amount: numberField(formData, "initial_payment_amount"),
    monthly_payment: numberField(formData, "monthly_payment"),
    final_payment_amount: numberField(formData, "final_payment_amount"),
    bonus_payment_enabled: checkboxField(formData, "loan_bonus_payment_enabled"),
    bonus_payment_amount: numberField(formData, "bonus_payment_amount"),
    first_payment_date: nullableString(formData, "first_payment_date"),
    final_payment_date: nullableString(formData, "final_payment_date"),
    total_payment_amount: numberField(formData, "total_payment_amount"),
    ownership_retention: checkboxField(formData, "ownership_retention"),
    memo: nullableString(formData, "loan_memo")
  };
}

function getLeasePayload(formData: FormData, leaseCompany: SalesLeaseCompany) {
  return {
    lease_company: leaseCompany,
    partner_company: nullableString(formData, "partner_company"),
    contract_number: nullableString(formData, "lease_contract_number"),
    lease_months: numberField(formData, "lease_months"),
    initial_payment_amount: numberField(formData, "initial_payment_amount"),
    monthly_lease_fee: numberField(formData, "monthly_lease_fee"),
    final_payment_amount: numberField(formData, "final_payment_amount"),
    bonus_payment_enabled: checkboxField(formData, "lease_bonus_payment_enabled"),
    bonus_payment_amount: numberField(formData, "lease_bonus_payment_amount"),
    lease_start_date: nullableString(formData, "lease_start_date"),
    lease_end_date: nullableString(formData, "lease_end_date"),
    residual_value_enabled: checkboxField(formData, "residual_value_enabled"),
    residual_value_amount: numberField(formData, "residual_value_amount"),
    maintenance_included: checkboxField(formData, "maintenance_included"),
    owner_name: nullableString(formData, "owner_name"),
    user_name: nullableString(formData, "user_name"),
    memo: nullableString(formData, "lease_memo")
  };
}

function getGuarantorPayload(formData: FormData) {
  const name = nullableString(formData, "guarantor_name");
  if (!name) return null;
  return {
    name,
    kana: nullableString(formData, "guarantor_kana"),
    relationship: nullableString(formData, "guarantor_relationship"),
    postal_code: nullableString(formData, "guarantor_postal_code"),
    address: nullableString(formData, "guarantor_address"),
    phone: nullableString(formData, "guarantor_phone"),
    employer_name: nullableString(formData, "guarantor_employer_name"),
    employer_phone: nullableString(formData, "guarantor_employer_phone"),
    annual_income: numberField(formData, "guarantor_annual_income"),
    identity_document_url: nullableString(formData, "guarantor_identity_document_url"),
    memo: nullableString(formData, "guarantor_memo")
  };
}

function getDocumentPayloads(formData: FormData) {
  return DOCUMENT_TYPE_OPTIONS.flatMap((option) => {
    const fileUrl = nullableString(formData, `document_${option.value}_url`);
    const storagePath = nullableString(formData, `document_${option.value}_storage_path`);
    if (!fileUrl && !storagePath) return [];
    return [{
      document_type: option.value,
      title: nullableString(formData, `document_${option.value}_title`) || option.label,
      file_url: fileUrl,
      storage_path: storagePath,
      visibility: normalizeDocumentVisibility(nullableString(formData, `document_${option.value}_visibility`)),
      memo: nullableString(formData, `document_${option.value}_memo`)
    }];
  });
}

function getContactHistoryPayload(formData: FormData) {
  const content = nullableString(formData, "contact_content");
  if (!content) return null;
  return {
    handled_at: nullableString(formData, "contact_handled_at"),
    handled_by: nullableString(formData, "contact_handled_by"),
    method: normalizeContactMethod(nullableString(formData, "contact_method")),
    content,
    next_action_date: nullableString(formData, "contact_next_action_date"),
    status: normalizeContactStatus(nullableString(formData, "contact_status")),
    attachment_url: nullableString(formData, "contact_attachment_url"),
    memo: nullableString(formData, "contact_memo")
  };
}

function isTestSalesRecord(contract: Record<string, unknown>, customer: Record<string, unknown> | null) {
  return [customer?.name, customer?.memo, contract.memo].some(containsTestMarker);
}

function containsTestMarker(value: unknown) {
  const text = String(value ?? "");
  return text.includes("テスト") || text.includes("動作確認");
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
  const normalized = value.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)).replace(/[,\s円回]/g, "");
  const number = Number.parseInt(normalized, 10);
  return Number.isFinite(number) ? number : null;
}

function decimalField(formData: FormData, key: string) {
  const value = nullableString(formData, key);
  if (!value) return null;
  const normalized = value.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)).replace(/[,\s％%]/g, "");
  const number = Number.parseFloat(normalized);
  return Number.isFinite(number) ? number : null;
}

function checkboxField(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function jsonField(formData: FormData, key: string) {
  const value = nullableString(formData, key);
  if (!value) return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return { raw: value };
  }
}

function normalizeVehicleType(value: string): SalesVehicleType {
  return value === "bike" ? "bike" : "car";
}

function normalizeContractType(value: string): SalesContractType {
  if (value === "loan" || value === "lease") return value;
  return "cash";
}

function normalizeContractStatus(value: string | null): SalesContractStatus {
  const allowed: SalesContractStatus[] = ["contracted", "waiting_delivery", "delivered", "repayment", "payment_delay_contacted", "payoff_scheduled", "paid_off", "leasing", "lease_ended", "cancelled", "trouble"];
  return allowed.includes(value as SalesContractStatus) ? (value as SalesContractStatus) : "contracted";
}

function normalizeApprovalStatus(value: string | null): SalesApprovalStatus | null {
  const allowed: SalesApprovalStatus[] = ["unrequested", "pending", "approved", "guarantor_required", "rejected"];
  return allowed.includes(value as SalesApprovalStatus) ? (value as SalesApprovalStatus) : null;
}

function normalizeContactMethod(value: string | null): SalesContactMethod {
  const allowed: SalesContactMethod[] = ["phone", "line", "email", "sms", "visit", "other"];
  return allowed.includes(value as SalesContactMethod) ? (value as SalesContactMethod) : "phone";
}

function normalizeContactStatus(value: string | null): SalesContactStatus {
  const allowed: SalesContactStatus[] = ["normal", "caution", "payment_delay", "repair_consultation", "complaint", "completed"];
  return allowed.includes(value as SalesContactStatus) ? (value as SalesContactStatus) : "normal";
}

function normalizeDocumentVisibility(value: string | null): SalesDocumentVisibility {
  const allowed: SalesDocumentVisibility[] = ["admin", "staff", "public"];
  return allowed.includes(value as SalesDocumentVisibility) ? (value as SalesDocumentVisibility) : "admin";
}

function normalizeDocumentType(value: string | null) {
  return DOCUMENT_TYPE_OPTIONS.some((option) => option.value === value) ? value : DOCUMENT_TYPE_OPTIONS[0].value;
}

function handleMutationError(error: SupabaseMutationError): never {
  if (isMissingSalesTableError(error)) redirect(SETUP_REDIRECT);
  throw new Error(error.message || "契約管理データを保存できませんでした。");
}

function isMissingSalesTableError(error: SupabaseMutationError) {
  const message = String(error.message || "").toLowerCase();
  return error.code === "42P01" || error.code === "PGRST205" || message.includes("does not exist") || message.includes("schema cache");
}
