import "server-only";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { canIssueLoanEcontract } from "@/lib/econtracts/rules";
import { requireEcontractFeatureEnabled } from "@/lib/econtracts/server";
import { buildEcontractDocument } from "@/lib/econtracts/templates";
import { isKnownAdminTestRecipient } from "@/lib/econtracts/test-recipient";
import type { EcontractCustomerSnapshot, EcontractDocumentSnapshot } from "@/lib/econtracts/types";
import type { AdminIdentity } from "@/lib/admin";
import type { SalesContract, SalesCustomer, SalesLoan, SalesVehicle } from "@/lib/sales-contracts/types";

export type EcontractTestPreview = {
  contractId: string;
  customer: EcontractCustomerSnapshot;
  document: EcontractDocumentSnapshot;
  applicationNumber: string | null;
  terms: {
    vehicleType: SalesContract["vehicle_type"];
    desiredVehicle: string;
    financeCompany: SalesLoan["finance_company"];
    approvalStatus: SalesLoan["approval_status"];
  };
};

export async function loadEcontractTestPreview(contractId: string): Promise<EcontractTestPreview> {
  const client = requireReadonlyClient();
  const contractResult = await client
    .from("sales_contracts")
    .select("*")
    .eq("id", contractId)
    .is("deleted_at", null)
    .maybeSingle();
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

  const customer = customerResult.data as SalesCustomer;
  const vehicle = (vehicleResult.data as SalesVehicle | null) ?? null;
  const loan = loanResult.data as SalesLoan;
  if (!canIssueLoanEcontract({
    contractType: contract.contract_type,
    approvalStatus: loan.approval_status,
    financeCompany: loan.finance_company
  })) {
    throw new Error("テスト送信はプレミアまたはアストで可決済みの自社ローン顧客だけに使用できます。");
  }

  const customerSnapshot: EcontractCustomerSnapshot = {
    id: customer.id,
    name: customer.name.trim(),
    kana: customer.kana,
    email: String(customer.email ?? "").trim().toLowerCase(),
    phone: customer.phone,
    postalCode: customer.postal_code,
    address: customer.address
  };

  return {
    contractId,
    customer: customerSnapshot,
    document: buildEcontractDocument(customerSnapshot),
    applicationNumber: loan.application_number,
    terms: {
      vehicleType: contract.vehicle_type,
      desiredVehicle: vehicle?.model ?? "",
      financeCompany: loan.finance_company,
      approvalStatus: loan.approval_status
    }
  };
}

export async function isAuthorizedAdminTestRecipient(recipient: string, currentAdmin: AdminIdentity) {
  if (isKnownAdminTestRecipient(recipient, currentAdmin)) return true;
  const client = requireReadonlyClient();
  const result = await client
    .from("profiles")
    .select("email")
    .eq("role", "admin")
    .limit(1000);
  if (result.error) throw result.error;
  return isKnownAdminTestRecipient(
    recipient,
    currentAdmin,
    (result.data ?? []).map((profile) => profile.email)
  );
}

export function buildEcontractTestPreviewUrl(baseUrl: string, contractId: string) {
  return `${baseUrl.replace(/\/$/, "")}/admin/econtracts/test-preview/${encodeURIComponent(contractId)}`;
}

export function buildTestPreviewManagementNumber(applicationNumber: string | null) {
  const normalized = String(applicationNumber ?? "").trim().slice(0, 80);
  return normalized ? `TEST-PREVIEW-${normalized}` : "TEST-PREVIEW（正式発行なし）";
}

function requireReadonlyClient() {
  requireEcontractFeatureEnabled();
  const client = createSupabaseServiceRoleClient();
  if (!client) throw new Error("電子契約データベース設定が未完了です。");
  return client;
}
