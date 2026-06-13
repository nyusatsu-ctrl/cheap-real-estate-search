import Link from "next/link";
import { notFound } from "next/navigation";
import { GpsOperationControls } from "@/components/gps/GpsOperationControls";
import { GPS_VEHICLE_STATUS_LABELS, GPS_VEHICLE_TYPE_LABELS } from "@/lib/gps/labels";
import { findGpsVehicle, loadGpsAdminData } from "@/lib/gps/data";

export default async function GpsVehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadGpsAdminData();
  const vehicle = findGpsVehicle(data, id);
  if (!vehicle) notFound();

  const customer = data.customers.find((item) => item.id === vehicle.customer_id);
  const devices = data.devices.filter((device) => device.vehicle_id === vehicle.id);
  const positions = data.positions.filter((position) => position.vehicle_id === vehicle.id);
  const primaryDevice = devices[0];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-2xl font-black text-slate-950">
          {[vehicle.maker, vehicle.model_name].filter(Boolean).join(" ") || "物件詳細"}
        </h2>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-4">
          <Info label="物件区分" value={GPS_VEHICLE_TYPE_LABELS[vehicle.vehicle_type]} />
          <Info label="年式" value={vehicle.model_year ? String(vehicle.model_year) : null} />
          <Info label="車台番号" value={vehicle.vin} />
          <Info label="ナンバー" value={vehicle.license_plate} />
          <Info label="状態" value={GPS_VEHICLE_STATUS_LABELS[vehicle.status]} />
          <Info label="顧客" value={customer?.full_name ?? null} />
        </dl>
      </section>

      {primaryDevice && <GpsOperationControls deviceId={primaryDevice.id} vehicleId={vehicle.id} />}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-black text-slate-950">管理対象</h3>
        <div className="mt-3 divide-y divide-slate-200">
          {devices.map((device) => (
            <div key={device.id} className="py-3 text-sm">
              <Link href={`/admin/gps/devices/${device.id}`} className="font-bold text-brand-700">
                {device.device_name}
              </Link>
              <p className="mt-1 text-slate-600">IMEI: {device.imei} / Device ID: {device.device_identifier}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-black text-slate-950">位置履歴</h3>
        <div className="mt-3 divide-y divide-slate-200">
          {positions.slice(0, 20).map((position) => (
            <div key={position.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm">
              <span className="font-bold text-slate-950">
                {position.latitude}, {position.longitude}
              </span>
              <span className="text-slate-600">{formatDateTime(position.received_at)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="font-bold text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-950">{value ?? "-"}</dd>
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
}
