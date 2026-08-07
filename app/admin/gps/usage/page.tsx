import { GpsDataUsagePanel } from "@/components/gps/GpsDataUsagePanel";
import { loadGpsAdminData } from "@/lib/gps/data";

export default async function GpsUsagePage() {
  const data = await loadGpsAdminData();
  return (
    <div className="space-y-5">
      <GpsDataUsagePanel />
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">端末別の取得準備</h2>
        <p className="mt-1 text-sm text-slate-600">
          現在は1NCE API未接続のため、端末別通信量はすべて未取得です。架空値は表示しません。
        </p>
        <div className="mt-3 divide-y divide-slate-200">
          {data.devices.map((device) => (
            <div key={device.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <span className="font-bold text-slate-950">{device.device_name}</span>
              <span className="font-bold text-slate-500">未取得</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
