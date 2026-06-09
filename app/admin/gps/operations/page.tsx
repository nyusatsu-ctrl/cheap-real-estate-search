import { GpsStatusBadge } from "@/components/gps/GpsStatusBadge";
import { GPS_OPERATION_STATUS_LABELS, GPS_OPERATION_TYPE_LABELS } from "@/lib/gps/labels";
import { loadGpsAdminData } from "@/lib/gps/data";

export default async function GpsOperationsPage() {
  const data = await loadGpsAdminData();

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-lg font-black text-slate-950">操作ログ一覧</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">日時</th>
              <th className="px-3 py-3">操作</th>
              <th className="px-3 py-3">対象端末</th>
              <th className="px-3 py-3">Device ID</th>
              <th className="px-3 py-3">理由</th>
              <th className="px-3 py-3">状態</th>
              <th className="px-3 py-3">結果</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.operationLogs.map((log) => {
              const device = data.devices.find((item) => item.id === log.device_id);
              return (
                <tr key={log.id}>
                  <td className="px-3 py-3 text-slate-700">{formatDateTime(log.created_at)}</td>
                  <td className="px-3 py-3 font-bold text-slate-950">{GPS_OPERATION_TYPE_LABELS[log.operation_type]}</td>
                  <td className="px-3 py-3 text-slate-700">{device?.device_name ?? "-"}</td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-700">{device?.device_identifier ?? "-"}</td>
                  <td className="px-3 py-3 text-slate-700">{log.reason}</td>
                  <td className="px-3 py-3">
                    <GpsStatusBadge
                      label={GPS_OPERATION_STATUS_LABELS[log.result_status]}
                      tone={log.result_status === "failed" ? "red" : log.result_status === "cancelled" ? "yellow" : "green"}
                    />
                  </td>
                  <td className="px-3 py-3 text-slate-700">{log.result_message ?? "-"}</td>
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
