import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { formatDate } from "@/lib/format";
import { getCurrentAdmin } from "@/lib/admin";
import { getScrivenerInquiries } from "@/lib/tenders";

export default async function AdminScrivenerInquiriesPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">管理画面</h1>
          <p className="mt-2 text-slate-700">相談管理には管理者ログインが必要です。</p>
          <Link href="/admin/login" className="mt-5 inline-block rounded bg-brand-700 px-4 py-2 font-bold text-white focus-ring">ログインへ</Link>
        </div>
      </div>
    );
  }

  const inquiries = await getScrivenerInquiries();

  return (
    <AdminShell email={admin.email}>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">会社/担当者</th>
                <th className="px-3 py-3">連絡先</th>
                <th className="px-3 py-3">所在地</th>
                <th className="px-3 py-3">希望</th>
                <th className="px-3 py-3">状態</th>
                <th className="px-3 py-3">受付日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {inquiries.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td className="px-3 py-3 font-bold text-slate-950">{inquiry.company_name}<br /><span className="text-xs font-semibold text-slate-500">{inquiry.contact_name}</span></td>
                  <td className="px-3 py-3 text-slate-700">{inquiry.email}<br />{inquiry.phone}</td>
                  <td className="px-3 py-3 text-slate-700">{inquiry.prefecture}</td>
                  <td className="px-3 py-3 text-slate-700">{inquiry.request_type}</td>
                  <td className="px-3 py-3 text-slate-700">{inquiry.status}</td>
                  <td className="px-3 py-3 text-slate-700">{formatDate(inquiry.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {inquiries.length === 0 ? <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">相談はまだありません。</div> : null}
    </AdminShell>
  );
}
