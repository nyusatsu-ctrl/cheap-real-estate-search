import type {
  SalesApprovalStatus,
  SalesContactMethod,
  SalesContactStatus,
  SalesContractStatus,
  SalesContractType,
  SalesDocumentVisibility,
  SalesFinanceCompany,
  SalesLeaseMaturityChoice,
  SalesLeaseMaturityStatus,
  SalesLeaseCompany,
  SalesVehicleType
} from "@/lib/sales-contracts/types";

export const VEHICLE_TYPE_LABELS: Record<SalesVehicleType, string> = {
  car: "車",
  bike: "バイク"
};

export const CONTRACT_TYPE_LABELS: Record<SalesContractType, string> = {
  cash: "現金",
  loan: "ローン",
  lease: "リース"
};

export const FINANCE_COMPANY_LABELS: Record<SalesFinanceCompany, string> = {
  premium: "プレミアファイナンス",
  aplus: "アプラス",
  ast: "アスト"
};

export const LEASE_COMPANY_LABELS: Record<SalesLeaseCompany, string> = {
  premium: "プレミアファイナンス",
  aplus_showa: "アプラス＋昭和リース"
};

export const APPROVAL_STATUS_LABELS: Record<SalesApprovalStatus, string> = {
  unrequested: "未依頼",
  pending: "審査中",
  approved: "可決",
  guarantor_required: "審査中（要保証人）",
  rejected: "否決"
};

export const CONTRACT_STATUS_LABELS: Record<SalesContractStatus, string> = {
  contracted: "契約済",
  waiting_delivery: "納車待ち",
  delivered: "納車済",
  repayment: "返済中",
  payment_delay_contacted: "支払遅延連絡あり",
  payoff_scheduled: "完済予定",
  paid_off: "完済",
  leasing: "リース中",
  lease_ended: "リース終了",
  cancelled: "キャンセル",
  trouble: "トラブル対応中"
};

export const CONTACT_STATUS_LABELS: Record<SalesContactStatus, string> = {
  normal: "通常",
  caution: "要注意",
  payment_delay: "支払遅延",
  repair_consultation: "修理相談",
  complaint: "クレーム",
  completed: "完了"
};

export const CONTACT_METHOD_LABELS: Record<SalesContactMethod, string> = {
  phone: "電話",
  line: "LINE",
  email: "メール",
  sms: "SMS",
  visit: "来店",
  other: "その他"
};

export const DOCUMENT_VISIBILITY_LABELS: Record<SalesDocumentVisibility, string> = {
  admin: "管理者のみ",
  staff: "社内",
  public: "共有可"
};

export const LEASE_MATURITY_STATUS_LABELS: Record<SalesLeaseMaturityStatus, string> = {
  not_started: "未対応",
  notified: "案内済み",
  waiting_response: "回答待ち",
  purchase_planned: "買取予定",
  renewal_planned: "再リース予定",
  return_planned: "返却予定",
  completed: "完了"
};

export const LEASE_MATURITY_CHOICE_LABELS: Record<SalesLeaseMaturityChoice, string> = {
  undecided: "未定",
  purchase: "買取",
  renewal: "再リース",
  return: "返却"
};

export const DOCUMENT_TYPE_OPTIONS = [
  { value: "order_contract", label: "注文書・売買契約書" },
  { value: "finance_contract", label: "信販契約書" },
  { value: "lease_contract", label: "リース契約書" },
  { value: "identity_document", label: "本人確認書類" },
  { value: "guarantor_document", label: "保証人書類" },
  { value: "vehicle_inspection_certificate", label: "車検証" },
  { value: "compulsory_insurance", label: "自賠責" },
  { value: "delivery_confirmation", label: "納車確認書" },
  { value: "vehicle_photo", label: "車両写真" },
  { value: "gps_consent", label: "GPS同意書" }
] as const;

export const VEHICLE_TYPE_OPTIONS = Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => ({ value: value as SalesVehicleType, label }));
export const CONTRACT_TYPE_OPTIONS = Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => ({ value: value as SalesContractType, label }));
export const FINANCE_COMPANY_OPTIONS = Object.entries(FINANCE_COMPANY_LABELS).map(([value, label]) => ({ value: value as SalesFinanceCompany, label }));
export const LEASE_COMPANY_OPTIONS = Object.entries(LEASE_COMPANY_LABELS).map(([value, label]) => ({ value: value as SalesLeaseCompany, label }));
export const APPROVAL_STATUS_OPTIONS = Object.entries(APPROVAL_STATUS_LABELS).map(([value, label]) => ({ value: value as SalesApprovalStatus, label }));
export const CONTRACT_STATUS_OPTIONS = Object.entries(CONTRACT_STATUS_LABELS).map(([value, label]) => ({ value: value as SalesContractStatus, label }));
export const CONTACT_STATUS_OPTIONS = Object.entries(CONTACT_STATUS_LABELS).map(([value, label]) => ({ value: value as SalesContactStatus, label }));
export const CONTACT_METHOD_OPTIONS = Object.entries(CONTACT_METHOD_LABELS).map(([value, label]) => ({ value: value as SalesContactMethod, label }));
export const DOCUMENT_VISIBILITY_OPTIONS = Object.entries(DOCUMENT_VISIBILITY_LABELS).map(([value, label]) => ({ value: value as SalesDocumentVisibility, label }));
export const LEASE_MATURITY_STATUS_OPTIONS = Object.entries(LEASE_MATURITY_STATUS_LABELS).map(([value, label]) => ({ value: value as SalesLeaseMaturityStatus, label }));
export const LEASE_MATURITY_CHOICE_OPTIONS = Object.entries(LEASE_MATURITY_CHOICE_LABELS).map(([value, label]) => ({ value: value as SalesLeaseMaturityChoice, label }));

export function getAllowedContractTypes(vehicleType: SalesVehicleType) {
  return CONTRACT_TYPE_OPTIONS.filter((option) => vehicleType !== "bike" || option.value !== "lease");
}

export function getAllowedFinanceCompanies(vehicleType: SalesVehicleType) {
  return FINANCE_COMPANY_OPTIONS.filter((option) => vehicleType !== "bike" || option.value !== "aplus");
}

export function getAllowedLeaseCompanies(vehicleType: SalesVehicleType) {
  return vehicleType === "car" ? LEASE_COMPANY_OPTIONS : [];
}

export function getInstallmentOptions(vehicleType: SalesVehicleType, financeCompany: SalesFinanceCompany | "") {
  if (financeCompany === "premium") {
    const max = vehicleType === "bike" ? 60 : 84;
    return [12, 18, ...range(24, max)];
  }
  if (financeCompany === "aplus") {
    if (vehicleType === "bike") return [];
    return [12, 18, ...range(24, 84)];
  }
  if (financeCompany === "ast") {
    return [25, 32, 47];
  }
  return [];
}

export function validateSalesContractSelection(input: {
  vehicleType: SalesVehicleType;
  contractType: SalesContractType;
  financeCompany?: SalesFinanceCompany | "";
  leaseCompany?: SalesLeaseCompany | "";
  installmentCount?: number | null;
}) {
  const errors: string[] = [];

  if (input.vehicleType === "bike" && input.contractType === "lease") {
    errors.push("バイクではリース契約を選択できません。");
  }

  if (input.contractType === "cash" && (input.financeCompany || input.leaseCompany || input.installmentCount)) {
    errors.push("現金契約では信販会社・リース会社・支払回数を使用できません。");
  }

  if (input.contractType === "loan") {
    if (!input.financeCompany) {
      errors.push("ローン契約では信販会社を選択してください。");
    } else if (!getAllowedFinanceCompanies(input.vehicleType).some((option) => option.value === input.financeCompany)) {
      errors.push("選択された信販会社は、この車両区分では使用できません。");
    }

    const allowedInstallments = getInstallmentOptions(input.vehicleType, input.financeCompany || "");
    if (!input.installmentCount) {
      errors.push("支払回数を選択してください。支払回数が未確定の場合は、審査結果確定後に入力してください。");
    } else if (!allowedInstallments.includes(input.installmentCount)) {
      errors.push("選択された支払回数は、この車両区分・信販会社では使用できません。");
    }
  }

  if (input.contractType === "lease") {
    if (input.vehicleType !== "car") {
      errors.push("リース契約は車のみ選択できます。");
    }
    if (!input.leaseCompany) {
      errors.push("リース契約ではリース会社を選択してください。");
    } else if (!getAllowedLeaseCompanies(input.vehicleType).some((option) => option.value === input.leaseCompany)) {
      errors.push("選択されたリース会社は、この車両区分では使用できません。");
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function range(start: number, end: number) {
  const values: number[] = [];
  for (let value = start; value <= end; value += 1) values.push(value);
  return values;
}
