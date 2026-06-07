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
          <Link href="/admin/tenders" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
            案件管理
          </Link>
          <Link href="/admin/tender-sources" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
            取得元
          </Link>
          <Link href="/admin/tender-candidates" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
            候補確認
          </Link>
          <Link href="/admin/defense-crawl" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
            防衛省取得
          </Link>
          <Link href="/admin/scrivener-inquiries" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
            行政書士相談
          </Link>
          <Link href="/admin/estimates" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
            見積管理
          </Link>
          <Link href="/admin/tenders/new" className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
            案件登録
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
