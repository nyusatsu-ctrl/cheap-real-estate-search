import Link from "next/link";
import { GpsCustomerForm } from "@/components/gps/GpsCustomerForm";

export default function NewGpsCustomerPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-brand-700">顧客管理</p>
          <h2 className="text-2xl font-black text-slate-950">顧客を新規登録</h2>
        </div>
        <Link href="/admin/gps/customers" className="text-sm font-bold text-brand-700">
          一覧へ戻る
        </Link>
      </div>
      <GpsCustomerForm />
    </div>
  );
}
