"use client";

import { useMemo, useState } from "react";
import {
  APPROVAL_STATUS_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  CONTRACT_STATUS_OPTIONS,
  CONTRACT_TYPE_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  FINANCE_COMPANY_LABELS,
  FINANCE_COMPANY_OPTIONS,
  LEASE_COMPANY_LABELS,
  LEASE_COMPANY_OPTIONS,
  VEHICLE_TYPE_OPTIONS,
  getAllowedContractTypes,
  getAllowedFinanceCompanies,
  getAllowedLeaseCompanies,
  getInstallmentOptions,
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

  const [vehicleType, setVehicleType] = useState<SalesVehicleType>(contract?.vehicle_type ?? "car");
  const [contractType, setContractType] = useState<SalesContractType>(contract?.contract_type ?? "cash");
  const [financeCompany, setFinanceCompany] = useState<SalesFinanceCompany>(loan?.finance_company ?? "premium");
  const [leaseCompany, setLeaseCompany] = useState<SalesLeaseCompany>(lease?.lease_company ?? "premium");
  const [installmentCount, setInstallmentCount] = useState<number | null>(loan?.installment_count ?? null);

  const allowedContractTypes = getAllowedContractTypes(vehicleType);
  const allowedFinanceCompanies = getAllowedFinanceCompanies(vehicleType);
  const allowedLeaseCompanies = getAllowedLeaseCompanies(vehicleType);
  const installmentOptions = getInstallmentOptions(vehicleType, financeCompany);
  const validation = validateSalesContractSelection({
    vehicleType,
    contractType,
    financeCompany: contractType === "loan" ? financeCompany : "",
    leaseCompany: contractType === "lease" ? leaseCompany : "",
    installmentCount
  });

  function handleVehicleTypeChange(nextValue: SalesVehicleType) {
    setVehicleType(nextValue);
    if (nextValue === "bike" && contractType === "lease") setContractType("cash");
    if (nextValue === "bike" && financeCompany === "aplus") setFinanceCompany("premium");
  }

  function handleContractTypeChange(nextValue: SalesContractType) {
    setContractType(nextValue);
    if (nextValue === "lease" && vehicleType === "bike") setVehicleType("car");
  }

  return (
    <form action={action} className="space-y-5">
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

      {!validation.valid ? (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          {validation.errors.join(" ")}
        </div>
      ) : null}

      <Section title="顧客情報">
        <div className="grid gap-3 md:grid-cols-3">
          <TextField label="氏名" name="customer_name" defaultValue={customer?.name} required />
          <TextField label="フリガナ" name="customer_kana" defaultValue={customer?.kana} />
          <TextField label="郵便番号" name="postal_code" defaultValue={customer?.postal_code} />
          <TextField label="住所" name="address" defaultValue={customer?.address} className="md:col-span-3" />
          <TextField label="電話番号" name="phone" defaultValue={customer?.phone} />
          <TextField label="メール" name="email" type="email" defaultValue={customer?.email} />
          <TextField label="生年月日" name="birth_date" type="date" defaultValue={dateValue(customer?.birth_date)} />
          <TextField label="職業" name="occupation" defaultValue={customer?.occupation} />
          <TextField label="勤務先" name="employer_name" defaultValue={customer?.employer_name} />
          <TextField label="勤務先電話番号" name="employer_phone" defaultValue={customer?.employer_phone} />
          <TextField label="年収" name="annual_income" type="number" defaultValue={numberValue(customer?.annual_income)} />
          <TextareaField label="備考" name="customer_memo" defaultValue={customer?.memo} className="md:col-span-2" />
        </div>
      </Section>

      <Section title="契約情報">
        <div className="grid gap-3 md:grid-cols-4">
          <TextField label="契約日" name="contract_date" type="date" defaultValue={dateValue(contract?.contract_date)} />
          <TextField label="納車日" name="delivery_date" type="date" defaultValue={dateValue(contract?.delivery_date)} />
          <SelectField label="車・バイク" name="vehicle_type" value={vehicleType} onChange={(value) => handleVehicleTypeChange(value as SalesVehicleType)}>
            {VEHICLE_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectField>
          <SelectField label="契約方法" name="contract_type" value={contractType} onChange={(value) => handleContractTypeChange(value as SalesContractType)}>
            {CONTRACT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} disabled={!allowedContractTypes.some((allowed) => allowed.value === option.value)}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <TextField label="販売価格" name="sale_price" type="number" defaultValue={numberValue(contract?.sale_price)} />
          <TextField label="諸費用" name="fees" type="number" defaultValue={numberValue(contract?.fees)} />
          <TextField label="総支払額" name="total_price" type="number" defaultValue={numberValue(contract?.total_price)} />
          <TextField label="頭金" name="down_payment" type="number" defaultValue={numberValue(contract?.down_payment)} />
          <TextField label="下取金額" name="trade_in_amount" type="number" defaultValue={numberValue(contract?.trade_in_amount)} />
          <TextField label="ローン元金" name="financed_amount" type="number" defaultValue={numberValue(contract?.financed_amount)} />
          <TextField label="担当者" name="staff_name" defaultValue={contract?.staff_name} />
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            契約ステータス
            <select name="status" defaultValue={contract?.status ?? "contracted"} className={inputClass}>
              {CONTRACT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <TextareaField label="契約メモ" name="contract_memo" defaultValue={contract?.memo} className="md:col-span-4" />
        </div>
      </Section>

      <Section title="申込参照情報">
        <div className="grid gap-3 md:grid-cols-4">
          <TextField label="source_system" name="source_system" defaultValue={contract?.source_system ?? sourceDefaults?.source_system} />
          <TextField label="source_row_key" name="source_row_key" defaultValue={contract?.source_row_key ?? sourceDefaults?.source_row_key} />
          <TextField label="source_row_number" name="source_row_number" type="number" defaultValue={contract?.source_row_number?.toString() ?? sourceDefaults?.source_row_number} />
          <TextField label="source_received_at" name="source_received_at" type="datetime-local" defaultValue={dateTimeLocalValue(contract?.source_received_at ?? sourceDefaults?.source_received_at)} />
          <TextareaField label="source_snapshot_json" name="source_snapshot_json" defaultValue={contract?.source_snapshot_json ? JSON.stringify(contract.source_snapshot_json, null, 2) : ""} className="md:col-span-4" />
        </div>
      </Section>

      <Section title="車両情報">
        <div className="grid gap-3 md:grid-cols-4">
          <TextField label="メーカー" name="maker" defaultValue={vehicle?.maker} />
          <TextField label="車種" name="model" defaultValue={vehicle?.model} />
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
                onChange={(event) => setFinanceCompany(event.target.value as SalesFinanceCompany)}
                required
                className={inputClass}
              >
                {FINANCE_COMPANY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} disabled={!allowedFinanceCompanies.some((allowed) => allowed.value === option.value)}>
                    {FINANCE_COMPANY_LABELS[option.value]}
                  </option>
                ))}
              </select>
            </label>
            <TextField label="信販申込番号" name="application_number" defaultValue={loan?.application_number} />
            <TextField label="契約番号" name="loan_contract_number" defaultValue={loan?.contract_number} />
            <label className="grid gap-1 text-sm font-bold text-slate-700">
              審査結果
              <select name="approval_status" defaultValue={loan?.approval_status ?? ""} className={inputClass}>
                <option value="">未設定</option>
                {APPROVAL_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <TextField label="金利" name="interest_rate" type="number" step="0.001" defaultValue={numberValue(loan?.interest_rate)} />
            <TextField label="ローン元金" name="principal" type="number" defaultValue={numberValue(loan?.principal)} />
            <label className="grid gap-1 text-sm font-bold text-slate-700">
              支払回数
              <select
                name="installment_count"
                value={installmentCount ?? ""}
                onChange={(event) => setInstallmentCount(event.target.value ? Number(event.target.value) : null)}
                required
                className={inputClass}
              >
                <option value="">選択</option>
                {installmentOptions.map((count) => <option key={count} value={count}>{count}回</option>)}
              </select>
            </label>
            <TextField label="月々支払額" name="monthly_payment" type="number" defaultValue={numberValue(loan?.monthly_payment)} />
            <label className="flex items-center gap-2 pt-7 text-sm font-bold text-slate-700">
              <input name="loan_bonus_payment_enabled" type="checkbox" defaultChecked={loan?.bonus_payment_enabled ?? false} className={checkboxClass} />
              ボーナス払いあり
            </label>
            <TextField label="ボーナス払い額" name="bonus_payment_amount" type="number" defaultValue={numberValue(loan?.bonus_payment_amount)} />
            <TextField label="初回支払日" name="first_payment_date" type="date" defaultValue={dateValue(loan?.first_payment_date)} />
            <TextField label="最終支払日" name="final_payment_date" type="date" defaultValue={dateValue(loan?.final_payment_date)} />
            <TextField label="支払総額" name="total_payment_amount" type="number" defaultValue={numberValue(loan?.total_payment_amount)} />
            <label className="flex items-center gap-2 pt-7 text-sm font-bold text-slate-700">
              <input name="ownership_retention" type="checkbox" defaultChecked={loan?.ownership_retention ?? false} className={checkboxClass} />
              所有権留保あり
            </label>
            <TextareaField label="ローンメモ" name="loan_memo" defaultValue={loan?.memo} className="md:col-span-4" />
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
                onChange={(event) => setLeaseCompany(event.target.value as SalesLeaseCompany)}
                required
                className={inputClass}
              >
                {LEASE_COMPANY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} disabled={!allowedLeaseCompanies.some((allowed) => allowed.value === option.value)}>
                    {LEASE_COMPANY_LABELS[option.value]}
                  </option>
                ))}
              </select>
            </label>
            <TextField label="提携会社" name="partner_company" defaultValue={lease?.partner_company} />
            <TextField label="契約番号" name="lease_contract_number" defaultValue={lease?.contract_number} />
            <TextField label="リース期間（月）" name="lease_months" type="number" defaultValue={numberValue(lease?.lease_months)} />
            <TextField label="月額リース料" name="monthly_lease_fee" type="number" defaultValue={numberValue(lease?.monthly_lease_fee)} />
            <label className="flex items-center gap-2 pt-7 text-sm font-bold text-slate-700">
              <input name="lease_bonus_payment_enabled" type="checkbox" defaultChecked={lease?.bonus_payment_enabled ?? false} className={checkboxClass} />
              ボーナス払いあり
            </label>
            <TextField label="ボーナス払い額" name="lease_bonus_payment_amount" type="number" defaultValue={numberValue(lease?.bonus_payment_amount)} />
            <TextField label="リース開始日" name="lease_start_date" type="date" defaultValue={dateValue(lease?.lease_start_date)} />
            <TextField label="リース終了日" name="lease_end_date" type="date" defaultValue={dateValue(lease?.lease_end_date)} />
            <label className="flex items-center gap-2 pt-7 text-sm font-bold text-slate-700">
              <input name="residual_value_enabled" type="checkbox" defaultChecked={lease?.residual_value_enabled ?? false} className={checkboxClass} />
              残価設定あり
            </label>
            <TextField label="残価金額" name="residual_value_amount" type="number" defaultValue={numberValue(lease?.residual_value_amount)} />
            <label className="flex items-center gap-2 pt-7 text-sm font-bold text-slate-700">
              <input name="maintenance_included" type="checkbox" defaultChecked={lease?.maintenance_included ?? false} className={checkboxClass} />
              メンテナンス込み
            </label>
            <TextField label="所有者" name="owner_name" defaultValue={lease?.owner_name} />
            <TextField label="使用者" name="user_name" defaultValue={lease?.user_name} />
            <TextareaField label="リースメモ" name="lease_memo" defaultValue={lease?.memo} className="md:col-span-4" />
          </div>
        </Section>
      ) : null}

      <Section title="保証人情報">
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
      </Section>

      <Section title="書類URL">
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
      </Section>

      {mode === "create" ? (
        <Section title="初回対応履歴">
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
        </Section>
      ) : null}

      <div className="flex justify-end gap-2">
        <button
          className="rounded bg-brand-700 px-5 py-3 text-sm font-black text-white focus-ring disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!validation.valid}
        >
          {mode === "create" ? "契約を登録" : "契約を保存"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TextField({
  label,
  name,
  defaultValue,
  required,
  type = "text",
  step,
  className = ""
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  type?: string;
  step?: string;
  className?: string;
}) {
  return (
    <label className={`grid gap-1 text-sm font-bold text-slate-700 ${className}`}>
      {label}
      <input name={name} type={type} step={step} defaultValue={defaultValue ?? ""} required={required} className={inputClass} />
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
  children
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      {label}
      <select name={name} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        {children}
      </select>
    </label>
  );
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
