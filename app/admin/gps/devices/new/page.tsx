import Link from "next/link";
import { GpsDeviceForm } from "@/components/gps/GpsDeviceForm";
import { loadGpsAdminData } from "@/lib/gps/data";

export default async function NewGpsDevicePage() {
  const data = await loadGpsAdminData();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-brand-700">GPS端末管理</p>
          <h2 className="text-2xl font-black text-slate-950">GPS端末を新規登録</h2>
        </div>
        <Link href="/admin/gps/devices" className="text-sm font-bold text-brand-700">
          一覧へ戻る
        </Link>
      </div>
      <GpsDeviceForm vehicles={data.vehicles} />
    </div>
  );
}
