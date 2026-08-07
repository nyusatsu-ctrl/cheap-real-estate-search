"use client";

import { useActionState } from "react";
import { saveGpsCustomerAction } from "@/app/admin/gps/actions";
import type { GpsFormState } from "@/app/admin/gps/actions";
import type { GpsCustomer } from "@/lib/gps/types";

export function GpsCustomerForm({ customer }: { customer?: GpsCustomer | null }) {
  const [state, formAction, pending] = useActionState(saveGpsCustomerAction, GPS_FORM_INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {customer && <input type="hidden" name="id" value={customer.id} />}
      <FormMessage message={state.message} />

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="氏名" error={state.fieldErrors?.full_name}>
          <input name="full_name" required maxLength={120} defaultValue={customer?.full_name ?? ""} className={inputClass} />
        </Field>
        <Field label="電話番号" error={state.fieldErrors?.phone}>
          <input name="phone" maxLength={50} defaultValue={customer?.phone ?? ""} className={inputClass} />
        </Field>
        <Field label="メールアドレス" error={state.fieldErrors?.email}>
          <input name="email" type="email" maxLength={254} defaultValue={customer?.email ?? ""} className={inputClass} />
        </Field>
        <Field label="契約種別" error={state.fieldErrors?.contract_type}>
          <select name="contract_type" defaultValue={customer?.contract_type ?? "car"} className={inputClass}>
            <option value="car">自動車</option>
            <option value="bike">バイク</option>
          </select>
        </Field>
        <Field label="契約状態" error={state.fieldErrors?.contract_status}>
          <select name="contract_status" defaultValue={customer?.contract_status ?? "screening"} className={inputClass}>
            <option value="screening">審査中</option>
            <option value="active">契約中</option>
            <option value="overdue">延滞</option>
            <option value="paid_off">完済</option>
            <option value="cancelled">無効</option>
          </select>
        </Field>
        <Field label="住所" error={state.fieldErrors?.address}>
          <input name="address" maxLength={300} defaultValue={customer?.address ?? ""} className={inputClass} />
        </Field>
      </div>

      <Field label="備考" error={state.fieldErrors?.notes}>
        <textarea name="notes" rows={4} maxLength={2000} defaultValue={customer?.notes ?? ""} className={inputClass} />
      </Field>

      <button disabled={pending} className={submitClass}>
        {pending ? "保存中..." : customer ? "顧客情報を更新" : "顧客を登録"}
      </button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      {label}
      {children}
      {error && <span className="text-xs font-semibold text-rose-700">{error}</span>}
    </label>
  );
}

function FormMessage({ message }: { message: string }) {
  if (!message) return null;
  return <p className="rounded border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{message}</p>;
}

const inputClass = "w-full rounded border border-slate-300 bg-white px-3 py-2 font-normal text-slate-950 focus-ring";
const submitClass = "rounded bg-brand-700 px-5 py-3 font-bold text-white disabled:opacity-50 focus-ring";
const GPS_FORM_INITIAL_STATE: GpsFormState = { ok: false, message: "" };
