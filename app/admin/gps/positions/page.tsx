import { GpsMapPanel } from "@/components/gps/GpsMapPanel";
import { GpsStatusBadge } from "@/components/gps/GpsStatusBadge";
import { GPS_ACC_STATUS_LABELS, GPS_CONNECTION_STATUS_LABELS, GPS_RELAY_STATUS_LABELS } from "@/lib/gps/labels";
import { loadGpsAdminData } from "@/lib/gps/data";

export default async function GpsPositionsPage() {
  const data = await loadGpsAdminData();

  return (
    <div className="space-y-5">
      <GpsMapPanel positions={data.latestPositions} />
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-black text-slate-950">最新位置一覧</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">物件</th>
                <th className="px-3 py-3">顧客</th>
                <th className="px-3 py-3">管理対象</th>
                <th className="px-3 py-3">位置</th>
                <th className="px-3 py-3">速度</th>
                <th className="px-3 py-3">方位</th>
                <th className="px-3 py-3">ACC</th>
                <th className="px-3 py-3">リレー</th>
                <th className="px-3 py-3">状態</th>
                <th className="px-3 py-3">最終取得日時</th>
                <th className="px-3 py-3">地図</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.latestPositions.map((position) => (
                <tr key={position.id}>
                  <td className="px-3 py-3 font-bold text-slate-950">
                    {[position.maker, position.model_name, position.license_plate].filter(Boolean).join(" / ") || "-"}
                  </td>
                  <td className="px-3 py-3 text-slate-700">{position.customer_name ?? "-"}</td>
                  <td className="px-3 py-3 text-slate-700">{position.device_name ?? "-"}</td>
                  <td className="px-3 py-3 text-slate-700">{position.latitude}, {position.longitude}</td>
                  <td className="px-3 py-3 text-slate-700">{position.speed_kmh ?? "-"} km/h</td>
                  <td className="px-3 py-3 text-slate-700">{position.heading_degrees ?? "-"}°</td>
                  <td className="px-3 py-3 text-slate-700">{GPS_ACC_STATUS_LABELS[position.acc_status]}</td>
                  <td className="px-3 py-3 text-slate-700">{GPS_RELAY_STATUS_LABELS[position.relay_status]}</td>
                  <td className="px-3 py-3">
                    {position.connection_status ? (
                      <GpsStatusBadge
                        label={GPS_CONNECTION_STATUS_LABELS[position.connection_status]}
                        tone={position.connection_status === "online" ? "green" : "slate"}
                      />
                    ) : "-"}
                  </td>
                  <td className="px-3 py-3 text-slate-700">{formatDateTime(position.received_at)}</td>
                  <td className="px-3 py-3">
                    <a
                      href={`https://www.google.com/maps?q=${position.latitude},${position.longitude}`}
                      className="font-bold text-brand-700"
                      target="_blank"
                      rel="noreferrer"
                    >
                      開く
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
}
