"use client";

import { useActionState } from "react";
import { saveGpsVehicleAction } from "@/app/admin/gps/actions";
import type { GpsFormState } from "@/app/admin/gps/actions";
import type { GpsCustomer, GpsVehicle } from "@/lib/gps/types";

export function GpsVehicleForm({
  vehicle,
  customers
}: {
  vehicle?: GpsVehicle | null;
  customers: GpsCustomer[];
}) {
  const [state, formAction, pending] = useActionState(saveGpsVehicleAction, GPS_FORM_INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {vehicle && <input type="hidden" name="id" value={vehicle.id} />}
      <FormMessage message={state.message} />

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="顧客" error={state.fieldErrors?.customer_id}>
          <select name="customer_id" defaultValue={vehicle?.customer_id ?? ""} className={inputClass}>
            <option value="">未紐付け</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.full_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="車両区分" error={state.fieldErrors?.vehicle_type}>
          <select name="vehicle_type" defaultValue={vehicle?.vehicle_type ?? "car"} className={inputClass}>
            <option value="car">自動車</option>
            <option value="bike">バイク</option>
          </select>
        </Field>
        <Field label="メーカー" error={state.fieldErrors?.maker}>
          <input name="maker" maxLength={100} defaultValue={vehicle?.maker ?? ""} className={inputClass} />
        </Field>
        <Field label="車名・型式" error={state.fieldErrors?.model_name}>
          <input name="model_name" maxLength={160} defaultValue={vehicle?.model_name ?? ""} className={inputClass} />
        </Field>
        <Field label="年式" error={state.fieldErrors?.model_year}>
          <input name="model_year" type="number" min={1900} max={2100} defaultValue={vehicle?.model_year ?? ""} className={inputClass} />
        </Field>
        <Field label="車台番号" error={state.fieldErrors?.vin}>
          <input name="vin" maxLength={100} defaultValue={vehicle?.vin ?? ""} className={inputClass} />
        </Field>
        <Field label="登録番号" error={state.fieldErrors?.license_plate}>
          <input name="license_plate" maxLength={100} defaultValue={vehicle?.license_plate ?? ""} className={inputClass} />
        </Field>
        <Field label="状態" error={state.fieldErrors?.status}>
          <select name="status" defaultValue={vehicle?.status ?? "active"} className={inputClass}>
            <option value="active">使用中</option>
            <option value="sold">売却済み</option>
            <option value="returned">返却</option>
            <option value="inactive">無効</option>
          </select>
        </Field>
      </div>

      <button disabled={pending} className={submitClass}>
        {pending ? "保存中..." : vehicle ? "車両情報を更新" : "車両を登録"}
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
