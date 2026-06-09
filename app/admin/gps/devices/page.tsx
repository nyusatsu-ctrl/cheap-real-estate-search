import Link from "next/link";
import { GpsStatusBadge } from "@/components/gps/GpsStatusBadge";
import { GPS_CONNECTION_STATUS_LABELS } from "@/lib/gps/labels";
import { loadGpsAdminData } from "@/lib/gps/data";

export default async function GpsDevicesPage() {
  const data = await loadGpsAdminData();

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-lg font-black text-slate-950">GPS端末一覧</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">端末名</th>
              <th className="px-3 py-3">Device ID</th>
              <th className="px-3 py-3">顧客</th>
              <th className="px-3 py-3">車両</th>
              <th className="px-3 py-3">最新位置</th>
              <th className="px-3 py-3">状態</th>
              <th className="px-3 py-3">最終通信</th>
              <th className="px-3 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.devices.map((device) => {
              const vehicle = data.vehicles.find((item) => item.id === device.vehicle_id);
              const customer = data.customers.find((item) => item.id === vehicle?.customer_id);
              const latestPosition = data.latestPositions.find((position) => position.device_id === device.id);

              return (
                <tr key={device.id}>
                  <td className="px-3 py-3">
                    <p className="font-bold text-slate-950">{device.device_name}</p>
                    <p className="mt-1 text-xs text-slate-500">IMEI: {device.imei}</p>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-700">{device.device_identifier}</td>
                  <td className="px-3 py-3 text-slate-700">{customer?.full_name ?? "-"}</td>
                  <td className="px-3 py-3 text-slate-700">
                    {[vehicle?.maker, vehicle?.model_name, vehicle?.license_plate].filter(Boolean).join(" / ") || "-"}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {latestPosition ? `${latestPosition.latitude}, ${latestPosition.longitude}` : "-"}
                  </td>
                  <td className="px-3 py-3">
                    <GpsStatusBadge
                      label={GPS_CONNECTION_STATUS_LABELS[device.connection_status]}
                      tone={device.connection_status === "online" ? "green" : "slate"}
                    />
                  </td>
                  <td className="px-3 py-3 text-slate-700">{formatDateTime(device.last_seen_at)}</td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/gps/devices/${device.id}`} className="font-bold text-brand-700">
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

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
}
