import Link from "next/link";
import { GpsStatusBadge } from "@/components/gps/GpsStatusBadge";
import { GPS_CONTRACT_STATUS_LABELS, GPS_CONTRACT_TYPE_LABELS } from "@/lib/gps/labels";
import { loadGpsAdminData } from "@/lib/gps/data";

export default async function GpsCustomersPage() {
  const data = await loadGpsAdminData();

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-lg font-black text-slate-950">GPS顧客一覧</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">氏名</th>
              <th className="px-3 py-3">電話</th>
              <th className="px-3 py-3">車両</th>
              <th className="px-3 py-3">端末</th>
              <th className="px-3 py-3">最新位置</th>
              <th className="px-3 py-3">契約種別</th>
              <th className="px-3 py-3">ステータス</th>
              <th className="px-3 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.customers.map((customer) => {
              const vehicles = data.vehicles.filter((vehicle) => vehicle.customer_id === customer.id);
              const vehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));
              const devices = data.devices.filter((device) => device.vehicle_id && vehicleIds.has(device.vehicle_id));
              const latestPosition = data.latestPositions.find((position) => position.vehicle_id && vehicleIds.has(position.vehicle_id));

              return (
                <tr key={customer.id}>
                  <td className="px-3 py-3">
                    <p className="font-bold text-slate-950">{customer.full_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{customer.email ?? "-"}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{customer.phone ?? "-"}</td>
                  <td className="px-3 py-3 text-slate-700">
                    {vehicles.map((vehicle) => [vehicle.maker, vehicle.model_name, vehicle.license_plate].filter(Boolean).join(" / ")).join(", ") || "-"}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {devices.map((device) => (
                      <div key={device.id}>
                        <Link href={`/admin/gps/devices/${device.id}`} className="font-bold text-brand-700">
                          {device.device_name}
                        </Link>
                        <p className="font-mono text-xs text-slate-500">{device.device_identifier}</p>
                      </div>
                    ))}
                    {devices.length === 0 && "-"}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {latestPosition ? `${latestPosition.latitude}, ${latestPosition.longitude}` : "-"}
                  </td>
                  <td className="px-3 py-3 text-slate-700">{GPS_CONTRACT_TYPE_LABELS[customer.contract_type]}</td>
                  <td className="px-3 py-3">
                    <GpsStatusBadge
                      label={GPS_CONTRACT_STATUS_LABELS[customer.contract_status]}
                      tone={customer.contract_status === "overdue" ? "red" : customer.contract_status === "active" ? "green" : "slate"}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/gps/customers/${customer.id}`} className="font-bold text-brand-700">
                      詳細
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
