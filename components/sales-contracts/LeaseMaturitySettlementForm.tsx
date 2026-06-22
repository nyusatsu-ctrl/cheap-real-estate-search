"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  LEASE_MATURITY_CHOICE_OPTIONS,
  LEASE_MATURITY_STATUS_OPTIONS
} from "@/lib/sales-contracts/rules";
import type {
  SalesContractDetail,
  SalesLeaseMaturityChoice
} from "@/lib/sales-contracts/types";

const DEFAULT_ANNUAL_MILEAGE_LIMIT = 10000;
const DEFAULT_SEVEN_YEAR_MILEAGE_LIMIT = 70000;
const DEFAULT_MILEAGE_OVERAGE_RATE_YEN = 10;

const inputClass = "w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus-ring";
const readOnlyInputClass = `${inputClass} bg-slate-50 text-slate-700`;

const choiceGuides: Record<SalesLeaseMaturityChoice, { label: string; description: string; tone: string }> = {
  undecided: {
    label: "選択未定",
    description: "お客様の選択が決まったら、買取・再リース・返却のいずれかを選択してください。",
    tone: "border-slate-200 bg-slate-50 text-slate-700"
  },
  purchase: {
    label: "買取",
    description: "買取の目安は、残価 + 過走行精算金 + 状態精算金です。実際の請求額は最終精算金額で調整してください。",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-900"
  },
  renewal: {
    label: "再リース",
    description: "再リースの目安は、残価 + 再リース時メンテナンス費用です。実際の条件に合わせて最終精算金額を調整してください。",
    tone: "border-sky-200 bg-sky-50 text-sky-900"
  },
  return: {
    label: "返却",
    description: "返却の目安は、過走行精算金 + 状態精算金です。傷・事故・内装状態を確認して最終精算金額を調整してください。",
    tone: "border-amber-200 bg-amber-50 text-amber-900"
  }
};

export function LeaseMaturitySettlementForm({
  detail,
  action
}: {
  detail: SalesContractDetail;
  action: (formData: FormData) => void | Promise<void>;
}) {
  if (!detail.lease) return null;

  return <LeaseMaturitySettlementFormContent detail={detail} action={action} />;
}

function LeaseMaturitySettlementFormContent({
  detail,
  action
}: {
  detail: SalesContractDetail;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const lease = detail.lease!;
  const maturity = detail.leaseMaturity;
  const maturityDate = maturity?.maturity_date ?? lease.lease_end_date;
  const residualInitial = maturity?.residual_value_amount ?? lease.residual_value_amount;
  const contractedLimitInitial = maturity?.contracted_mileage_limit ?? mileageLimitFromLeaseMonths(lease.lease_months) ?? DEFAULT_SEVEN_YEAR_MILEAGE_LIMIT;
  const rateInitial = maturity?.mileage_overage_rate_yen ?? DEFAULT_MILEAGE_OVERAGE_RATE_YEN;
  const initialExcessKm = calculateExcessKm(maturity?.maturity_mileage ?? null, contractedLimitInitial);
  const initialOverageEstimate = initialExcessKm * rateInitial;
  const initialCustomerChoice = maturity?.customer_choice ?? "undecided";
  const initialOverageAmount = maturity?.mileage_overage_amount ?? initialOverageEstimate;
  const initialFinalSettlementAmount = maturity?.final_settlement_amount ?? calculateSelectedEstimate({
    choice: initialCustomerChoice,
    residualValueAmount: numberValue(residualInitial),
    mileageOverageAmount: numberValue(initialOverageAmount),
    conditionSettlementAmount: numberValue(maturity?.condition_settlement_amount),
    renewalMaintenanceFeeAmount: numberValue(maturity?.renewal_maintenance_fee_amount)
  });

  const [customerChoice, setCustomerChoice] = useState<SalesLeaseMaturityChoice>(initialCustomerChoice);
  const [residualValueAmount, setResidualValueAmount] = useState(numberValue(residualInitial));
  const [maturityMileage, setMaturityMileage] = useState(numberValue(maturity?.maturity_mileage));
  const [contractedMileageLimit, setContractedMileageLimit] = useState(numberValue(contractedLimitInitial));
  const [mileageOverageRateYen, setMileageOverageRateYen] = useState(numberValue(rateInitial));
  const [mileageOverageAmount, setMileageOverageAmount] = useState(numberValue(initialOverageAmount));
  const [conditionSettlementAmount, setConditionSettlementAmount] = useState(numberValue(maturity?.condition_settlement_amount));
  const [renewalMaintenanceFeeAmount, setRenewalMaintenanceFeeAmount] = useState(numberValue(maturity?.renewal_maintenance_fee_amount));
  const [finalSettlementAmount, setFinalSettlementAmount] = useState(numberValue(initialFinalSettlementAmount));
  const [mileageOverageTouched, setMileageOverageTouched] = useState(maturity?.mileage_overage_amount !== null && maturity?.mileage_overage_amount !== undefined);
  const [finalSettlementTouched, setFinalSettlementTouched] = useState(maturity?.final_settlement_amount !== null && maturity?.final_settlement_amount !== undefined);

  const mileageExcessKm = useMemo(
    () => calculateExcessKm(toInteger(maturityMileage), toInteger(contractedMileageLimit)),
    [maturityMileage, contractedMileageLimit]
  );
  const effectiveOverageRate = toInteger(mileageOverageRateYen) ?? DEFAULT_MILEAGE_OVERAGE_RATE_YEN;
  const mileageOverageEstimate = mileageExcessKm * effectiveOverageRate;
  const residualAmount = toInteger(residualValueAmount) ?? 0;
  const overageAmount = toInteger(mileageOverageAmount) ?? 0;
  const conditionAmount = toInteger(conditionSettlementAmount) ?? 0;
  const renewalMaintenanceAmount = toInteger(renewalMaintenanceFeeAmount) ?? 0;
  const purchaseEstimate = residualAmount + overageAmount + conditionAmount;
  const returnEstimate = overageAmount + conditionAmount;
  const renewalEstimate = residualAmount + renewalMaintenanceAmount;
  const guide = choiceGuides[customerChoice];

  function updateFinalAmount(next: EstimateOverrides = {}) {
    if (finalSettlementTouched) return;
    const estimate = calculateSelectedEstimate({
      choice: next.choice ?? customerChoice,
      residualValueAmount: next.residualValueAmount ?? residualValueAmount,
      mileageOverageAmount: next.mileageOverageAmount ?? mileageOverageAmount,
      conditionSettlementAmount: next.conditionSettlementAmount ?? conditionSettlementAmount,
      renewalMaintenanceFeeAmount: next.renewalMaintenanceFeeAmount ?? renewalMaintenanceFeeAmount
    });
    setFinalSettlementAmount(estimate === null ? "" : String(estimate));
  }

  function updateMileageOverageFromEstimate(next: MileageEstimateOverrides = {}) {
    if (mileageOverageTouched) {
      updateFinalAmount();
      return;
    }
    const nextEstimate = calculateOverageAmount({
      maturityMileage: next.maturityMileage ?? maturityMileage,
      contractedMileageLimit: next.contractedMileageLimit ?? contractedMileageLimit,
      mileageOverageRateYen: next.mileageOverageRateYen ?? mileageOverageRateYen
    });
    const nextAmount = String(nextEstimate);
    setMileageOverageAmount(nextAmount);
    updateFinalAmount({ mileageOverageAmount: nextAmount });
  }

  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="maturity_id" value={maturity?.id ?? ""} />
      <input type="hidden" name="contract_id" value={detail.contract.id} />
      <input type="hidden" name="lease_id" value={lease.id} />
      <input type="hidden" name="return_to" value={`/admin/sales-contracts/${detail.contract.id}#lease-maturity`} />
      <input type="hidden" name="mileage_over_limit" value={mileageExcessKm > 0 ? "on" : ""} />

      <div className="grid gap-3 md:grid-cols-4">
        <Field label="満期予定日">
          <input name="maturity_date" type="date" defaultValue={dateValue(maturityDate)} className={inputClass} />
        </Field>
        <Field label="満期ステータス">
          <select name="maturity_status" defaultValue={maturity?.maturity_status ?? "not_started"} className={inputClass}>
            {LEASE_MATURITY_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field label="お客様の選択">
          <select
            name="customer_choice"
            value={customerChoice}
            onChange={(event) => {
              const nextChoice = event.target.value as SalesLeaseMaturityChoice;
              setCustomerChoice(nextChoice);
              updateFinalAmount({ choice: nextChoice });
            }}
            className={inputClass}
          >
            {LEASE_MATURITY_CHOICE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field label="残価">
          <input
            name="residual_value_amount"
            type="number"
            min={0}
            value={residualValueAmount}
            onChange={(event) => {
              setResidualValueAmount(event.target.value);
              updateFinalAmount({ residualValueAmount: event.target.value });
            }}
            className={inputClass}
          />
        </Field>
      </div>

      <div className={`mt-4 rounded-lg border px-4 py-3 text-sm font-semibold ${guide.tone}`}>
        <p className="font-black">{guide.label}の精算目安</p>
        <p className="mt-1">{guide.description}</p>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-950">精算内訳</h3>
            <p className="mt-1 text-xs font-semibold text-slate-600">
              年間{DEFAULT_ANNUAL_MILEAGE_LIMIT.toLocaleString("ja-JP")}km、7年で{DEFAULT_SEVEN_YEAR_MILEAGE_LIMIT.toLocaleString("ja-JP")}km以内が基準です。自動計算は目安です。
            </p>
          </div>
          <span className="rounded bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
            過走行目安: {formatYen(mileageOverageEstimate)}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Field label="契約走行距離上限">
            <input
              name="contracted_mileage_limit"
              type="number"
              min={0}
              value={contractedMileageLimit}
              onChange={(event) => {
                setContractedMileageLimit(event.target.value);
                updateMileageOverageFromEstimate({ contractedMileageLimit: event.target.value });
              }}
              className={inputClass}
            />
          </Field>
          <Field label="満期時走行距離">
            <input
              name="maturity_mileage"
              type="number"
              min={0}
              value={maturityMileage}
              onChange={(event) => {
                setMaturityMileage(event.target.value);
                updateMileageOverageFromEstimate({ maturityMileage: event.target.value });
              }}
              className={inputClass}
            />
          </Field>
          <Field label="超過距離">
            <input name="mileage_excess_km" type="number" value={mileageExcessKm} readOnly className={readOnlyInputClass} />
          </Field>
          <Field label="過走行精算単価">
            <input
              name="mileage_overage_rate_yen"
              type="number"
              min={0}
              value={mileageOverageRateYen}
              onChange={(event) => {
                setMileageOverageRateYen(event.target.value);
                updateMileageOverageFromEstimate({ mileageOverageRateYen: event.target.value });
              }}
              className={inputClass}
            />
          </Field>
          <Field label="過走行精算金">
            <input
              name="mileage_overage_amount"
              type="number"
              min={0}
              value={mileageOverageAmount}
              onChange={(event) => {
                setMileageOverageTouched(true);
                setMileageOverageAmount(event.target.value);
                updateFinalAmount({ mileageOverageAmount: event.target.value });
              }}
              className={inputClass}
            />
          </Field>
          <Field label="傷・事故・内装などの状態精算金">
            <input
              name="condition_settlement_amount"
              type="number"
              min={0}
              value={conditionSettlementAmount}
              onChange={(event) => {
                setConditionSettlementAmount(event.target.value);
                updateFinalAmount({ conditionSettlementAmount: event.target.value });
              }}
              className={inputClass}
            />
          </Field>
          <Field label="再リース時メンテナンス費用">
            <input
              name="renewal_maintenance_fee_amount"
              type="number"
              min={0}
              value={renewalMaintenanceFeeAmount}
              onChange={(event) => {
                setRenewalMaintenanceFeeAmount(event.target.value);
                updateFinalAmount({ renewalMaintenanceFeeAmount: event.target.value });
              }}
              className={inputClass}
            />
          </Field>
          <Field label="最終精算金額">
            <input
              name="final_settlement_amount"
              type="number"
              min={0}
              value={finalSettlementAmount}
              onChange={(event) => {
                setFinalSettlementTouched(true);
                setFinalSettlementAmount(event.target.value);
              }}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <EstimateCard title="買取目安" value={purchaseEstimate} description="残価 + 過走行 + 状態精算" active={customerChoice === "purchase"} />
          <EstimateCard title="返却目安" value={returnEstimate} description="過走行 + 状態精算" active={customerChoice === "return"} />
          <EstimateCard title="再リース目安" value={renewalEstimate} description="残価 + メンテナンス費用" active={customerChoice === "renewal"} />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Field label="その他追加精算金" className="md:col-span-1">
            <input name="additional_settlement_amount" type="number" min={0} defaultValue={numberValue(maturity?.additional_settlement_amount)} className={inputClass} />
          </Field>
          <Field label="その他追加精算金の理由" className="md:col-span-3">
            <textarea name="additional_settlement_reason" rows={2} defaultValue={maturity?.additional_settlement_reason ?? ""} className={inputClass} />
          </Field>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Field label="状態メモ" className="md:col-span-2">
          <textarea name="vehicle_condition_memo" rows={3} defaultValue={maturity?.vehicle_condition_memo ?? ""} className={inputClass} />
        </Field>
        <Field label="備考" className="md:col-span-2">
          <textarea name="maturity_memo" rows={3} defaultValue={maturity?.memo ?? ""} className={inputClass} />
        </Field>
        <Field label="買取入金予定日">
          <input name="purchase_payment_due_date" type="date" defaultValue={dateValue(maturity?.purchase_payment_due_date)} className={inputClass} />
        </Field>
        <Field label="買取入金済み日">
          <input name="purchase_paid_date" type="date" defaultValue={dateValue(maturity?.purchase_paid_date)} className={inputClass} />
        </Field>
        <Field label="再リース新契約ID">
          <input name="renewal_contract_id" defaultValue={maturity?.renewal_contract_id ?? ""} className={inputClass} />
        </Field>
        <Field label="返却予定日">
          <input name="return_scheduled_date" type="date" defaultValue={dateValue(maturity?.return_scheduled_date)} className={inputClass} />
        </Field>
        <Field label="返却完了日">
          <input name="return_completed_date" type="date" defaultValue={dateValue(maturity?.return_completed_date)} className={inputClass} />
        </Field>
        <Field label="満期案内日">
          <input name="maturity_notice_sent_date" type="date" defaultValue={dateValue(maturity?.maturity_notice_sent_date)} className={inputClass} />
        </Field>
        <Field label="次回連絡予定日">
          <input name="next_contact_date" type="date" defaultValue={dateValue(maturity?.next_contact_date)} className={inputClass} />
        </Field>
      </div>

      <button className="mt-4 rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
        {maturity ? "満期管理を保存" : "満期管理を作成"}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
  className = ""
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1 text-sm font-bold text-slate-700 ${className}`}>
      {label}
      {children}
    </label>
  );
}

function EstimateCard({
  title,
  value,
  description,
  active
}: {
  title: string;
  value: number;
  description: string;
  active: boolean;
}) {
  return (
    <div className={`rounded border bg-white p-3 ${active ? "border-brand-500 ring-2 ring-brand-100" : "border-slate-200"}`}>
      <p className="text-xs font-bold text-slate-500">{title}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{formatYen(value)}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{description}</p>
    </div>
  );
}

type EstimateOverrides = {
  choice?: SalesLeaseMaturityChoice;
  residualValueAmount?: string;
  mileageOverageAmount?: string;
  conditionSettlementAmount?: string;
  renewalMaintenanceFeeAmount?: string;
};

type MileageEstimateOverrides = {
  maturityMileage?: string;
  contractedMileageLimit?: string;
  mileageOverageRateYen?: string;
};

function calculateSelectedEstimate(values: Required<EstimateOverrides>) {
  const residualAmount = toInteger(values.residualValueAmount) ?? 0;
  const overageAmount = toInteger(values.mileageOverageAmount) ?? 0;
  const conditionAmount = toInteger(values.conditionSettlementAmount) ?? 0;
  const renewalMaintenanceAmount = toInteger(values.renewalMaintenanceFeeAmount) ?? 0;

  if (values.choice === "purchase") return residualAmount + overageAmount + conditionAmount;
  if (values.choice === "return") return overageAmount + conditionAmount;
  if (values.choice === "renewal") return residualAmount + renewalMaintenanceAmount;
  return null;
}

function calculateOverageAmount(values: Required<MileageEstimateOverrides>) {
  const excessKm = calculateExcessKm(toInteger(values.maturityMileage), toInteger(values.contractedMileageLimit));
  const rate = toInteger(values.mileageOverageRateYen) ?? DEFAULT_MILEAGE_OVERAGE_RATE_YEN;
  return excessKm * rate;
}

function mileageLimitFromLeaseMonths(leaseMonths: number | null | undefined) {
  if (!leaseMonths) return null;
  return Math.round((leaseMonths / 12) * DEFAULT_ANNUAL_MILEAGE_LIMIT);
}

function calculateExcessKm(maturityMileage: number | null, contractedLimit: number | null) {
  if (maturityMileage === null || contractedLimit === null) return 0;
  return Math.max(0, maturityMileage - contractedLimit);
}

function toInteger(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number.parseInt(String(value).replace(/[,\s円km]/g, ""), 10);
  return Number.isFinite(number) ? number : null;
}

function dateValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function numberValue(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function formatYen(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `${Number(value).toLocaleString("ja-JP")}円`;
}
