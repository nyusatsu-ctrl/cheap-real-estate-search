import Link from "next/link";
import { GpsVehicleForm } from "@/components/gps/GpsVehicleForm";
import { loadGpsAdminData } from "@/lib/gps/data";

export default async function NewGpsVehiclePage() {
  const data = await loadGpsAdminData();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-brand-700">車両管理</p>
          <h2 className="text-2xl font-black text-slate-950">車両を新規登録</h2>
        </div>
        <Link href="/admin/gps/vehicles" className="text-sm font-bold text-brand-700">
          一覧へ戻る
        </Link>
      </div>
      <GpsVehicleForm customers={data.customers} />
    </div>
  );
}
