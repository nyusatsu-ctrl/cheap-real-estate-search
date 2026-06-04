import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { STATUS_LABELS, PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/format";
import { getCurrentAdmin } from "@/lib/admin";
import { getAdminProperties } from "@/lib/properties";

export default async function AdminPropertiesPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">管理画面</h1>
          <p className="mt-2 text-slate-700">物件の登録・編集には管理者ログインが必要です。</p>
          <Link href="/admin/login" className="mt-5 inline-block rounded bg-brand-700 px-4 py-2 font-bold text-white focus-ring">
            ログインへ
          </Link>
        </div>
      </div>
    );
  }

  const properties = await getAdminProperties();

  return (
    <AdminShell email={admin.email}>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">物件</th>
                <th className="px-3 py-3">価格</th>
                <th className="px-3 py-3">所在地</th>
                <th className="px-3 py-3">種別</th>
                <th className="px-3 py-3">状態</th>
                <th className="px-3 py-3">更新日</th>
                <th className="px-3 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {properties.map((property) => (
                <tr key={property.id}>
                  <td className="px-3 py-3 font-bold text-slate-950">{property.title}</td>
                  <td className="px-3 py-3 font-black text-brand-700">{formatPrice(property.price_yen)}</td>
                  <td className="px-3 py-3 text-slate-700">{property.prefecture}{property.city}</td>
                  <td className="px-3 py-3 text-slate-700">{PROPERTY_TYPE_LABELS[property.property_type]}</td>
                  <td className="px-3 py-3 text-slate-700">{STATUS_LABELS[property.status]}</td>
                  <td className="px-3 py-3 text-slate-700">{formatDate(property.updated_at)}</td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/properties/${property.id}/edit`} className="font-bold text-brand-700">
                      編集
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
