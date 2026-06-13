import Link from "next/link";
import { GpsMapPanel } from "@/components/gps/GpsMapPanel";
import { GpsStatusBadge } from "@/components/gps/GpsStatusBadge";
import { GPS_CONNECTION_STATUS_LABELS, GPS_OPERATION_TYPE_LABELS } from "@/lib/gps/labels";
import { loadGpsAdminData } from "@/lib/gps/data";

export default async function AdminGpsDashboardPage() {
  const data = await loadGpsAdminData();
  const onlineCount = data.devices.filter((device) => device.connection_status === "online").length;
  const offlineCount = data.devices.filter((device) => device.connection_status === "offline").length;
  const latestRawLogs = data.rawLogs.slice(0, 10);
  const latestPositionAt = data.latestPositions.reduce<string | null>((latest, position) => {
    if (!latest) return position.received_at;
    return new Date(position.received_at) > new Date(latest) ? position.received_at : latest;
  }, null);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="GPS顧客数" value={data.customers.length} href="/admin/gps/customers" />
        <MetricCard label="物件数" value={data.vehicles.length} href="/admin/gps/vehicles" />
        <MetricCard label="管理対象数" value={data.devices.length} href="/admin/gps/devices" />
        <MetricCard label="オンライン管理対象" value={onlineCount} href="/admin/gps/devices" />
        <MetricCard label="オフライン管理対象" value={offlineCount} href="/admin/gps/devices" />
        <MetricCard label="最新rawログ件数" value={latestRawLogs.length} href="/admin/gps/raw-logs" />
      </div>

      <GpsMapPanel positions={data.latestPositions} />

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">最新位置の更新日時</h2>
            <p className="mt-1 text-sm text-slate-600">gps_latest_positions の最新受信時刻です。</p>
          </div>
          <p className="text-xl font-black text-slate-950">{formatDateTime(latestPositionAt)}</p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">実機テスト</h2>
            <p className="mt-1 text-sm text-slate-600">MV930G到着後のTCP受信、APN/SERVER設定、rawログ確認手順を確認できます。</p>
          </div>
          <Link href="/admin/gps/test" className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
            実機テスト手順へ
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">管理対象状態</h2>
          <div className="mt-3 divide-y divide-slate-200">
            {data.devices.slice(0, 8).map((device) => (
              <div key={device.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <Link href={`/admin/gps/devices/${device.id}`} className="font-bold text-brand-700">
                    {device.device_name}
                  </Link>
                  <p className="mt-1 font-mono text-xs text-slate-500">Device ID: {device.device_identifier}</p>
                </div>
                <div className="text-right">
                  <GpsStatusBadge
                    label={GPS_CONNECTION_STATUS_LABELS[device.connection_status]}
                    tone={device.connection_status === "online" ? "green" : "slate"}
                  />
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(device.last_seen_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">最近の操作ログ</h2>
          <div className="mt-3 divide-y divide-slate-200">
            {data.operationLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <span className="font-bold text-slate-950">{GPS_OPERATION_TYPE_LABELS[log.operation_type]}</span>
                  <p className="mt-1 text-xs text-slate-500">{log.reason}</p>
                </div>
                <span className="text-slate-600">{formatDateTime(log.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm focus-ring">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </Link>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
