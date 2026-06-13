import { notFound } from "next/navigation";
import { GpsOperationControls } from "@/components/gps/GpsOperationControls";
import { GpsStatusBadge } from "@/components/gps/GpsStatusBadge";
import {
  GPS_ACC_STATUS_LABELS,
  GPS_CONNECTION_STATUS_LABELS,
  GPS_OPERATION_STATUS_LABELS,
  GPS_OPERATION_TYPE_LABELS,
  GPS_PACKET_TYPE_LABELS,
  GPS_PARSE_STATUS_LABELS,
  GPS_RELAY_STATUS_LABELS
} from "@/lib/gps/labels";
import { findGpsDevice, loadGpsAdminData } from "@/lib/gps/data";

export default async function GpsDeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadGpsAdminData();
  const device = findGpsDevice(data, id);
  if (!device) notFound();

  const vehicle = data.vehicles.find((item) => item.id === device.vehicle_id);
  const customer = data.customers.find((item) => item.id === vehicle?.customer_id);
  const rawLogs = data.rawLogs.filter((log) => log.device_identifier === device.device_identifier || log.imei === device.imei);
  const positions = data.positions
    .filter((position) => position.device_id === device.id)
    .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
  const latestPosition = data.latestPositions.find((position) => position.device_id === device.id) ?? positions[0] ?? null;
  const operationLogs = data.operationLogs
    .filter((log) => log.device_id === device.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-950">{device.device_name}</h2>
            <p className="mt-1 text-sm text-slate-600">IMEI: {device.imei} / Device ID: {device.device_identifier}</p>
          </div>
          <GpsStatusBadge
            label={GPS_CONNECTION_STATUS_LABELS[device.connection_status]}
            tone={device.connection_status === "online" ? "green" : "slate"}
          />
        </div>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-4">
          <Info label="SIM電話番号" value={device.sim_phone_number} />
          <Info label="ICCID" value={device.iccid} />
          <Info label="最終通信" value={formatDateTime(device.last_seen_at)} />
          <Info label="顧客" value={customer?.full_name ?? null} />
          <Info label="物件" value={[vehicle?.maker, vehicle?.model_name, vehicle?.license_plate].filter(Boolean).join(" / ") || null} />
          <Info label="接続状態" value={GPS_CONNECTION_STATUS_LABELS[device.connection_status]} />
          <Info label="Device ID" value={device.device_identifier} />
          <Info label="IMEI" value={device.imei} />
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-950">最新位置</h3>
            <p className="mt-1 text-sm text-slate-600">GPS管理対象から最後に取得した位置です。</p>
          </div>
          {latestPosition && (
            <a
              href={`https://www.google.com/maps?q=${latestPosition.latitude},${latestPosition.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 focus-ring"
            >
              Google Mapsで開く
            </a>
          )}
        </div>
        {latestPosition ? (
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-5">
            <Info label="緯度" value={String(latestPosition.latitude)} />
            <Info label="経度" value={String(latestPosition.longitude)} />
            <Info label="速度" value={`${latestPosition.speed_kmh ?? "-"} km/h`} />
            <Info label="方位" value={`${latestPosition.heading_degrees ?? "-"}°`} />
            <Info label="受信日時" value={formatDateTime(latestPosition.received_at)} />
            <Info label="ACC" value={GPS_ACC_STATUS_LABELS[latestPosition.acc_status]} />
            <Info label="リレー" value={GPS_RELAY_STATUS_LABELS[latestPosition.relay_status]} />
            <Info label="物件電圧" value={latestPosition.vehicle_voltage ? `${latestPosition.vehicle_voltage} V` : null} />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-slate-500">位置情報はまだありません。</p>
        )}
      </section>

      <GpsOperationControls deviceId={device.id} vehicleId={vehicle?.id ?? null} />

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-black text-slate-950">位置履歴</h3>
        <div className="mt-3 divide-y divide-slate-200">
          {positions.slice(0, 20).map((position) => (
            <div key={position.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm">
              <div>
                <span className="font-bold text-slate-950">
                  {position.latitude}, {position.longitude}
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  速度 {position.speed_kmh ?? "-"} km/h / 方位 {position.heading_degrees ?? "-"}°
                </p>
              </div>
              <div className="text-right">
                <span className="text-slate-600">{formatDateTime(position.received_at)}</span>
                <p>
                  <a
                    href={`https://www.google.com/maps?q=${position.latitude},${position.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-brand-700"
                  >
                    地図
                  </a>
                </p>
              </div>
            </div>
          ))}
          {positions.length === 0 && <p className="py-3 text-sm text-slate-500">位置履歴はありません。</p>}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-black text-slate-950">raw受信ログ</h3>
        <div className="mt-3 divide-y divide-slate-200">
          {rawLogs.slice(0, 20).map((log) => (
            <div key={log.id} className="py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-950">{GPS_PACKET_TYPE_LABELS[log.packet_type]}</span>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(log.received_at)}</p>
                </div>
                <GpsStatusBadge label={GPS_PARSE_STATUS_LABELS[log.parse_status]} tone={log.parse_status === "parsed" ? "green" : "yellow"} />
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-bold text-brand-700">raw_hexを表示</summary>
                <p className="mt-2 break-all rounded bg-slate-50 p-2 font-mono text-xs text-slate-600">{log.raw_hex}</p>
              </details>
            </div>
          ))}
          {rawLogs.length === 0 && <p className="py-3 text-sm text-slate-500">rawログはありません。</p>}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-black text-slate-950">操作履歴</h3>
        <div className="mt-3 divide-y divide-slate-200">
          {operationLogs.slice(0, 20).map((log) => (
            <div key={log.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-bold text-slate-950">{GPS_OPERATION_TYPE_LABELS[log.operation_type]}</p>
                <p className="mt-1 text-slate-600">{log.reason}</p>
                <p className="mt-1 text-xs text-slate-500">{log.result_message ?? "-"}</p>
              </div>
              <div className="text-right">
                <GpsStatusBadge
                  label={GPS_OPERATION_STATUS_LABELS[log.result_status]}
                  tone={log.result_status === "failed" ? "red" : log.result_status === "cancelled" ? "yellow" : "green"}
                />
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(log.created_at)}</p>
              </div>
            </div>
          ))}
          {operationLogs.length === 0 && <p className="py-3 text-sm text-slate-500">操作履歴はありません。</p>}
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
