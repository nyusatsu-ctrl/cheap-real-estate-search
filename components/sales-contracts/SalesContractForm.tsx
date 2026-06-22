"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  APPROVAL_STATUS_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  CONTRACT_STATUS_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  FINANCE_COMPANY_LABELS,
  LEASE_COMPANY_LABELS,
  VEHICLE_TYPE_OPTIONS,
  getAllowedContractTypes,
  getAllowedFinanceCompanies,
  getAllowedLeaseCompanies,
  getInstallmentOptions,
  getSalesContractMissingRequiredFields,
  type SalesContractMissingRequiredField,
  validateSalesContractSelection
} from "@/lib/sales-contracts/rules";
import type {
  SalesContractDetail,
  SalesContractType,
  SalesDocument,
  SalesFinanceCompany,
  SalesLeaseCompany,
  SalesVehicleType
} from "@/lib/sales-contracts/types";

const inputClass = "rounded border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus-ring";
const checkboxClass = "h-4 w-4 rounded border-slate-300";

type SourceDefaults = {
  source_system?: string;
  source_row_key?: string;
  source_row_number?: string;
  source_received_at?: string;
  customer_name?: string;
  phone?: string;
  email?: string;
  prefecture?: string;
  employer_name?: string;
  desired_vehicle?: string;
  vehicle_type?: SalesVehicleType;
  contract_type?: SalesContractType;
  finance_company?: SalesFinanceCompany;
  payment_estimate?: string;
  application_amount?: string;
  payment_count?: string;
  initial_payment_amount?: string;
  monthly_payment?: string;
  total_payment_amount?: string;
  status?: string;
  review1?: string;
  review2?: string;
  source_memo?: string;
};

type RequiredFieldOverrides = {
  vehicleType: SalesVehicleType;
  contractType: SalesContractType;
  financeCompany: SalesFinanceCompany | "";
  leaseCompany: SalesLeaseCompany | "";
  installmentCount: number | null;
};

export function SalesContractForm({
  mode,
  action,
  detail,
  sourceDefaults
}: {
  mode: "create" | "edit";
  action: (formData: FormData) => void | Promise<void>;
  detail?: SalesContractDetail;
  sourceDefaults?: SourceDefaults;
}) {
  const contract = detail?.contract;
  const customer = detail?.customer;
  const vehicle = detail?.vehicle;
  const loan = detail?.loan;
  const lease = detail?.lease;
  const guarantor = detail?.guarantors[0] ?? null;
  const documentsByType = useMemo(() => new Map((detail?.documents ?? []).map((document) => [document.document_type, document])), [detail?.documents]);

  const sourceLinkMemo = buildSourceLinkMemo(sourceDefaults);
  const sourceSnapshotJson = buildSourceSnapshotJson(sourceDefaults);
  const sourceSystemValue = contract?.source_system ?? sourceDefaults?.source_system ?? "";
  const isLoanReviewImport = mode === "create" && sourceSystemValue === "gas_loan_review";
  const sourceReceivedAtValue = dateTimeLocalValue(contract?.source_received_at ?? sourceDefaults?.source_received_at);
  const sourceVehicleModel = vehicle?.model ?? sourceDefaults?.desired_vehicle ?? "";
  const sourceMonthlyPayment = firstPresentValue(
    loan?.monthly_payment,
    sourceDefaults?.monthly_payment,
    parsePaymentEstimateAmount(sourceDefaults?.payment_estimate)
  );
  const initialVehicleType = contract?.vehicle_type ?? sourceDefaults?.vehicle_type ?? "car";
  const initialContractType = contract?.contract_type ?? sourceDefaults?.contract_type ?? "cash";
  const initialContractStatus = contract?.status ?? (isLoanReviewImport ? "contract_candidate" : "contracted");
  const initialFinanceCompany: SalesFinanceCompany | "" = contract?.contract_type === "loan" ? loan?.finance_company ?? "" : initialContractType === "loan" ? sourceDefaults?.finance_company ?? "" : "";
  const initialLeaseCompany: SalesLeaseCompany | "" = contract?.contract_type === "lease" ? lease?.lease_company ?? "" : "";
  const initialInstallmentCount =
    loan?.installment_count ??
    (initialContractType === "loan" && initialFinanceCompany ? parseOptionalInteger(sourceDefaults?.payment_count) : null);

  const formRef = useRef<HTMLFormElement>(null);
  const [vehicleType, setVehicleType] = useState<SalesVehicleType>(initialVehicleType);
  const [contractType, setContractType] = useState<SalesContractType>(initialContractType);
  const [financeCompany, setFinanceCompany] = useState<SalesFinanceCompany | "">(initialFinanceCompany);
  const [leaseCompany, setLeaseCompany] = useState<SalesLeaseCompany | "">(initialLeaseCompany);
  const [installmentCount, setInstallmentCount] = useState<number | null>(initialInstallmentCount);
  const [clearFinancialDefaults, setClearFinancialDefaults] = useState(false);
  const initialRequiredInput = {
    customerName: customer?.name ?? sourceDefaults?.customer_name,
    phone: customer?.phone ?? sourceDefaults?.phone,
    vehicleType: initialVehicleType,
    contractType: initialContractType,
    vehicleModel: sourceVehicleModel,
    salePrice: contract?.sale_price,
    financeCompany: initialContractType === "loan" ? initialFinanceCompany : "",
    leaseCompany: initialContractType === "lease" ? initialLeaseCompany : "",
    installmentCount: initialContractType === "loan" ? initialInstallmentCount : null,
    principal: loan?.principal ?? sourceDefaults?.application_amount,
    monthlyPayment: initialContractType === "loan" ? sourceMonthlyPayment : "",
    firstPaymentDate: loan?.first_payment_date,
    leaseMonths: lease?.lease_months,
    monthlyLeaseFee: lease?.monthly_lease_fee,
    leaseStartDate: lease?.lease_start_date,
    leaseEndDate: lease?.lease_end_date
  };
  const [missingRequiredFields, setMissingRequiredFields] = useState<SalesContractMissingRequiredField[]>(() => mode === "create" ? getSalesContractMissingRequiredFields(initialRequiredInput, {
    mode: isLoanReviewImport ? "candidate" : "contract"
  }) : []);
  const [unconfirmedFields, setUnconfirmedFields] = useState<SalesContractMissingRequiredField[]>(() => isLoanReviewImport
    ? getUnconfirmedFields(
      getSalesContractMissingRequiredFields(initialRequiredInput),
      getSalesContractMissingRequiredFields(initialRequiredInput, { mode: "candidate" })
    )
    : []);

  const allowedContractTypes = getAllowedContractTypes(vehicleType);
  const allowedFinanceCompanies = getAllowedFinanceCompanies(vehicleType);
  const allowedLeaseCompanies = getAllowedLeaseCompanies(vehicleType);
  const installmentOptions = getInstallmentOptions(vehicleType, financeCompany);
  const validation = validateSalesContractSelection({
    vehicleType,
    contractType,
    financeCompany: contractType === "loan" ? financeCompany : "",
    leaseCompany: contractType === "lease" ? leaseCompany : "",
    installmentCount,
    allowIncompleteTerms: isLoanReviewImport
  });
  const missingRequiredFieldKeys = useMemo(() => new Set(missingRequiredFields.map((field) => field.key)), [missingRequiredFields]);
  const unconfirmedFieldKeys = useMemo(() => new Set(unconfirmedFields.map((field) => field.key)), [unconfirmedFields]);
  const blockingMessages = useMemo(() => {
    const requiredMessages = missingRequiredFields.map((field) => field.message);
    const selectionMessages = validation.errors.filter((message) => !isCoveredByRequiredFieldMessage(message, missingRequiredFieldKeys));
    return uniqueMessages([...requiredMessages, ...selectionMessages]);
  }, [missingRequiredFieldKeys, missingRequiredFields, validation.errors]);
  const canSubmit = mode === "create" ? blockingMessages.length === 0 : validation.valid;
  const financialNumberValue = (value: number | string | null | undefined) => clearFinancialDefaults ? "" : numberValue(value);
  const financialDateValue = (value: string | null | undefined) => clearFinancialDefaults ? "" : dateValue(value);
  const financialTextValue = (value: string | null | undefined) => clearFinancialDefaults ? "" : value;
  const financialCheckboxValue = (value: boolean | null | undefined) => clearFinancialDefaults ? false : value ?? false;
  const isMissing = (key: string) => mode === "create" && missingRequiredFieldKeys.has(key);
  const isUnconfirmed = (key: string) => isLoanReviewImport && unconfirmedFieldKeys.has(key) && !missingRequiredFieldKeys.has(key);

  const refreshMissingRequiredFields = useCallback((overrides: Partial<RequiredFieldOverrides> = {}) => {
    if (mode !== "create") {
      setMissingRequiredFields([]);
      return;
    }

    const formData = formRef.current ? new FormData(formRef.current) : null;
    const read = (key: string) => formData?.get(key)?.toString() ?? "";
    const currentVehicleType = overrides.vehicleType ?? ((read("vehicle_type") as SalesVehicleType | "") || vehicleType);
    const currentContractType = overrides.contractType ?? ((read("contract_type") as SalesContractType | "") || contractType);
    const currentFinanceCompany = overrides.financeCompany ?? ((read("finance_company") as SalesFinanceCompany | "") || financeCompany);
    const currentLeaseCompany = overrides.leaseCompany ?? ((read("lease_company") as SalesLeaseCompany | "") || leaseCompany);
    const currentInstallmentCount = "installmentCount" in overrides ? overrides.installmentCount : read("installment_count") || installmentCount;

    const requiredInput = {
      customerName: read("customer_name"),
      phone: read("phone"),
      vehicleType: currentVehicleType,
      contractType: currentContractType,
      vehicleModel: read("model"),
      salePrice: read("sale_price"),
      financeCompany: currentContractType === "loan" ? currentFinanceCompany : "",
      leaseCompany: currentContractType === "lease" ? currentLeaseCompany : "",
      installmentCount: currentContractType === "loan" ? currentInstallmentCount : null,
      principal: read("principal"),
      monthlyPayment: read("monthly_payment"),
      firstPaymentDate: read("first_payment_date"),
      leaseMonths: read("lease_months"),
      monthlyLeaseFee: read("monthly_lease_fee"),
      leaseStartDate: read("lease_start_date"),
      leaseEndDate: read("lease_end_date")
    };
    const blockingFields = getSalesContractMissingRequiredFields(requiredInput, {
      mode: isLoanReviewImport ? "candidate" : "contract"
    });

    setMissingRequiredFields(blockingFields);
    setUnconfirmedFields(isLoanReviewImport ? getUnconfirmedFields(getSalesContractMissingRequiredFields(requiredInput), blockingFields) : []);
  }, [contractType, financeCompany, installmentCount, isLoanReviewImport, leaseCompany, mode, vehicleType]);

  function handleVehicleTypeChange(nextValue: SalesVehicleType) {
    setVehicleType(nextValue);
    if (nextValue === "bike" && contractType === "lease") {
      setContractType("cash");
      resetFinancialFields();
      refreshMissingRequiredFields({ vehicleType: nextValue, contractType: "cash", financeCompany: "", leaseCompany: "", installmentCount: null });
      return;
    }
    if (financeCompany && !getAllowedFinanceCompanies(nextValue).some((option) => option.value === financeCompany)) {
      setFinanceCompany("");
      setInstallmentCount(null);
      refreshMissingRequiredFields({ vehicleType: nextValue, financeCompany: "", installmentCount: null });
      return;
    }
    if (financeCompany && installmentCount && !getInstallmentOptions(nextValue, financeCompany).includes(installmentCount)) {
      setInstallmentCount(null);
      refreshMissingRequiredFields({ vehicleType: nextValue, installmentCount: null });
      return;
    }
    refreshMissingRequiredFields({ vehicleType: nextValue });
  }

  function handleContractTypeChange(nextValue: SalesContractType) {
    if (!allowedContractTypes.some((option) => option.value === nextValue)) return;
    setContractType(nextValue);
    if (nextValue === "cash") {
      resetFinancialFields();
      refreshMissingRequiredFields({ contractType: "cash", financeCompany: "", leaseCompany: "", installmentCount: null });
      return;
    }
    if (nextValue === "loan") {
      setLeaseCompany("");
      if (financeCompany && !allowedFinanceCompanies.some((option) => option.value === financeCompany)) {
        setFinanceCompany("");
        refreshMissingRequiredFields({ contractType: "loan", financeCompany: "", leaseCompany: "", installmentCount: null });
        return;
      }
      if (financeCompany && installmentCount && !getInstallmentOptions(vehicleType, financeCompany).includes(installmentCount)) {
        setInstallmentCount(null);
        refreshMissingRequiredFields({ contractType: "loan", financeCompany, leaseCompany: "", installmentCount: null });
        return;
      }
      refreshMissingRequiredFields({ contractType: "loan", financeCompany, leaseCompany: "" });
      return;
    }
    if (nextValue === "lease") {
      setFinanceCompany("");
      setInstallmentCount(null);
      if (leaseCompany && !allowedLeaseCompanies.some((option) => option.value === leaseCompany)) {
        setLeaseCompany("");
        refreshMissingRequiredFields({ contractType: "lease", financeCompany: "", leaseCompany: "", installmentCount: null });
        return;
      }
      refreshMissingRequiredFields({ contractType: "lease", financeCompany: "", leaseCompany, installmentCount: null });
    }
  }

  function handleFinanceCompanyChange(nextValue: SalesFinanceCompany | "") {
    setFinanceCompany(nextValue);
    if (!nextValue || (installmentCount && !getInstallmentOptions(vehicleType, nextValue).includes(installmentCount))) {
      setInstallmentCount(null);
      refreshMissingRequiredFields({ financeCompany: nextValue, installmentCount: null });
      return;
    }
    refreshMissingRequiredFields({ financeCompany: nextValue });
  }

  function handleLeaseCompanyChange(nextValue: SalesLeaseCompany | "") {
    setLeaseCompany(nextValue);
    refreshMissingRequiredFields({ leaseCompany: nextValue });
  }

  function handleInstallmentCountChange(nextValue: string) {
    const nextCount = nextValue ? Number(nextValue) : null;
    setInstallmentCount(nextCount);
    refreshMissingRequiredFields({ installmentCount: nextCount });
  }

  function resetFinancialFields() {
    setFinanceCompany("");
    setLeaseCompany("");
    setInstallmentCount(null);
    setClearFinancialDefaults(true);
  }

  return (
    <form ref={formRef} action={action} className="space-y-5" onChange={() => refreshMissingRequiredFields()}>
      {mode === "edit" && detail ? (
        <>
          <input type="hidden" name="contract_id" value={detail.contract.id} />
          <input type="hidden" name="customer_id" value={detail.customer?.id ?? ""} />
          <input type="hidden" name="vehicle_id" value={detail.vehicle?.id ?? ""} />
          <input type="hidden" name="loan_id" value={detail.loan?.id ?? ""} />
          <input type="hidden" name="lease_id" value={detail.lease?.id ?? ""} />
          <input type="hidden" name="guarantor_id" value={guarantor?.id ?? ""} />
        </>
      ) : null}

      <input type="hidden" name="source_system" value={sourceSystemValue} />
      <input type="hidden" name="source_row_key" value={contract?.source_row_key ?? sourceDefaults?.source_row_key ?? ""} />
      <input type="hidden" name="source_row_number" value={contract?.source_row_number?.toString() ?? sourceDefaults?.source_row_number ?? ""} />
      <input type="hidden" name="source_received_at" value={sourceReceivedAtValue} />
      <input type="hidden" name="source_snapshot_json" value={contract?.source_snapshot_json ? JSON.stringify(contract.source_snapshot_json, null, 2) : sourceSnapshotJson} />

      <MissingRequiredFieldsNotice messages={blockingMessages} />
      <UnconfirmedContractFieldsNotice fields={unconfirmedFields} />

      <Section title="顧客情報">
        <div className="grid gap-3 md:grid-cols-3">
          <TextField label="氏名" name="customer_name" defaultValue={customer?.name ?? sourceDefaults?.customer_name} required missing={isMissing("customer_name")} />
          <TextField label="フリガナ" name="customer_kana" defaultValue={customer?.kana} />
          <TextField label="郵便番号" name="postal_code" defaultValue={customer?.postal_code} />
          <TextField label="住所" name="address" defaultValue={customer?.address ?? sourceDefaults?.prefecture} className="md:col-span-3" />
          <TextField label="電話番号" name="phone" defaultValue={customer?.phone ?? sourceDefaults?.phone} missing={isMissing("phone")} />
          <TextField label="メール" name="email" type="email" defaultValue={customer?.email ?? sourceDefaults?.email} />
          <TextField label="生年月日" name="birth_date" type="date" defaultValue={dateValue(customer?.birth_date)} />
          <TextField label="職業" name="occupation" defaultValue={customer?.occupation} />
          <TextField label="勤務先" name="employer_name" defaultValue={customer?.employer_name ?? sourceDefaults?.employer_name} />
          <TextField label="勤務先電話番号" name="employer_phone" defaultValue={customer?.employer_phone} />
          <TextField label="年収" name="annual_income" type="number" defaultValue={numberValue(customer?.annual_income)} />
          <TextareaField label="備考" name="customer_memo" defaultValue={customer?.memo} className="md:col-span-2" />
        </div>
      </Section>

      <Section title="契約情報">
        <div className="grid gap-3 md:grid-cols-4">
          <TextField label="契約日" name="contract_date" type="date" defaultValue={dateValue(contract?.contract_date)} />
          <TextField label="納車日" name="delivery_date" type="date" defaultValue={dateValue(contract?.delivery_date)} />
          <SelectField label="車・バイク" name="vehicle_type" value={vehicleType} onChange={(value) => handleVehicleTypeChange(value as SalesVehicleType)} missing={isMissing("vehicle_type")}>
            {VEHICLE_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectField>
          <SelectField label="契約方法" name="contract_type" value={contractType} onChange={(value) => handleContractTypeChange(value as SalesContractType)}>
            {allowedContractTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectField>
          <TextField
            label="契約金額"
            name="sale_price"
            type="number"
            defaultValue={numberValue(contract?.sale_price)}
            required={contractType === "cash" && !isLoanReviewImport}
            missing={isMissing("sale_price") || isMissing("principal") || isUnconfirmed("sale_price") || isUnconfirmed("principal")}
            helperText={isUnconfirmed("sale_price") || isUnconfirmed("principal") ? "正式契約までに契約金額またはローン元金を入力してください。" : undefined}
          />
          <TextField label="諸費用" name="fees" type="number" defaultValue={numberValue(contract?.fees)} />
          <TextField label="総支払額" name="total_price" type="number" defaultValue={numberValue(contract?.total_price)} />
          <TextField label="頭金" name="down_payment" type="number" defaultValue={numberValue(contract?.down_payment)} />
          <TextField label="下取金額" name="trade_in_amount" type="number" defaultValue={numberValue(contract?.trade_in_amount)} />
          <TextField label="ローン元金" name="financed_amount" type="number" defaultValue={numberValue(contract?.financed_amount)} />
          <TextField label="担当者" name="staff_name" defaultValue={contract?.staff_name} />
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            契約ステータス
            <select name="status" defaultValue={initialContractStatus} className={inputClass}>
              {CONTRACT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <TextareaField label="備考" name="contract_memo" defaultValue={contract?.memo ?? sourceLinkMemo} className="md:col-span-4" />
        </div>
      </Section>

      <Section title="車両情報">
        <div className="grid gap-3 md:grid-cols-4">
          <TextField label="メーカー" name="maker" defaultValue={vehicle?.maker} />
          <TextField
            label="車種"
            name="model"
            defaultValue={sourceVehicleModel}
            required={mode === "create" && !isLoanReviewImport}
            missing={isMissing("model") || isUnconfirmed("model")}
            helperText={isUnconfirmed("model") ? "正式契約までに車種を入力してください。" : undefined}
          />
          <TextField label="グレード" name="grade" defaultValue={vehicle?.grade} />
          <TextField label="年式" name="model_year" type="number" defaultValue={numberValue(vehicle?.model_year)} />
          <TextField label="走行距離" name="mileage" type="number" defaultValue={numberValue(vehicle?.mileage)} />
          <TextField label="色" name="color" defaultValue={vehicle?.color} />
          <TextField label="車台番号" name="chassis_number" defaultValue={vehicle?.chassis_number} />
          <TextField label="登録番号・ナンバー" name="registration_number" defaultValue={vehicle?.registration_number} />
          <TextField label="車検満了日" name="inspection_expiry_date" type="date" defaultValue={dateValue(vehicle?.inspection_expiry_date)} />
          <TextField label="自賠責満了日" name="compulsory_insurance_expiry_date" type="date" defaultValue={dateValue(vehicle?.compulsory_insurance_expiry_date)} />
          <TextField label="保証期間" name="warranty_period" defaultValue={vehicle?.warranty_period} />
          <label className="flex items-center gap-2 pt-7 text-sm font-bold text-slate-700">
            <input name="gps_installed" type="checkbox" defaultChecked={vehicle?.gps_installed ?? false} className={checkboxClass} />
            GPS装着あり
          </label>
          <TextareaField label="車両メモ" name="vehicle_memo" defaultValue={vehicle?.memo} className="md:col-span-4" />
        </div>
      </Section>

      {contractType === "loan" ? (
        <Section title="ローン情報">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="grid gap-1 text-sm font-bold text-slate-700">
              信販会社
              <select
                name="finance_company"
                value={financeCompany}
                onChange={(event) => handleFinanceCompanyChange(event.target.value as SalesFinanceCompany | "")}
                required={!isLoanReviewImport}
                aria-invalid={isMissing("finance_company") || isUnconfirmed("finance_company") || undefined}
                className={fieldClass(isMissing("finance_company") || isUnconfirmed("finance_company"))}
              >
                <option value="">選択</option>
                {allowedFinanceCompanies.map((option) => <option key={option.value} value={option.value}>{FINANCE_COMPANY_LABELS[option.value]}</option>)}
              </select>
              {isMissing("finance_company") ? <span className="text-xs font-bold text-amber-700">信販会社を選択してください。</span> : null}
              {isUnconfirmed("finance_company") ? <span className="text-xs font-bold text-amber-700">正式契約までに信販会社を選択してください。</span> : null}
            </label>
            <TextField label="信販申込番号" name="application_number" defaultValue={financialTextValue(loan?.application_number)} />
            <TextField label="契約番号" name="loan_contract_number" defaultValue={financialTextValue(loan?.contract_number)} />
            <label className="grid gap-1 text-sm font-bold text-slate-700">
              審査結果
              <select name="approval_status" defaultValue={clearFinancialDefaults ? "" : loan?.approval_status ?? ""} className={inputClass}>
                <option value="">未設定</option>
                {APPROVAL_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <TextField label="金利" name="interest_rate" type="number" step="0.001" defaultValue={financialNumberValue(loan?.interest_rate)} />
            <TextField
              label="ローン元金"
              name="principal"
              type="number"
              defaultValue={financialNumberValue(loan?.principal ?? sourceDefaults?.application_amount)}
              missing={isMissing("principal") || isUnconfirmed("principal")}
              helperText={isUnconfirmed("principal") ? "正式契約までに契約金額またはローン元金を入力してください。" : "契約金額またはローン元金を入力してください。"}
            />
            <label className="grid gap-1 text-sm font-bold text-slate-700">
              支払回数
              <select
                name="installment_count"
                value={installmentCount ?? ""}
                onChange={(event) => handleInstallmentCountChange(event.target.value)}
                required={!isLoanReviewImport}
                aria-invalid={isMissing("installment_count") || isUnconfirmed("installment_count") || undefined}
                className={fieldClass(isMissing("installment_count") || isUnconfirmed("installment_count"))}
              >
                <option value="">選択</option>
                {installmentOptions.map((count) => <option key={count} value={count}>{count}回</option>)}
              </select>
              {isMissing("installment_count") ? <span className="text-xs font-bold text-amber-700">支払回数を選択してください。支払回数が未確定の場合は、審査結果確定後に入力してください。</span> : null}
              {isUnconfirmed("installment_count") ? <span className="text-xs font-bold text-amber-700">正式契約までに支払回数を選択してください。</span> : null}
            </label>
            <TextField label="初回支払額" name="initial_payment_amount" type="number" defaultValue={financialNumberValue(loan?.initial_payment_amount ?? sourceDefaults?.initial_payment_amount)} />
            <TextField
              label="月額"
              name="monthly_payment"
              type="number"
              defaultValue={financialNumberValue(sourceMonthlyPayment)}
              missing={isMissing("monthly_payment") || isUnconfirmed("monthly_payment")}
              helperText={isUnconfirmed("monthly_payment") ? "正式契約までに月額を入力してください。" : undefined}
            />
            <TextField label="最終支払額" name="final_payment_amount" type="number" defaultValue={financialNumberValue(loan?.final_payment_amount)} />
            <TextField
              label="支払開始日"
              name="first_payment_date"
              type="date"
              defaultValue={financialDateValue(loan?.first_payment_date)}
              missing={isMissing("first_payment_date") || isUnconfirmed("first_payment_date")}
              helperText={isUnconfirmed("first_payment_date") ? "正式契約までに支払開始日を入力してください。" : undefined}
            />
            <TextField label="支払終了日" name="final_payment_date" type="date" defaultValue={financialDateValue(loan?.final_payment_date)} />
            <label className="flex items-center gap-2 pt-7 text-sm font-bold text-slate-700">
              <input name="loan_bonus_payment_enabled" type="checkbox" defaultChecked={financialCheckboxValue(loan?.bonus_payment_enabled)} className={checkboxClass} />
              ボーナス払いあり
            </label>
            <TextField label="ボーナス払い額" name="bonus_payment_amount" type="number" defaultValue={financialNumberValue(loan?.bonus_payment_amount)} />
            <TextField label="支払総額" name="total_payment_amount" type="number" defaultValue={financialNumberValue(loan?.total_payment_amount ?? sourceDefaults?.total_payment_amount)} />
            <label className="flex items-center gap-2 pt-7 text-sm font-bold text-slate-700">
              <input name="ownership_retention" type="checkbox" defaultChecked={financialCheckboxValue(loan?.ownership_retention)} className={checkboxClass} />
              所有権留保あり
            </label>
            <TextareaField label="ローンメモ" name="loan_memo" defaultValue={financialTextValue(loan?.memo)} className="md:col-span-4" />
          </div>
        </Section>
      ) : null}

      {contractType === "lease" ? (
        <Section title="リース情報">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="grid gap-1 text-sm font-bold text-slate-700">
              リース会社
              <select
                name="lease_company"
                value={leaseCompany}
                onChange={(event) => handleLeaseCompanyChange(event.target.value as SalesLeaseCompany | "")}
                required={!isLoanReviewImport}
                aria-invalid={isMissing("lease_company") || isUnconfirmed("lease_company") || undefined}
                className={fieldClass(isMissing("lease_company") || isUnconfirmed("lease_company"))}
              >
                <option value="">選択</option>
                {allowedLeaseCompanies.map((option) => <option key={option.value} value={option.value}>{LEASE_COMPANY_LABELS[option.value]}</option>)}
              </select>
              {isMissing("lease_company") ? <span className="text-xs font-bold text-amber-700">リース会社を選択してください。</span> : null}
              {isUnconfirmed("lease_company") ? <span className="text-xs font-bold text-amber-700">正式契約までにリース会社を選択してください。</span> : null}
            </label>
            <TextField label="提携会社" name="partner_company" defaultValue={financialTextValue(lease?.partner_company)} />
            <TextField label="契約番号" name="lease_contract_number" defaultValue={financialTextValue(lease?.contract_number)} />
            <TextField
              label="支払回数・契約期間（月）"
              name="lease_months"
              type="number"
              defaultValue={financialNumberValue(lease?.lease_months)}
              missing={isMissing("lease_months") || isUnconfirmed("lease_months")}
              helperText={isUnconfirmed("lease_months") ? "正式契約までにリース期間を入力してください。" : undefined}
            />
            <TextField label="初回支払額" name="initial_payment_amount" type="number" defaultValue={financialNumberValue(lease?.initial_payment_amount)} />
            <TextField
              label="月額"
              name="monthly_lease_fee"
              type="number"
              defaultValue={financialNumberValue(lease?.monthly_lease_fee)}
              missing={isMissing("monthly_lease_fee") || isUnconfirmed("monthly_lease_fee")}
              helperText={isUnconfirmed("monthly_lease_fee") ? "正式契約までに月額を入力してください。" : undefined}
            />
            <TextField label="最終支払額" name="final_payment_amount" type="number" defaultValue={financialNumberValue(lease?.final_payment_amount)} />
            <TextField
              label="支払開始日"
              name="lease_start_date"
              type="date"
              defaultValue={financialDateValue(lease?.lease_start_date)}
              missing={isMissing("lease_start_date") || isUnconfirmed("lease_start_date")}
              helperText={isUnconfirmed("lease_start_date") ? "正式契約までに支払開始日を入力してください。" : undefined}
            />
            <TextField
              label="支払終了日"
              name="lease_end_date"
              type="date"
              defaultValue={financialDateValue(lease?.lease_end_date)}
              missing={isMissing("lease_end_date") || isUnconfirmed("lease_end_date")}
              helperText={isUnconfirmed("lease_end_date") ? "正式契約までに支払終了日を入力してください。" : undefined}
            />
            <label className="flex items-center gap-2 pt-7 text-sm font-bold text-slate-700">
              <input name="lease_bonus_payment_enabled" type="checkbox" defaultChecked={financialCheckboxValue(lease?.bonus_payment_enabled)} className={checkboxClass} />
              ボーナス払いあり
            </label>
            <TextField label="ボーナス払い額" name="lease_bonus_payment_amount" type="number" defaultValue={financialNumberValue(lease?.bonus_payment_amount)} />
            <label className="flex items-center gap-2 pt-7 text-sm font-bold text-slate-700">
              <input name="residual_value_enabled" type="checkbox" defaultChecked={financialCheckboxValue(lease?.residual_value_enabled)} className={checkboxClass} />
              残価設定あり
            </label>
            <TextField label="残価金額" name="residual_value_amount" type="number" defaultValue={financialNumberValue(lease?.residual_value_amount)} />
            <label className="flex items-center gap-2 pt-7 text-sm font-bold text-slate-700">
              <input name="maintenance_included" type="checkbox" defaultChecked={financialCheckboxValue(lease?.maintenance_included)} className={checkboxClass} />
              メンテナンス込み
            </label>
            <TextField label="所有者" name="owner_name" defaultValue={financialTextValue(lease?.owner_name)} />
            <TextField label="使用者" name="user_name" defaultValue={financialTextValue(lease?.user_name)} />
            <TextareaField label="リースメモ" name="lease_memo" defaultValue={financialTextValue(lease?.memo)} className="md:col-span-4" />
          </div>
        </Section>
      ) : null}

      {contractType === "cash" ? (
        <Section title="現金情報">
          <p className="text-sm font-semibold text-slate-700">
            現金契約では信販会社、支払回数、月額などのローン・リース項目は使用しません。契約金額と頭金を確認してください。
          </p>
        </Section>
      ) : null}

      <CollapsibleSection title="保証人情報" summary="必要な場合だけ入力">
        <div className="grid gap-3 md:grid-cols-3">
          <TextField label="保証人氏名" name="guarantor_name" defaultValue={guarantor?.name} />
          <TextField label="フリガナ" name="guarantor_kana" defaultValue={guarantor?.kana} />
          <TextField label="続柄" name="guarantor_relationship" defaultValue={guarantor?.relationship} />
          <TextField label="郵便番号" name="guarantor_postal_code" defaultValue={guarantor?.postal_code} />
          <TextField label="住所" name="guarantor_address" defaultValue={guarantor?.address} className="md:col-span-2" />
          <TextField label="電話番号" name="guarantor_phone" defaultValue={guarantor?.phone} />
          <TextField label="勤務先" name="guarantor_employer_name" defaultValue={guarantor?.employer_name} />
          <TextField label="勤務先電話番号" name="guarantor_employer_phone" defaultValue={guarantor?.employer_phone} />
          <TextField label="年収" name="guarantor_annual_income" type="number" defaultValue={numberValue(guarantor?.annual_income)} />
          <TextField label="本人確認書類URL" name="guarantor_identity_document_url" type="url" defaultValue={guarantor?.identity_document_url} className="md:col-span-2" />
          <TextareaField label="備考" name="guarantor_memo" defaultValue={guarantor?.memo} className="md:col-span-3" />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="書類URL" summary="契約書類や本人確認書類のURLを後から追加">
        <div className="grid gap-3 md:grid-cols-2">
          {DOCUMENT_TYPE_OPTIONS.map((option) => {
            const document = documentsByType.get(option.value) as SalesDocument | undefined;
            return (
              <div key={option.value} className="rounded border border-slate-200 bg-slate-50 p-3">
                <input type="hidden" name={`document_${option.value}_id`} value={document?.id ?? ""} />
                <input type="hidden" name={`document_${option.value}_title`} value={document?.title ?? option.label} />
                <label className="grid gap-1 text-sm font-bold text-slate-700">
                  {option.label}
                  <input name={`document_${option.value}_url`} type="url" defaultValue={document?.file_url ?? ""} className={inputClass} />
                </label>
                <input name={`document_${option.value}_storage_path`} type="hidden" value={document?.storage_path ?? ""} />
                <input name={`document_${option.value}_visibility`} type="hidden" value={document?.visibility ?? "admin"} />
                <input name={`document_${option.value}_memo`} type="hidden" value={document?.memo ?? ""} />
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {mode === "create" ? (
        <CollapsibleSection title="初回対応履歴" summary="初回の連絡内容を残す場合だけ入力">
          <div className="grid gap-3 md:grid-cols-3">
            <TextField label="対応日時" name="contact_handled_at" type="datetime-local" />
            <TextField label="対応者" name="contact_handled_by" />
            <label className="grid gap-1 text-sm font-bold text-slate-700">
              対応方法
              <select name="contact_method" defaultValue="phone" className={inputClass}>
                {CONTACT_METHOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold text-slate-700">
              ステータス
              <select name="contact_status" defaultValue="normal" className={inputClass}>
                {CONTACT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <TextField label="次回対応日" name="contact_next_action_date" type="date" />
            <TextField label="添付URL" name="contact_attachment_url" type="url" />
            <TextareaField label="対応内容" name="contact_content" className="md:col-span-3" />
            <TextareaField label="備考" name="contact_memo" className="md:col-span-3" />
          </div>
        </CollapsibleSection>
      ) : null}

      <CollapsibleSection title="申込参照情報" summary="申込元の詳細を確認">
        <SourceReferenceDetails
          sourceSystem={contract?.source_system ?? sourceDefaults?.source_system}
          sourceRowKey={contract?.source_row_key ?? sourceDefaults?.source_row_key}
          sourceRowNumber={contract?.source_row_number?.toString() ?? sourceDefaults?.source_row_number}
          sourceReceivedAt={contract?.source_received_at ?? sourceDefaults?.source_received_at}
          sourceSnapshotJson={formatSourceSnapshotForDisplay(contract?.source_snapshot_json ?? sourceDefaults)}
        />
      </CollapsibleSection>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          {blockingMessages.length > 0 ? (
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-black">契約登録に必要な項目が不足しています</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 font-bold">
                {blockingMessages.map((message) => <li key={message}>{message}</li>)}
              </ul>
            </div>
          ) : unconfirmedFields.length > 0 ? (
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-black">契約候補として保存できます</p>
              <p className="mt-1 font-semibold">正式契約前に未確定項目を確認してください。</p>
            </div>
          ) : (
            <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">
              入力内容を確認して登録できます。
            </p>
          )}
        </div>
        <button
          className="rounded bg-brand-700 px-5 py-3 text-sm font-black text-white focus-ring disabled:cursor-not-allowed disabled:opacity-60 md:min-w-36"
          disabled={!canSubmit}
        >
          {isLoanReviewImport ? "契約候補として保存" : mode === "create" ? "契約を登録" : "契約を保存"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function CollapsibleSection({
  title,
  summary,
  children
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
          <span className="text-sm font-bold text-brand-700">詳細を表示</span>
        </div>
        <p className="mt-1 text-sm text-slate-600">{summary}</p>
      </summary>
      <div className="mt-3 border-t border-slate-100 pt-3">{children}</div>
    </details>
  );
}

function MissingRequiredFieldsNotice({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
      <p className="font-black">契約登録に必要な項目が不足しています</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 font-bold">
        {messages.map((message) => <li key={message}>{message}</li>)}
      </ul>
    </div>
  );
}

function UnconfirmedContractFieldsNotice({ fields }: { fields: SalesContractMissingRequiredField[] }) {
  if (fields.length === 0) return null;

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 shadow-sm">
      <p className="font-black">契約候補として保存できます</p>
      <p className="mt-1 font-semibold">
        自社ローン審査管理からの連携のため、下記は未確定のまま保存できます。正式契約前に確定してください。
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 font-bold">
        {fields.map((field) => <li key={field.key}>{field.message}</li>)}
      </ul>
    </div>
  );
}

function SourceReferenceDetails({
  sourceSystem,
  sourceRowKey,
  sourceRowNumber,
  sourceReceivedAt,
  sourceSnapshotJson
}: {
  sourceSystem?: string | null;
  sourceRowKey?: string | null;
  sourceRowNumber?: string | null;
  sourceReceivedAt?: string | null;
  sourceSnapshotJson?: string | null;
}) {
  return (
    <div className="grid gap-3 text-sm md:grid-cols-4">
      <ReadonlyItem label="申込元" value={sourceSystem === "gas_loan_review" ? "自社ローン審査管理" : sourceSystem} />
      <ReadonlyItem label="申込ID" value={sourceRowKey} />
      <ReadonlyItem label="申込管理番号" value={sourceRowNumber} />
      <ReadonlyItem label="受信日時" value={sourceReceivedAt} />
      <div className="md:col-span-4">
        <p className="mb-1 font-bold text-slate-700">申込データ詳細</p>
        <pre className="max-h-72 overflow-auto rounded border border-slate-200 bg-slate-50 p-3 text-xs font-normal text-slate-700">
          {sourceSnapshotJson || "-"}
        </pre>
      </div>
    </div>
  );
}

function ReadonlyItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 break-words font-bold text-slate-900">{value || "-"}</p>
    </div>
  );
}

function TextField({
  label,
  name,
  defaultValue,
  required,
  type = "text",
  step,
  missing = false,
  helperText,
  className = ""
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  type?: string;
  step?: string;
  missing?: boolean;
  helperText?: string;
  className?: string;
}) {
  return (
    <label className={`grid gap-1 text-sm font-bold text-slate-700 ${className}`}>
      {label}
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue ?? ""}
        required={required}
        aria-invalid={missing || undefined}
        className={fieldClass(missing)}
      />
      {missing ? <span className="text-xs font-bold text-amber-700">{helperText ?? "この項目を入力してください。"}</span> : null}
    </label>
  );
}

function TextareaField({
  label,
  name,
  defaultValue,
  className = ""
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  className?: string;
}) {
  return (
    <label className={`grid gap-1 text-sm font-bold text-slate-700 ${className}`}>
      {label}
      <textarea name={name} defaultValue={defaultValue ?? ""} rows={3} className={inputClass} />
    </label>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  missing = false,
  children
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  missing?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      {label}
      <select name={name} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={missing || undefined} className={fieldClass(missing)}>
        {children}
      </select>
      {missing ? <span className="text-xs font-bold text-amber-700">この項目を選択してください。</span> : null}
    </label>
  );
}

function fieldClass(missing: boolean) {
  return missing ? `${inputClass} border-amber-500 bg-amber-50 ring-1 ring-amber-300` : inputClass;
}

function uniqueMessages(messages: string[]) {
  return Array.from(new Set(messages));
}

function getUnconfirmedFields(formalFields: SalesContractMissingRequiredField[], blockingFields: SalesContractMissingRequiredField[]) {
  const blockingKeys = new Set(blockingFields.map((field) => field.key));
  return formalFields.filter((field) => !blockingKeys.has(field.key));
}

function isCoveredByRequiredFieldMessage(message: string, missingRequiredFieldKeys: Set<string>) {
  if (missingRequiredFieldKeys.has("finance_company") && message.includes("信販会社")) return true;
  if (missingRequiredFieldKeys.has("lease_company") && message.includes("リース会社")) return true;
  if (missingRequiredFieldKeys.has("installment_count") && message.includes("支払回数")) return true;
  if (missingRequiredFieldKeys.has("vehicle_type") && message.includes("リース契約では車")) return true;
  return false;
}

function dateValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function dateTimeLocalValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function numberValue(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function firstPresentValue(...values: Array<number | string | null | undefined>) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") return value;
  }
  return "";
}

function parseOptionalInteger(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function parsePaymentEstimateAmount(value: string | null | undefined) {
  const normalized = toHalfWidthNumberText(String(value ?? "").trim()).replace(/,/g, "");
  if (!normalized) return "";
  const tenThousandMatch = normalized.match(/(\d+(?:\.\d+)?)\s*万/);
  if (tenThousandMatch) {
    const parsed = Number(tenThousandMatch[1]);
    return Number.isFinite(parsed) ? String(Math.round(parsed * 10000)) : "";
  }
  const digits = normalized.replace(/[^\d.-]/g, "");
  if (!digits) return "";
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? String(Math.round(parsed)) : "";
}

function toHalfWidthNumberText(value: string) {
  return value.replace(/[０-９．，]/g, (char) => {
    if (char === "．") return ".";
    if (char === "，") return ",";
    return String.fromCharCode(char.charCodeAt(0) - 0xfee0);
  });
}

function buildSourceLinkMemo(sourceDefaults?: SourceDefaults) {
  if (!sourceDefaults || !hasSourceDefaultValues(sourceDefaults)) return "";
  return sourceDefaults.source_memo ?? "";
}

function buildSourceSnapshotJson(sourceDefaults?: SourceDefaults) {
  if (!sourceDefaults || !hasSourceDefaultValues(sourceDefaults)) return "";
  const snapshot = Object.fromEntries(
    Object.entries(sourceDefaults).filter(([, value]) => value !== undefined && value !== "")
  );
  return JSON.stringify(snapshot, null, 2);
}

function hasSourceDefaultValues(sourceDefaults: SourceDefaults) {
  return Object.values(sourceDefaults).some((value) => value !== undefined && value !== "");
}

function formatSourceSnapshotForDisplay(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") return "";
  const labels: Record<string, string> = {
    source_system: "申込元",
    source_row_key: "申込ID",
    source_row_number: "申込管理番号",
    source_received_at: "受信日時",
    customer_name: "顧客名",
    phone: "電話番号",
    email: "メール",
    prefecture: "都道府県",
    employer_name: "勤務先",
    desired_vehicle: "希望車種",
    vehicle_type: "車両区分",
    contract_type: "契約方法",
    finance_company: "信販会社",
    payment_estimate: "支払目安",
    application_amount: "申込金額",
    payment_count: "支払回数",
    initial_payment_amount: "初回支払額",
    monthly_payment: "月額",
    total_payment_amount: "支払総額",
    status: "元ステータス",
    review1: "プレミア審査結果",
    review2: "アスト審査結果",
    source_memo: "対応メモ"
  };
  const entries = Object.entries(snapshot as Record<string, unknown>)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => [labels[key] ?? key, key === "source_system" && value === "gas_loan_review" ? "自社ローン審査管理" : value]);
  return entries.length ? JSON.stringify(Object.fromEntries(entries), null, 2) : "";
}
