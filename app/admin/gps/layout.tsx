import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { getGpsAdminOrPreview } from "@/lib/gps/data";

export default async function AdminGpsLayout({ children }: { children: React.ReactNode }) {
  const admin = await getGpsAdminOrPreview();

  if (!admin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">GPS管理画面</h1>
          <p className="mt-2 text-slate-700">MV930G GPS管理には管理者ログインが必要です。</p>
          <Link href="/admin/login" className="mt-5 inline-block rounded bg-brand-700 px-4 py-2 font-bold text-white focus-ring">
            ログインへ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AdminShell email={admin.email}>
      {admin.isPreview && (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          Supabase未設定のためGPS画面はデモデータで表示しています。
        </div>
      )}
      {children}
    </AdminShell>
  );
}
