import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { TenderForm } from "@/components/tenders/TenderForm";
import { getCurrentAdmin } from "@/lib/admin";
import { getAdminTender } from "@/lib/tenders";

export default async function EditTenderPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">管理画面</h1>
          <p className="mt-2 text-slate-700">物件編集には管理者ログインが必要です。</p>
          <Link href="/admin/login" className="mt-5 inline-block rounded bg-brand-700 px-4 py-2 font-bold text-white focus-ring">ログインへ</Link>
        </div>
      </div>
    );
  }

  const { id } = await params;
  const tender = await getAdminTender(id);
  if (!tender) notFound();

  return (
    <AdminShell email={admin.email}>
      <TenderForm tender={tender} />
    </AdminShell>
  );
}
