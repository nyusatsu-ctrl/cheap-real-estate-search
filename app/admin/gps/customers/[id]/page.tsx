import Link from "next/link";
import { notFound } from "next/navigation";
import { GpsStatusBadge } from "@/components/gps/GpsStatusBadge";
import { GpsDeactivateButton } from "@/components/gps/GpsDeactivateButton";
import { deactivateGpsCustomerAction } from "@/app/admin/gps/actions";
import { GPS_CONTRACT_STATUS_LABELS, GPS_CONTRACT_TYPE_LABELS } from "@/lib/gps/labels";
import { findGpsCustomer, loadGpsAdminData } from "@/lib/gps/data";

export default async function GpsCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadGpsAdminData();
  const customer = findGpsCustomer(data, id);
  if (!customer) notFound();

  const vehicles = data.vehicles.filter((vehicle) => vehicle.customer_id === customer.id);
  const vehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));
  const devices = data.devices.filter((device) => device.vehicle_id && vehicleIds.has(device.vehicle_id));

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-950">{customer.full_name}</h2>
            <p className="mt-1 text-sm text-slate-600">{customer.address ?? "住所未登録"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <GpsStatusBadge
              label={GPS_CONTRACT_STATUS_LABELS[customer.contract_status]}
              tone={customer.contract_status === "overdue" ? "red" : customer.contract_status === "active" ? "green" : "slate"}
            />
            <Link href={`/admin/gps/customers/${customer.id}/edit`} className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
              編集
            </Link>
            {customer.contract_status !== "cancelled" && (
              <GpsDeactivateButton id={customer.id} label="顧客" action={deactivateGpsCustomerAction} />
            )}
          </div>
        </div>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <Info label="電話" value={customer.phone} />
          <Info label="メール" value={customer.email} />
          <Info label="契約種別" value={GPS_CONTRACT_TYPE_LABELS[customer.contract_type]} />
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-black text-slate-950">紐付け車両・GPS端末</h3>
        <div className="mt-3 divide-y divide-slate-200">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="py-3 text-sm">
              <Link href={`/admin/gps/vehicles/${vehicle.id}`} className="font-bold text-brand-700">
                {[vehicle.maker, vehicle.model_name, vehicle.license_plate].filter(Boolean).join(" / ") || "車両詳細"}
              </Link>
              <p className="mt-1 text-slate-600">
                GPS端末: {devices.filter((device) => device.vehicle_id === vehicle.id).map((device) => device.device_name).join(", ") || "-"}
              </p>
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
