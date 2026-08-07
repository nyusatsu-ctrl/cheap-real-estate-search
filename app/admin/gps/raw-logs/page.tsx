import { GpsStatusBadge } from "@/components/gps/GpsStatusBadge";
import { pairGpsProtocolTerminalAction } from "@/app/admin/gps/actions";
import { GPS_PACKET_TYPE_LABELS, GPS_PARSE_STATUS_LABELS } from "@/lib/gps/labels";
import { loadGpsAdminData } from "@/lib/gps/data";
import { maskGpsIdentifier } from "@/lib/gps/sensitive";
import type { GpsPacketType, GpsParseStatus } from "@/lib/gps/types";

export default async function GpsRawLogsPage({
  searchParams
}: {
  searchParams: Promise<{ packetType?: string; parseStatus?: string; deviceIdentifier?: string; paired?: string; error?: string }>;
}) {
  const data = await loadGpsAdminData();
  const filters = await searchParams;
  const packetType = filters.packetType as GpsPacketType | undefined;
  const parseStatus = filters.parseStatus as GpsParseStatus | undefined;
  const deviceIdentifier = filters.deviceIdentifier?.trim();
  const rawLogs = data.rawLogs
    .filter((log) => !packetType || log.packet_type === packetType)
    .filter((log) => !parseStatus || log.parse_status === parseStatus)
    .filter((log) => !deviceIdentifier || log.device_identifier?.includes(deviceIdentifier))
    .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
  const pairedTerminalIds = new Set(data.devices.map((device) => device.protocol_terminal_id).filter(Boolean));
  const unpairedByTerminal = new Map<string, (typeof data.rawLogs)[number]>();
  for (const log of data.rawLogs) {
    if (
      log.protocol_terminal_id
      && !pairedTerminalIds.has(log.protocol_terminal_id)
      && !unpairedByTerminal.has(log.protocol_terminal_id)
    ) {
      unpairedByTerminal.set(log.protocol_terminal_id, log);
    }
  }
  const availableDevices = data.devices.filter((device) => device.is_active && !device.protocol_terminal_id);

  return (
    <div className="space-y-4">
      {filters.paired === "1" && (
        <p className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">
          プロトコル端末IDを既存GPS端末へ紐付けました。次回の端末登録から新しい認証コードを発行します。
        </p>
      )}
      {filters.error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-900">
          紐付けを完了できませんでした。対象が未登録か、既に別のGPS端末へ紐付いていないか確認してください。
        </p>
      )}
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-base font-black text-amber-950">未登録JT/T 808端末の安全な紐付け</h2>
        <p className="mt-1 text-sm text-amber-900">
          受信したプロトコル端末IDはマスク表示します。IMEIから推測せず、選択した既存GPS端末へ管理者が明示的に紐付けます。
        </p>
        <div className="mt-3 space-y-2">
          {[...unpairedByTerminal.values()].map((log) => (
            <form key={log.id} action={pairGpsProtocolTerminalAction} className="flex flex-wrap items-center gap-2 rounded border border-amber-200 bg-white p-3">
              <input type="hidden" name="raw_log_id" value={log.id} />
              <span className="font-mono text-sm font-bold text-slate-800">{maskGpsIdentifier(log.protocol_terminal_id)}</span>
              <select name="device_id" required className="min-w-56 rounded border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">紐付け先のGPS端末を選択</option>
                {availableDevices.map((device) => (
                  <option key={device.id} value={device.id}>{device.device_name}</option>
                ))}
              </select>
              <button disabled={availableDevices.length === 0} className="rounded bg-brand-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                紐付ける
              </button>
            </form>
          ))}
          {unpairedByTerminal.size === 0 && <p className="text-sm text-amber-900">未登録のプロトコル端末IDはありません。</p>}
        </div>
      </section>
      <form className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm font-bold text-slate-700">
            packet_type
            <select name="packetType" defaultValue={packetType ?? ""} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="">すべて</option>
              {Object.entries(GPS_PACKET_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            parse_status
            <select name="parseStatus" defaultValue={parseStatus ?? ""} className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="">すべて</option>
              {Object.entries(GPS_PARSE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">
            device_identifier
            <input
              name="deviceIdentifier"
              defaultValue={deviceIdentifier ?? ""}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="端末IDを入力"
            />
          </label>
          <div className="flex items-end gap-2">
            <button className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">絞り込み</button>
            <a href="/admin/gps/raw-logs" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
              解除
            </a>
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-black text-slate-950">raw受信ログ一覧</h2>
          <p className="mt-1 text-sm text-slate-600">{rawLogs.length}件。受信日時の新しい順で表示します。</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">受信日時</th>
                <th className="px-3 py-3">通信</th>
                <th className="px-3 py-3">送信元</th>
                <th className="px-3 py-3">JT/T 808端末ID</th>
                <th className="px-3 py-3">packet_type</th>
                <th className="px-3 py-3">parse_status</th>
                <th className="px-3 py-3">raw_hex</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rawLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-3 py-3 text-slate-700">{formatDateTime(log.received_at)}</td>
                  <td className="px-3 py-3 font-bold text-slate-950">{log.transport.toUpperCase()}</td>
                  <td className="px-3 py-3 text-slate-700">{log.remote_address ?? "-"}:{log.remote_port ?? "-"}</td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-700">{maskGpsIdentifier(log.protocol_terminal_id)}</td>
                  <td className="px-3 py-3 text-slate-700">{GPS_PACKET_TYPE_LABELS[log.packet_type]}</td>
                  <td className="px-3 py-3">
                    <GpsStatusBadge label={GPS_PARSE_STATUS_LABELS[log.parse_status]} tone={log.parse_status === "parsed" ? "green" : "yellow"} />
                  </td>
                  <td className="max-w-md px-3 py-3">
                    <details>
                      <summary className="cursor-pointer font-bold text-brand-700">表示</summary>
                      <p className="mt-2 break-all rounded bg-slate-50 p-2 font-mono text-xs text-slate-600">{log.raw_hex}</p>
                    </details>
                  </td>
                </tr>
              ))}
              {rawLogs.length === 0 && (
                <tr>
                  <td className="px-3 py-5 text-slate-500" colSpan={7}>
                    条件に一致するrawログはありません。
                  </td>
                </tr>
              )}
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
