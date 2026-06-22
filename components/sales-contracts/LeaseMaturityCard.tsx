import {
  formatSalesDate,
  formatSalesDateTime,
  formatYen
} from "@/lib/sales-contracts/data";
import {
  CONTACT_METHOD_LABELS,
  CONTACT_STATUS_LABELS,
  LEASE_MATURITY_CHOICE_OPTIONS,
  LEASE_MATURITY_STATUS_OPTIONS
} from "@/lib/sales-contracts/rules";
import type { SalesContractDetail } from "@/lib/sales-contracts/types";
import { LeaseMaturityHistoryForm } from "@/components/sales-contracts/LeaseMaturityHistoryForm";

const inputClass = "rounded border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus-ring";
const checkboxClass = "h-4 w-4 rounded border-slate-300";

export function LeaseMaturityCard({
  detail,
  action,
  historyAction
}: {
  detail: SalesContractDetail;
  action: (formData: FormData) => void | Promise<void>;
  historyAction: (formData: FormData) => void | Promise<void>;
}) {
  if (!detail.lease) return null;

  const lease = detail.lease;
  const maturity = detail.leaseMaturity;
  const maturityDate = maturity?.maturity_date ?? lease.lease_end_date;
  const residualValueAmount = maturity?.residual_value_amount ?? lease.residual_value_amount;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">リース満期管理</h2>
          <p className="mt-1 text-sm text-slate-600">
            満期予定日: {formatSalesDate(maturityDate)} / 残価: {formatYen(residualValueAmount)}
          </p>
        </div>
        {!maturity ? (
          <span className="rounded bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900">未作成</span>
        ) : null}
      </div>

      <form action={action} className="mt-4">
        <input type="hidden" name="maturity_id" value={maturity?.id ?? ""} />
        <input type="hidden" name="contract_id" value={detail.contract.id} />
        <input type="hidden" name="lease_id" value={lease.id} />
        <input type="hidden" name="return_to" value={`/admin/sales-contracts/${detail.contract.id}`} />
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
            <select name="customer_choice" defaultValue={maturity?.customer_choice ?? "undecided"} className={inputClass}>
              {LEASE_MATURITY_CHOICE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="残価金額">
            <input name="residual_value_amount" type="number" defaultValue={numberValue(residualValueAmount)} className={inputClass} />
          </Field>
          <Field label="満期時走行距離">
            <input name="maturity_mileage" type="number" defaultValue={numberValue(maturity?.maturity_mileage)} className={inputClass} />
          </Field>
          <Field label="契約上の走行距離上限">
            <input name="contracted_mileage_limit" type="number" defaultValue={numberValue(maturity?.contracted_mileage_limit)} className={inputClass} />
          </Field>
          <label className="flex items-center gap-2 pt-7 text-sm font-bold text-slate-700">
            <input name="mileage_over_limit" type="checkbox" defaultChecked={maturity?.mileage_over_limit ?? false} className={checkboxClass} />
            走行距離超過あり
          </label>
          <Field label="追加精算金">
            <input name="additional_settlement_amount" type="number" defaultValue={numberValue(maturity?.additional_settlement_amount)} className={inputClass} />
          </Field>
          <Field label="最終精算金額">
            <input name="final_settlement_amount" type="number" defaultValue={numberValue(maturity?.final_settlement_amount)} className={inputClass} />
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
          <Field label="追加精算金の理由" className="md:col-span-2">
            <textarea name="additional_settlement_reason" rows={2} defaultValue={maturity?.additional_settlement_reason ?? ""} className={inputClass} />
          </Field>
          <Field label="傷・事故・修復・内外装状態メモ" className="md:col-span-2">
            <textarea name="vehicle_condition_memo" rows={2} defaultValue={maturity?.vehicle_condition_memo ?? ""} className={inputClass} />
          </Field>
          <Field label="備考" className="md:col-span-4">
            <textarea name="maturity_memo" rows={3} defaultValue={maturity?.memo ?? ""} className={inputClass} />
          </Field>
        </div>
        <button className="mt-4 rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
          {maturity ? "満期管理を保存" : "満期管理を作成"}
        </button>
      </form>

      <div className="mt-6 space-y-4">
        <div>
          <h3 className="text-lg font-black text-slate-950">満期対応履歴</h3>
          {detail.leaseMaturityHistories.length ? (
            <div className="mt-3 divide-y divide-slate-200 rounded border border-slate-200">
              {detail.leaseMaturityHistories.map((history) => (
                <div key={history.id} className="p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-slate-950">
                      {formatSalesDateTime(history.handled_at)} / {CONTACT_METHOD_LABELS[history.method]} / {CONTACT_STATUS_LABELS[history.status]}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">{history.handled_by ?? "-"}</p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-slate-700">{history.content}</p>
                  {history.next_action_date ? <p className="mt-2 text-xs font-semibold text-slate-500">次回対応: {formatSalesDate(history.next_action_date)}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm font-semibold text-slate-500">満期対応履歴はまだありません。</p>
          )}
        </div>
        <LeaseMaturityHistoryForm detail={detail} action={historyAction} />
      </div>
    </section>
  );
}

function Field({
  label,
  children,
  className = ""
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1 text-sm font-bold text-slate-700 ${className}`}>
      {label}
      {children}
    </label>
  );
}

function dateValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function numberValue(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value);
}
