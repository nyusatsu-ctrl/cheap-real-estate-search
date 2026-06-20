export type SalesVehicleType = "car" | "bike";
export type SalesContractType = "cash" | "loan" | "lease";
export type SalesFinanceCompany = "premium" | "aplus" | "ast";
export type SalesLeaseCompany = "premium" | "aplus_showa";
export type SalesApprovalStatus = "unrequested" | "pending" | "approved" | "guarantor_required" | "rejected";
export type SalesContractStatus =
  | "contracted"
  | "waiting_delivery"
  | "delivered"
  | "repayment"
  | "payment_delay_contacted"
  | "payoff_scheduled"
  | "paid_off"
  | "leasing"
  | "lease_ended"
  | "cancelled"
  | "trouble";
export type SalesContactMethod = "phone" | "line" | "email" | "sms" | "visit" | "other";
export type SalesContactStatus = "normal" | "caution" | "payment_delay" | "repair_consultation" | "complaint" | "completed";
export type SalesDocumentVisibility = "admin" | "staff" | "public";

export type SalesCustomer = {
  id: string;
  name: string;
  kana: string | null;
  postal_code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  occupation: string | null;
  employer_name: string | null;
  employer_phone: string | null;
  annual_income: number | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SalesContract = {
  id: string;
  customer_id: string;
  source_system: string | null;
  source_row_key: string | null;
  source_row_number: number | null;
  source_received_at: string | null;
  source_snapshot_json: Record<string, unknown> | null;
  contract_date: string | null;
  delivery_date: string | null;
  vehicle_type: SalesVehicleType;
  contract_type: SalesContractType;
  sale_price: number | null;
  fees: number | null;
  total_price: number | null;
  down_payment: number | null;
  trade_in_amount: number | null;
  financed_amount: number | null;
  staff_name: string | null;
  status: SalesContractStatus;
  memo: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SalesVehicle = {
  id: string;
  contract_id: string;
  vehicle_type: SalesVehicleType;
  maker: string | null;
  model: string | null;
  grade: string | null;
  model_year: number | null;
  mileage: number | null;
  color: string | null;
  chassis_number: string | null;
  registration_number: string | null;
  inspection_expiry_date: string | null;
  compulsory_insurance_expiry_date: string | null;
  warranty_period: string | null;
  gps_installed: boolean;
  memo: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SalesLoan = {
  id: string;
  contract_id: string;
  finance_company: SalesFinanceCompany;
  application_number: string | null;
  contract_number: string | null;
  approval_status: SalesApprovalStatus | null;
  interest_rate: number | null;
  principal: number | null;
  installment_count: number | null;
  monthly_payment: number | null;
  bonus_payment_enabled: boolean;
  bonus_payment_amount: number | null;
  first_payment_date: string | null;
  final_payment_date: string | null;
  total_payment_amount: number | null;
  ownership_retention: boolean;
  memo: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SalesLease = {
  id: string;
  contract_id: string;
  lease_company: SalesLeaseCompany;
  partner_company: string | null;
  contract_number: string | null;
  lease_months: number | null;
  monthly_lease_fee: number | null;
  bonus_payment_enabled: boolean;
  bonus_payment_amount: number | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  residual_value_enabled: boolean;
  residual_value_amount: number | null;
  maintenance_included: boolean;
  owner_name: string | null;
  user_name: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SalesGuarantor = {
  id: string;
  contract_id: string;
  name: string;
  kana: string | null;
  relationship: string | null;
  postal_code: string | null;
  address: string | null;
  phone: string | null;
  employer_name: string | null;
  employer_phone: string | null;
  annual_income: number | null;
  identity_document_url: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SalesDocument = {
  id: string;
  contract_id: string;
  document_type: string;
  title: string | null;
  file_url: string | null;
  storage_path: string | null;
  visibility: SalesDocumentVisibility;
  memo: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SalesContactHistory = {
  id: string;
  contract_id: string;
  customer_id: string | null;
  handled_at: string | null;
  handled_by: string | null;
  method: SalesContactMethod;
  content: string;
  next_action_date: string | null;
  status: SalesContactStatus;
  attachment_url: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SalesContractListItem = {
  contract: SalesContract;
  customer: SalesCustomer | null;
  vehicle: SalesVehicle | null;
  loan: SalesLoan | null;
  lease: SalesLease | null;
};

export type SalesContractDetail = SalesContractListItem & {
  guarantors: SalesGuarantor[];
  documents: SalesDocument[];
  contactHistories: SalesContactHistory[];
};

export type SalesContractFilters = {
  keyword?: string;
  contractType?: SalesContractType;
  status?: SalesContractStatus;
  financeCompany?: SalesFinanceCompany;
};

export type SalesDataResult<T> = {
  data: T;
  tableMissing: boolean;
  errorMessage?: string;
};
