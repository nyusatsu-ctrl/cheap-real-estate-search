import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { TENDER_STATUS_LABELS, TENDER_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { getCurrentAdmin } from "@/lib/admin";
import { getAdminTenders } from "@/lib/tenders";

export default async function AdminTendersPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">管理画面</h1>
          <p className="mt-2 text-slate-700">案件管理には管理者ログインが必要です。</p>
          <Link href="/admin/login" className="mt-5 inline-block rounded bg-brand-700 px-4 py-2 font-bold text-white focus-ring">ログインへ</Link>
        </div>
      </div>
    );
  }

  const tenders = await getAdminTenders();

  return (
    <AdminShell email={admin.email}>
      <div className="mb-4 flex justify-end">
        <Link href="/admin/tenders/new" className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">案件を新規登録</Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">案件</th>
                <th className="px-3 py-3">機関</th>
                <th className="px-3 py-3">種別</th>
                <th className="px-3 py-3">締切</th>
                <th className="px-3 py-3">状態</th>
                <th className="px-3 py-3">重複候補</th>
                <th className="px-3 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tenders.map((tender) => (
                <tr key={tender.id}>
                  <td className="px-3 py-3 font-bold text-slate-950">{tender.title}</td>
                  <td className="px-3 py-3 text-slate-700">{tender.agency_name}</td>
                  <td className="px-3 py-3 text-slate-700">{TENDER_TYPE_LABELS[tender.tender_type]}</td>
                  <td className="px-3 py-3 text-slate-700">{formatDate(tender.deadline_at)}</td>
                  <td className="px-3 py-3 text-slate-700">{TENDER_STATUS_LABELS[tender.status]}</td>
                  <td className="px-3 py-3 text-xs text-slate-600">{findDuplicateHint(tender, tenders)}</td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/tenders/${tender.id}/edit`} className="font-bold text-brand-700">編集</Link>
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

function findDuplicateHint(current: Awaited<ReturnType<typeof getAdminTenders>>[number], tenders: Awaited<ReturnType<typeof getAdminTenders>>) {
  const duplicates = tenders.filter((tender) => tender.id !== current.id && (
    tender.source_url === current.source_url ||
    (tender.pdf_url && current.pdf_url && tender.pdf_url === current.pdf_url) ||
    (tender.title === current.title && tender.agency_name === current.agency_name && tender.deadline_at === current.deadline_at)
  ));
  return duplicates.length ? `${duplicates.length}件` : "-";
}
