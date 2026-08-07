"use client";

import { useActionState } from "react";
import { saveGpsDeviceAction } from "@/app/admin/gps/actions";
import type { GpsFormState } from "@/app/admin/gps/actions";
import type { GpsDevice, GpsVehicle } from "@/lib/gps/types";

export function GpsDeviceForm({
  device,
  vehicles
}: {
  device?: GpsDevice | null;
  vehicles: GpsVehicle[];
}) {
  const [state, formAction, pending] = useActionState(saveGpsDeviceAction, GPS_FORM_INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {device && <input type="hidden" name="id" value={device.id} />}
      <FormMessage message={state.message} />
      <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        端末ID、IMEI、SIM識別情報は管理画面からのみ入力し、ソースコードやテストデータへ記録しないでください。
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="車両" error={state.fieldErrors?.vehicle_id}>
          <select name="vehicle_id" defaultValue={device?.vehicle_id ?? ""} className={inputClass}>
            <option value="">未紐付け</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {[vehicle.maker, vehicle.model_name, vehicle.license_plate].filter(Boolean).join(" / ") || vehicle.id}
              </option>
            ))}
          </select>
        </Field>
        <Field label="機種名・端末名" error={state.fieldErrors?.device_name}>
          <input name="device_name" required maxLength={120} defaultValue={device?.device_name ?? "MiCODUS MV930G-G"} className={inputClass} />
        </Field>
        <Field label="管理用端末ID" error={state.fieldErrors?.device_identifier}>
          <input
            name="device_identifier"
            required
            minLength={6}
            maxLength={64}
            autoComplete="off"
            defaultValue={device?.device_identifier ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="IMEI" error={state.fieldErrors?.imei}>
          <input
            name="imei"
            required
            inputMode="numeric"
            minLength={14}
            maxLength={16}
            autoComplete="off"
            defaultValue={device?.imei ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="SIM管理番号（任意）" error={state.fieldErrors?.sim_phone_number}>
          <input
            name="sim_phone_number"
            maxLength={64}
            autoComplete="off"
            defaultValue={device?.sim_phone_number ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="SIM管理ラベル・ICCID（任意）" error={state.fieldErrors?.iccid}>
          <input name="iccid" maxLength={64} autoComplete="off" defaultValue={device?.iccid ?? ""} className={inputClass} />
        </Field>
        <Field label="接続状態" error={state.fieldErrors?.connection_status}>
          <select name="connection_status" defaultValue={device?.connection_status ?? "offline"} className={inputClass}>
            <option value="offline">オフライン</option>
            <option value="online">オンライン</option>
          </select>
        </Field>
        <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          最終通信日時はGPS受信サーバーが更新するため、管理画面からは変更しません。
        </div>
      </div>

      <button disabled={pending} className={submitClass}>
        {pending ? "保存中..." : device ? "GPS端末情報を更新" : "GPS端末を登録"}
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
