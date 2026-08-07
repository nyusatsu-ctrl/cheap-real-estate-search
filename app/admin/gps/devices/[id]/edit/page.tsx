import Link from "next/link";
import { notFound } from "next/navigation";
import { GpsDeviceForm } from "@/components/gps/GpsDeviceForm";
import { findGpsDevice, loadGpsAdminData } from "@/lib/gps/data";

export default async function EditGpsDevicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadGpsAdminData();
  const device = findGpsDevice(data, id);
  if (!device) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-brand-700">GPS端末管理</p>
          <h2 className="text-2xl font-black text-slate-950">GPS端末情報を編集</h2>
        </div>
        <Link href={`/admin/gps/devices/${device.id}`} className="text-sm font-bold text-brand-700">
          詳細へ戻る
        </Link>
      </div>
      <GpsDeviceForm device={device} vehicles={data.vehicles} />
    </div>
  );
}
