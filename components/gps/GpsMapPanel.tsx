import type { GpsLatestPosition } from "@/lib/gps/types";

export function GpsMapPanel({ positions }: { positions: GpsLatestPosition[] }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const center = positions[0];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-slate-950">地図表示</h2>
          <p className="text-sm text-slate-600">Google Maps APIキー未設定時は緯度経度テーブルで表示します。</p>
        </div>
        {!apiKey && <span className="rounded bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">APIキー未設定</span>}
      </div>

      {apiKey && center ? (
        <iframe
          title="GPS最新位置"
          className="h-80 w-full rounded border border-slate-200"
          loading="lazy"
          src={`https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(apiKey)}&center=${center.latitude},${center.longitude}&zoom=15`}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">車両</th>
                <th className="px-3 py-3">顧客</th>
                <th className="px-3 py-3">緯度</th>
                <th className="px-3 py-3">経度</th>
                <th className="px-3 py-3">受信日時</th>
                <th className="px-3 py-3">地図</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {positions.map((position) => (
                <tr key={position.id}>
                  <td className="px-3 py-3 font-bold text-slate-950">
                    {[position.maker, position.model_name, position.license_plate].filter(Boolean).join(" / ") || "-"}
                  </td>
                  <td className="px-3 py-3 text-slate-700">{position.customer_name ?? "-"}</td>
                  <td className="px-3 py-3 text-slate-700">{position.latitude}</td>
                  <td className="px-3 py-3 text-slate-700">{position.longitude}</td>
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
              {positions.length === 0 && (
                <tr>
                  <td className="px-3 py-5 text-slate-500" colSpan={6}>
                    最新位置はまだありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
}
