import Link from "next/link";
import { notFound } from "next/navigation";
import { GpsVehicleForm } from "@/components/gps/GpsVehicleForm";
import { findGpsVehicle, loadGpsAdminData } from "@/lib/gps/data";

export default async function EditGpsVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadGpsAdminData();
  const vehicle = findGpsVehicle(data, id);
  if (!vehicle) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-brand-700">車両管理</p>
          <h2 className="text-2xl font-black text-slate-950">車両情報を編集</h2>
        </div>
        <Link href={`/admin/gps/vehicles/${vehicle.id}`} className="text-sm font-bold text-brand-700">
          詳細へ戻る
        </Link>
      </div>
      <GpsVehicleForm vehicle={vehicle} customers={data.customers} />
    </div>
  );
}
