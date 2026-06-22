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
  SalesContactHistory,
  SalesCustomer,
  SalesDataResult,
  SalesDocument,
  SalesGuarantor,
  SalesLease,
  SalesLeaseMaturity,
  SalesLeaseMaturityFilters,
  SalesLeaseMaturityHistory,
  SalesLeaseMaturityListItem,
  SalesLeaseMaturityListResult,
  SalesLeaseMaturitySummary,
  SalesLoan,
  SalesVehicle
} from "@/lib/sales-contracts/types";

type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

const TABLE_MISSING_MESSAGE = "契約管理テーブルが未作成です。supabase/sales-contracts.sql を適用してください。";
const EMPTY_LEASE_MATURITY_SUMMARY: SalesLeaseMaturitySummary = {
  total: 0,
  overdue: 0,
  thisMonth: 0,
  nextMonth: 0,
  within30Days: 0,
  waitingResponse: 0,
  contactOverdue: 0
};
const EMPTY_LEASE_MATURITY_LIST_RESULT: SalesLeaseMaturityListResult = {
  items: [],
  summary: EMPTY_LEASE_MATURITY_SUMMARY
};

export async function getSalesContractList(filters: SalesContractFilters = {}): Promise<SalesDataResult<SalesContractListItem[]>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { data: [], tableMissing: true, errorMessage: TABLE_MISSING_MESSAGE };
  }

  const sort = filters.sort ?? "updated_desc";
  const orderColumn = sort === "created_desc" ? "created_at" : "updated_at";
  let contractsQuery = supabase
    .from("sales_contracts")
    .select("*")
    .is("deleted_at", null);

  if (filters.vehicleType) contractsQuery = contractsQuery.eq("vehicle_type", filters.vehicleType);
  if (filters.contractType) contractsQuery = contractsQuery.eq("contract_type", filters.contractType);
  if (filters.status) contractsQuery = contractsQuery.eq("status", filters.status);

  const contractsResult = await contractsQuery
    .order(orderColumn, { ascending: false })
    .limit(1000);

  if (contractsResult.error) return handleDataError<SalesContractListItem[]>(contractsResult.error, []);

  const contracts = (contractsResult.data ?? []) as SalesContract[];
  if (contracts.length === 0) return { data: [], tableMissing: false };

  const contractIds = contracts.map((contract) => contract.id);
  const customerIds = unique(contracts.map((contract) => contract.customer_id));

  const [customersResult, vehiclesResult, loansResult, leasesResult, contactHistoriesResult] = await Promise.all([
    customerIds.length
      ? supabase.from("sales_customers").select("*").in("id", customerIds).is("deleted_at", null)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("sales_vehicles").select("*").in("contract_id", contractIds).is("deleted_at", null),
    supabase.from("sales_loans").select("*").in("contract_id", contractIds).is("deleted_at", null),
    supabase.from("sales_leases").select("*").in("contract_id", contractIds).is("deleted_at", null),
    supabase
      .from("sales_contact_histories")
      .select("*")
      .in("contract_id", contractIds)
      .is("deleted_at", null)
      .not("next_action_date", "is", null)
      .order("next_action_date", { ascending: true })
  ]);

  const firstError = [customersResult.error, vehiclesResult.error, loansResult.error, leasesResult.error, contactHistoriesResult.error].find(Boolean);
  if (firstError) return handleDataError<SalesContractListItem[]>(firstError, []);

  const customersById = mapById((customersResult.data ?? []) as SalesCustomer[]);
  const vehiclesByContractId = mapFirstByContractId((vehiclesResult.data ?? []) as SalesVehicle[]);
  const loansByContractId = mapFirstByContractId((loansResult.data ?? []) as SalesLoan[]);
  const leasesByContractId = mapFirstByContractId((leasesResult.data ?? []) as SalesLease[]);
  const contactHistoriesByContractId = groupByContractId((contactHistoriesResult.data ?? []) as SalesContactHistory[]);

  const items = contracts.map((contract) => ({
    contract,
    customer: customersById.get(contract.customer_id) ?? null,
    vehicle: vehiclesByContractId.get(contract.id) ?? null,
    loan: loansByContractId.get(contract.id) ?? null,
    lease: leasesByContractId.get(contract.id) ?? null,
    contactHistories: contactHistoriesByContractId.get(contract.id) ?? []
  }));

  return {
    data: sortSalesContractItems(applyFilters(items, filters), sort),
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
    contactHistoriesResult,
    leaseMaturitiesResult
  ] = await Promise.all([
    supabase.from("sales_customers").select("*").eq("id", contract.customer_id).is("deleted_at", null).maybeSingle(),
    supabase.from("sales_vehicles").select("*").eq("contract_id", contract.id).is("deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("sales_loans").select("*").eq("contract_id", contract.id).is("deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("sales_leases").select("*").eq("contract_id", contract.id).is("deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("sales_guarantors").select("*").eq("contract_id", contract.id).is("deleted_at", null).order("created_at", { ascending: true }),
    supabase.from("sales_documents").select("*").eq("contract_id", contract.id).is("deleted_at", null).order("created_at", { ascending: true }),
    supabase.from("sales_contact_histories").select("*").eq("contract_id", contract.id).is("deleted_at", null).order("handled_at", { ascending: false }),
    supabase.from("sales_lease_maturities").select("*").eq("contract_id", contract.id).is("deleted_at", null).order("updated_at", { ascending: false })
  ]);

  const firstError = [
    customerResult.error,
    vehiclesResult.error,
    loansResult.error,
    leasesResult.error,
    guarantorsResult.error,
    documentsResult.error,
    contactHistoriesResult.error,
    leaseMaturitiesResult.error
  ].find(Boolean);
  if (firstError) return handleDataError<SalesContractDetail | null>(firstError, null);

  const leaseMaturity = ((leaseMaturitiesResult.data ?? []) as SalesLeaseMaturity[])[0] ?? null;
  const maturityHistoriesResult = leaseMaturity
    ? await supabase
      .from("sales_lease_maturity_histories")
      .select("*")
      .eq("maturity_id", leaseMaturity.id)
      .is("deleted_at", null)
      .order("handled_at", { ascending: false })
    : { data: [], error: null };
  if (maturityHistoriesResult.error) return handleDataError<SalesContractDetail | null>(maturityHistoriesResult.error, null);

  return {
    data: {
      contract,
      customer: (customerResult.data as SalesCustomer | null) ?? null,
      vehicle: ((vehiclesResult.data ?? []) as SalesVehicle[])[0] ?? null,
      loan: ((loansResult.data ?? []) as SalesLoan[])[0] ?? null,
      lease: ((leasesResult.data ?? []) as SalesLease[])[0] ?? null,
      guarantors: (guarantorsResult.data ?? []) as SalesGuarantor[],
      documents: (documentsResult.data ?? []) as SalesDocument[],
      contactHistories: (contactHistoriesResult.data ?? []) as SalesContractDetail["contactHistories"],
      leaseMaturity,
      leaseMaturityHistories: (maturityHistoriesResult.data ?? []) as SalesLeaseMaturityHistory[]
    },
    tableMissing: false
  };
}

export async function getSalesLeaseMaturityList(filters: SalesLeaseMaturityFilters = {}): Promise<SalesDataResult<SalesLeaseMaturityListResult>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { data: EMPTY_LEASE_MATURITY_LIST_RESULT, tableMissing: true, errorMessage: TABLE_MISSING_MESSAGE };
  }

  let maturitiesQuery = supabase
    .from("sales_lease_maturities")
    .select("*")
    .is("deleted_at", null)
    .order("maturity_date", { ascending: true, nullsFirst: false })
    .limit(1000);

  if (filters.maturityStatus) maturitiesQuery = maturitiesQuery.eq("maturity_status", filters.maturityStatus);
  if (filters.customerChoice) maturitiesQuery = maturitiesQuery.eq("customer_choice", filters.customerChoice);

  const maturitiesResult = await maturitiesQuery;
  if (maturitiesResult.error) return handleDataError<SalesLeaseMaturityListResult>(maturitiesResult.error, EMPTY_LEASE_MATURITY_LIST_RESULT);

  const maturities = (maturitiesResult.data ?? []) as SalesLeaseMaturity[];
  if (maturities.length === 0) return { data: EMPTY_LEASE_MATURITY_LIST_RESULT, tableMissing: false };

  const leaseIds = unique(maturities.map((maturity) => maturity.lease_id));
  const contractIds = unique(maturities.map((maturity) => maturity.contract_id));

  const [contractsResult, leasesResult, vehiclesResult] = await Promise.all([
    supabase.from("sales_contracts").select("*").in("id", contractIds).is("deleted_at", null),
    supabase.from("sales_leases").select("*").in("id", leaseIds).is("deleted_at", null),
    supabase.from("sales_vehicles").select("*").in("contract_id", contractIds).is("deleted_at", null)
  ]);

  const firstError = [contractsResult.error, leasesResult.error, vehiclesResult.error].find(Boolean);
  if (firstError) return handleDataError<SalesLeaseMaturityListResult>(firstError, EMPTY_LEASE_MATURITY_LIST_RESULT);

  const contracts = ((contractsResult.data ?? []) as SalesContract[]).filter((contract) => contract.contract_type === "lease");
  const contractsById = mapById(contracts);
  const leasesById = mapById((leasesResult.data ?? []) as SalesLease[]);
  const customerIds = unique(contracts.map((contract) => contract.customer_id));
  const customersResult = customerIds.length
    ? await supabase.from("sales_customers").select("*").in("id", customerIds).is("deleted_at", null)
    : { data: [], error: null };
  if (customersResult.error) return handleDataError<SalesLeaseMaturityListResult>(customersResult.error, EMPTY_LEASE_MATURITY_LIST_RESULT);

  const customersById = mapById((customersResult.data ?? []) as SalesCustomer[]);
  const vehiclesByContractId = mapFirstByContractId((vehiclesResult.data ?? []) as SalesVehicle[]);

  const items = maturities.flatMap((maturity) => {
    const contract = contractsById.get(maturity.contract_id);
    const lease = leasesById.get(maturity.lease_id);
    if (!contract || !lease) return [];
    return [{
      contract,
      customer: customersById.get(contract.customer_id) ?? null,
      vehicle: vehiclesByContractId.get(contract.id) ?? null,
      lease,
      maturity
    }];
  });

  const baseItems = applyLeaseMaturityFilters(items, filters);
  return {
    data: {
      items: applyLeaseMaturityQuickFilter(baseItems, filters).sort(compareLeaseMaturityItems),
      summary: summarizeLeaseMaturities(baseItems)
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
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}/${match[2]}/${match[3]}`;
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

export function getInitialPaymentAmount(item: Pick<SalesContractListItem, "contract" | "loan" | "lease">) {
  if (item.contract.contract_type === "loan") return item.loan?.initial_payment_amount ?? null;
  if (item.contract.contract_type === "lease") return item.lease?.initial_payment_amount ?? null;
  return null;
}

export function getFinalPaymentAmount(item: Pick<SalesContractListItem, "contract" | "loan" | "lease">) {
  if (item.contract.contract_type === "loan") return item.loan?.final_payment_amount ?? null;
  if (item.contract.contract_type === "lease") return item.lease?.final_payment_amount ?? null;
  return null;
}

export function getResidualValueAmount(item: Pick<SalesContractListItem, "contract" | "lease">) {
  if (item.contract.contract_type === "lease") return item.lease?.residual_value_amount ?? null;
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

export function getNextActionDate(item: Pick<SalesContractListItem, "contactHistories">) {
  const dates = item.contactHistories
    .map((history) => history.next_action_date)
    .filter((value): value is string => Boolean(value))
    .sort();
  return dates[0] ?? null;
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
  const today = getTodayYmd();
  return items.filter((item) => {
    if (filters.source && !matchesSource(item, filters.source)) return false;
    if (filters.financeCompany && !matchesCounterparty(item, filters.financeCompany)) return false;
    if (filters.nextAction && !matchesNextActionFilter(getNextActionDate(item), filters.nextAction, today)) return false;

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

function matchesSource(item: Pick<SalesContractListItem, "contract">, source: NonNullable<SalesContractFilters["source"]>) {
  if (source === "gas_loan_review") return item.contract.source_system === "gas_loan_review";
  return !item.contract.source_system;
}

function matchesCounterparty(item: Pick<SalesContractListItem, "loan" | "lease">, financeCompany: NonNullable<SalesContractFilters["financeCompany"]>) {
  if (financeCompany === "premium") {
    return item.loan?.finance_company === "premium" || item.lease?.lease_company === "premium";
  }
  if (financeCompany === "aplus_showa") {
    return item.lease?.lease_company === "aplus_showa";
  }
  return item.loan?.finance_company === financeCompany;
}

function matchesNextActionFilter(value: string | null, filter: NonNullable<SalesContractFilters["nextAction"]>, today: string) {
  if (!value) return false;
  const target = toYmd(value);
  if (filter === "overdue") return target < today;
  if (filter === "due_today") return target <= today;
  return target >= today && target <= addDaysYmd(today, 7);
}

function sortSalesContractItems(items: SalesContractListItem[], sort: NonNullable<SalesContractFilters["sort"]>) {
  return [...items].sort((a, b) => {
    if (sort === "next_action_asc") {
      const aTime = dateSortValue(getNextActionDate(a) ?? "");
      const bTime = dateSortValue(getNextActionDate(b) ?? "");
      if (aTime !== bTime) return aTime - bTime;
    }

    const column = sort === "created_desc" ? "created_at" : "updated_at";
    const aTime = dateTimeSortValue(a.contract[column]);
    const bTime = dateTimeSortValue(b.contract[column]);
    if (aTime !== bTime) return bTime - aTime;
    return String(a.customer?.name ?? "").localeCompare(String(b.customer?.name ?? ""), "ja");
  });
}

function applyLeaseMaturityFilters(items: SalesLeaseMaturityListItem[], filters: SalesLeaseMaturityFilters) {
  return items.filter((item) => {
    if (filters.leaseCompany && item.lease.lease_company !== filters.leaseCompany) return false;
    if (filters.maturityStatus && (item.maturity?.maturity_status ?? "not_started") !== filters.maturityStatus) return false;
    if (filters.customerChoice && (item.maturity?.customer_choice ?? "undecided") !== filters.customerChoice) return false;
    if (filters.maturityMonth && !getEffectiveMaturityDate(item).startsWith(filters.maturityMonth)) return false;
    return true;
  });
}

function applyLeaseMaturityQuickFilter(items: SalesLeaseMaturityListItem[], filters: SalesLeaseMaturityFilters) {
  if (!filters.quickFilter) return items;
  return items.filter((item) => {
    const flags = getLeaseMaturityFlags(item);
    switch (filters.quickFilter) {
      case "overdue":
        return flags.isMaturityOverdue;
      case "this_month":
        return flags.isThisMonth;
      case "next_month":
        return flags.isNextMonth;
      case "within_30_days":
        return flags.isWithin30Days;
      case "waiting_response":
        return (item.maturity?.maturity_status ?? "not_started") === "waiting_response";
      case "contact_overdue":
        return flags.isContactOverdue;
      default:
        return true;
    }
  });
}

function summarizeLeaseMaturities(items: SalesLeaseMaturityListItem[]): SalesLeaseMaturitySummary {
  return items.reduce<SalesLeaseMaturitySummary>((summary, item) => {
    const flags = getLeaseMaturityFlags(item);
    summary.total += 1;
    if (flags.isMaturityOverdue) summary.overdue += 1;
    if (flags.isThisMonth) summary.thisMonth += 1;
    if (flags.isNextMonth) summary.nextMonth += 1;
    if (flags.isWithin30Days) summary.within30Days += 1;
    if ((item.maturity?.maturity_status ?? "not_started") === "waiting_response") summary.waitingResponse += 1;
    if (flags.isContactOverdue) summary.contactOverdue += 1;
    return summary;
  }, { ...EMPTY_LEASE_MATURITY_SUMMARY });
}

function compareLeaseMaturityItems(a: SalesLeaseMaturityListItem, b: SalesLeaseMaturityListItem) {
  const aCompleted = (a.maturity?.maturity_status ?? "not_started") === "completed";
  const bCompleted = (b.maturity?.maturity_status ?? "not_started") === "completed";
  if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;

  const aContactTime = dateSortValue(a.maturity?.next_contact_date ?? "");
  const bContactTime = dateSortValue(b.maturity?.next_contact_date ?? "");
  if (aContactTime !== bContactTime) return aContactTime - bContactTime;

  const aTime = dateSortValue(getEffectiveMaturityDate(a));
  const bTime = dateSortValue(getEffectiveMaturityDate(b));
  if (aTime !== bTime) return aTime - bTime;
  return String(a.customer?.name ?? "").localeCompare(String(b.customer?.name ?? ""), "ja");
}

export function getEffectiveMaturityDate(item: Pick<SalesLeaseMaturityListItem, "lease" | "maturity">) {
  return item.maturity?.maturity_date ?? item.lease.lease_end_date ?? "";
}

export function getEffectiveResidualValueAmount(item: Pick<SalesLeaseMaturityListItem, "lease" | "maturity">) {
  return item.maturity?.residual_value_amount ?? item.lease.residual_value_amount ?? null;
}

export function getLeaseMaturityFlags(item: Pick<SalesLeaseMaturityListItem, "lease" | "maturity">, todayYmd = getTodayYmd()) {
  const maturityDate = toYmd(getEffectiveMaturityDate(item));
  const nextContactDate = toYmd(item.maturity?.next_contact_date ?? "");
  const isCompleted = (item.maturity?.maturity_status ?? "not_started") === "completed";
  const thisMonth = todayYmd.slice(0, 7);
  const nextMonth = getNextMonth(todayYmd);
  const thirtyDaysLater = addDaysYmd(todayYmd, 30);

  return {
    isCompleted,
    isMaturityOverdue: Boolean(maturityDate) && maturityDate < todayYmd && !isCompleted,
    isThisMonth: Boolean(maturityDate) && maturityDate.startsWith(thisMonth),
    isNextMonth: Boolean(maturityDate) && maturityDate.startsWith(nextMonth),
    isWithin30Days: Boolean(maturityDate) && maturityDate >= todayYmd && maturityDate <= thirtyDaysLater && !isCompleted,
    isContactOverdue: Boolean(nextContactDate) && nextContactDate < todayYmd && !isCompleted
  };
}

function dateSortValue(value: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function dateTimeSortValue(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getNextMonth(todayYmd: string) {
  const [year, month] = todayYmd.split("-").map(Number);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
}

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function toYmd(value: string) {
  return value.slice(0, 10);
}

function getTodayYmd() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function addDaysYmd(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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

function groupByContractId<T extends { contract_id: string }>(items: T[]) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const values = map.get(item.contract_id) ?? [];
    values.push(item);
    map.set(item.contract_id, values);
  }
  return map;
}
