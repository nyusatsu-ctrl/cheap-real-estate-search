import Link from "next/link";
import { GPS_VEHICLE_STATUS_LABELS, GPS_VEHICLE_TYPE_LABELS } from "@/lib/gps/labels";
import { loadGpsAdminData } from "@/lib/gps/data";

export default async function GpsVehiclesPage() {
  const data = await loadGpsAdminData();

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-lg font-black text-slate-950">GPS車両一覧</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">車両</th>
              <th className="px-3 py-3">区分</th>
              <th className="px-3 py-3">年式</th>
              <th className="px-3 py-3">車台番号</th>
              <th className="px-3 py-3">顧客</th>
              <th className="px-3 py-3">端末</th>
              <th className="px-3 py-3">最新位置</th>
              <th className="px-3 py-3">状態</th>
              <th className="px-3 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.vehicles.map((vehicle) => {
              const customer = data.customers.find((item) => item.id === vehicle.customer_id);
              const devices = data.devices.filter((device) => device.vehicle_id === vehicle.id);
              const latestPosition = data.latestPositions.find((position) => position.vehicle_id === vehicle.id);
              return (
                <tr key={vehicle.id}>
                  <td className="px-3 py-3 font-bold text-slate-950">
                    {[vehicle.maker, vehicle.model_name, vehicle.license_plate].filter(Boolean).join(" / ") || "-"}
                  </td>
                  <td className="px-3 py-3 text-slate-700">{GPS_VEHICLE_TYPE_LABELS[vehicle.vehicle_type]}</td>
                  <td className="px-3 py-3 text-slate-700">{vehicle.model_year ?? "-"}</td>
                  <td className="px-3 py-3 text-slate-700">{vehicle.vin ?? "-"}</td>
                  <td className="px-3 py-3 text-slate-700">{customer?.full_name ?? "-"}</td>
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
                  <td className="px-3 py-3 text-slate-700">{GPS_VEHICLE_STATUS_LABELS[vehicle.status]}</td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/gps/vehicles/${vehicle.id}`} className="font-bold text-brand-700">
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
