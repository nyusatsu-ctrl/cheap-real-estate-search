import Link from "next/link";
import { notFound } from "next/navigation";
import { GpsCustomerForm } from "@/components/gps/GpsCustomerForm";
import { findGpsCustomer, loadGpsAdminData } from "@/lib/gps/data";

export default async function EditGpsCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadGpsAdminData();
  const customer = findGpsCustomer(data, id);
  if (!customer) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-brand-700">顧客管理</p>
          <h2 className="text-2xl font-black text-slate-950">顧客情報を編集</h2>
        </div>
        <Link href={`/admin/gps/customers/${customer.id}`} className="text-sm font-bold text-brand-700">
          詳細へ戻る
        </Link>
      </div>
      <GpsCustomerForm customer={customer} />
    </div>
  );
}
