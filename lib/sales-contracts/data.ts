import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CONTRACT_TYPE_LABELS,
  FINANCE_COMPANY_LABELS,
  LEASE_COMPANY_LABELS,
  VEHICLE_TYPE_LABELS
} from "@/lib/sales-contracts/rules";
import type {
  SalesContract,
  SalesContractDetail,
  SalesContractFilters,
  SalesContractListItem,
  SalesCustomer,
  SalesDataResult,
  SalesDocument,
  SalesGuarantor,
  SalesLease,
  SalesLoan,
  SalesVehicle
} from "@/lib/sales-contracts/types";

type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

const TABLE_MISSING_MESSAGE = "契約管理テーブルが未作成です。supabase/sales-contracts.sql を適用してください。";

export async function getSalesContractList(filters: SalesContractFilters = {}): Promise<SalesDataResult<SalesContractListItem[]>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { data: [], tableMissing: true, errorMessage: TABLE_MISSING_MESSAGE };
  }

  const contractsResult = await supabase
    .from("sales_contracts")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(300);

  if (contractsResult.error) return handleDataError<SalesContractListItem[]>(contractsResult.error, []);

  const contracts = (contractsResult.data ?? []) as SalesContract[];
  if (contracts.length === 0) return { data: [], tableMissing: false };

  const contractIds = contracts.map((contract) => contract.id);
  const customerIds = unique(contracts.map((contract) => contract.customer_id));

  const [customersResult, vehiclesResult, loansResult, leasesResult] = await Promise.all([
    customerIds.length
      ? supabase.from("sales_customers").select("*").in("id", customerIds).is("deleted_at", null)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("sales_vehicles").select("*").in("contract_id", contractIds).is("deleted_at", null),
    supabase.from("sales_loans").select("*").in("contract_id", contractIds).is("deleted_at", null),
    supabase.from("sales_leases").select("*").in("contract_id", contractIds).is("deleted_at", null)
  ]);

  const firstError = [customersResult.error, vehiclesResult.error, loansResult.error, leasesResult.error].find(Boolean);
  if (firstError) return handleDataError<SalesContractListItem[]>(firstError, []);

  const customersById = mapById((customersResult.data ?? []) as SalesCustomer[]);
  const vehiclesByContractId = mapFirstByContractId((vehiclesResult.data ?? []) as SalesVehicle[]);
  const loansByContractId = mapFirstByContractId((loansResult.data ?? []) as SalesLoan[]);
  const leasesByContractId = mapFirstByContractId((leasesResult.data ?? []) as SalesLease[]);

  const items = contracts.map((contract) => ({
    contract,
    customer: customersById.get(contract.customer_id) ?? null,
    vehicle: vehiclesByContractId.get(contract.id) ?? null,
    loan: loansByContractId.get(contract.id) ?? null,
    lease: leasesByContractId.get(contract.id) ?? null
  }));

  return {
    data: applyFilters(items, filters),
    tableMissing: false
  };
}

export async function getSalesContractDetail(id: string): Promise<SalesDataResult<SalesContractDetail | null>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { data: null, tableMissing: true, errorMessage: TABLE_MISSING_MESSAGE };
  }

  const contractResult = await supabase
    .from("sales_contracts")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (contractResult.error) return handleDataError<SalesContractDetail | null>(contractResult.error, null);
  if (!contractResult.data) return { data: null, tableMissing: false };

  const contract = contractResult.data as SalesContract;
  const [
    customerResult,
    vehiclesResult,
    loansResult,
    leasesResult,
    guarantorsResult,
    documentsResult,
    contactHistoriesResult
  ] = await Promise.all([
    supabase.from("sales_customers").select("*").eq("id", contract.customer_id).is("deleted_at", null).maybeSingle(),
    supabase.from("sales_vehicles").select("*").eq("contract_id", contract.id).is("deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("sales_loans").select("*").eq("contract_id", contract.id).is("deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("sales_leases").select("*").eq("contract_id", contract.id).is("deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("sales_guarantors").select("*").eq("contract_id", contract.id).is("deleted_at", null).order("created_at", { ascending: true }),
    supabase.from("sales_documents").select("*").eq("contract_id", contract.id).is("deleted_at", null).order("created_at", { ascending: true }),
    supabase.from("sales_contact_histories").select("*").eq("contract_id", contract.id).is("deleted_at", null).order("handled_at", { ascending: false })
  ]);

  const firstError = [
    customerResult.error,
    vehiclesResult.error,
    loansResult.error,
    leasesResult.error,
    guarantorsResult.error,
    documentsResult.error,
    contactHistoriesResult.error
  ].find(Boolean);
  if (firstError) return handleDataError<SalesContractDetail | null>(firstError, null);

  return {
    data: {
      contract,
      customer: (customerResult.data as SalesCustomer | null) ?? null,
      vehicle: ((vehiclesResult.data ?? []) as SalesVehicle[])[0] ?? null,
      loan: ((loansResult.data ?? []) as SalesLoan[])[0] ?? null,
      lease: ((leasesResult.data ?? []) as SalesLease[])[0] ?? null,
      guarantors: (guarantorsResult.data ?? []) as SalesGuarantor[],
      documents: (documentsResult.data ?? []) as SalesDocument[],
      contactHistories: (contactHistoriesResult.data ?? []) as SalesContractDetail["contactHistories"]
    },
    tableMissing: false
  };
}

export async function getSalesCustomerContracts(customerId: string): Promise<SalesDataResult<{ customer: SalesCustomer | null; contracts: SalesContractListItem[] }>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { data: { customer: null, contracts: [] }, tableMissing: true, errorMessage: TABLE_MISSING_MESSAGE };
  }

  const customerResult = await supabase
    .from("sales_customers")
    .select("*")
    .eq("id", customerId)
    .is("deleted_at", null)
    .maybeSingle();

  if (customerResult.error) return handleDataError(customerResult.error, { customer: null, contracts: [] });
  if (!customerResult.data) return { data: { customer: null, contracts: [] }, tableMissing: false };

  const contracts = await getSalesContractList({});
  if (contracts.tableMissing) {
    return { data: { customer: customerResult.data as SalesCustomer, contracts: [] }, tableMissing: true, errorMessage: contracts.errorMessage };
  }

  return {
    data: {
      customer: customerResult.data as SalesCustomer,
      contracts: contracts.data.filter((item) => item.contract.customer_id === customerId)
    },
    tableMissing: false
  };
}

export function getSalesContractTableMissingMessage() {
  return TABLE_MISSING_MESSAGE;
}

export function formatSalesDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short" }).format(new Date(value));
}

export function formatSalesDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function formatYen(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `${Number(value).toLocaleString("ja-JP")}円`;
}

export function getCounterpartyLabel(item: Pick<SalesContractListItem, "contract" | "loan" | "lease">) {
  if (item.contract.contract_type === "loan" && item.loan) return FINANCE_COMPANY_LABELS[item.loan.finance_company];
  if (item.contract.contract_type === "lease" && item.lease) return LEASE_COMPANY_LABELS[item.lease.lease_company];
  return "-";
}

export function getTermLabel(item: Pick<SalesContractListItem, "contract" | "loan" | "lease">) {
  if (item.contract.contract_type === "loan") return item.loan?.installment_count ? `${item.loan.installment_count}回` : "-";
  if (item.contract.contract_type === "lease") return item.lease?.lease_months ? `${item.lease.lease_months}か月` : "-";
  return "-";
}

export function getMonthlyAmount(item: Pick<SalesContractListItem, "contract" | "loan" | "lease">) {
  if (item.contract.contract_type === "loan") return item.loan?.monthly_payment ?? null;
  if (item.contract.contract_type === "lease") return item.lease?.monthly_lease_fee ?? null;
  return null;
}

export function getStartDate(item: Pick<SalesContractListItem, "contract" | "loan" | "lease">) {
  if (item.contract.contract_type === "loan") return item.loan?.first_payment_date ?? null;
  if (item.contract.contract_type === "lease") return item.lease?.lease_start_date ?? null;
  return null;
}

export function getEndDate(item: Pick<SalesContractListItem, "contract" | "loan" | "lease">) {
  if (item.contract.contract_type === "loan") return item.loan?.final_payment_date ?? null;
  if (item.contract.contract_type === "lease") return item.lease?.lease_end_date ?? null;
  return null;
}

function handleDataError<T>(error: SupabaseErrorLike, fallback: T): SalesDataResult<T> {
  if (isMissingSalesTableError(error)) {
    return { data: fallback, tableMissing: true, errorMessage: TABLE_MISSING_MESSAGE };
  }
  return {
    data: fallback,
    tableMissing: false,
    errorMessage: error.message || "契約管理データを読み込めませんでした。"
  };
}

function isMissingSalesTableError(error: SupabaseErrorLike) {
  const message = String(error.message || "").toLowerCase();
  return error.code === "42P01" || error.code === "PGRST205" || message.includes("does not exist") || message.includes("schema cache");
}

function applyFilters(items: SalesContractListItem[], filters: SalesContractFilters) {
  const keyword = normalize(filters.keyword);
  return items.filter((item) => {
    if (filters.contractType && item.contract.contract_type !== filters.contractType) return false;
    if (filters.status && item.contract.status !== filters.status) return false;
    if (filters.financeCompany && item.loan?.finance_company !== filters.financeCompany) return false;

    if (!keyword) return true;
    const searchable = [
      item.customer?.name,
      item.customer?.kana,
      item.customer?.phone,
      item.customer?.email,
      item.vehicle?.maker,
      item.vehicle?.model,
      item.vehicle?.registration_number,
      item.vehicle?.chassis_number,
      item.loan?.finance_company ? FINANCE_COMPANY_LABELS[item.loan.finance_company] : "",
      item.lease?.lease_company ? LEASE_COMPANY_LABELS[item.lease.lease_company] : "",
      VEHICLE_TYPE_LABELS[item.contract.vehicle_type],
      CONTRACT_TYPE_LABELS[item.contract.contract_type]
    ].map(normalize);

    return searchable.some((value) => value.includes(keyword));
  });
}

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function mapById<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]));
}

function mapFirstByContractId<T extends { contract_id: string }>(items: T[]) {
  const map = new Map<string, T>();
  for (const item of items) {
    if (!map.has(item.contract_id)) map.set(item.contract_id, item);
  }
  return map;
}
