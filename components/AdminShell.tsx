import Link from "next/link";
import { signOutAction } from "@/app/admin/actions";

export function AdminShell({ children, email }: { children: React.ReactNode; email: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">運営者向け</p>
          <h1 className="text-2xl font-black text-slate-950">管理画面</h1>
          <p className="mt-1 text-xs text-slate-500">{email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/estimates" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
            見積管理
          </Link>
          <Link href="/admin/properties/new" className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
            新規登録
          </Link>
          <form action={signOutAction}>
            <button className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
              ログアウト
            </button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
