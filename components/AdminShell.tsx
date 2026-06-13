import Link from "next/link";
import { signOutAction } from "@/app/admin/actions";

const adminMenuItems = [
  { href: "/admin/properties", label: "物件管理" },
  { href: "/admin/estimates", label: "問い合わせ管理" }
];

export function AdminShell({ children, email }: { children: React.ReactNode; email: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">格安不動産サーチ 管理画面</p>
          <h1 className="text-2xl font-black text-slate-950">物件管理システム</h1>
          <p className="mt-1 text-xs text-slate-500">{email}</p>
        </div>
        <div className="flex items-center gap-2">
          {adminMenuItems.map((item) => (
            <Link key={item.href} href={item.href} className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
              {item.label}
            </Link>
          ))}
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
