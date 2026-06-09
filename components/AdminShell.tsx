import Link from "next/link";
import { signOutAction } from "@/app/admin/actions";

const gpsMenuItems = [
  { href: "/admin", label: "GPS概要" },
  { href: "/admin/customers", label: "顧客" },
  { href: "/admin/vehicles", label: "車両" },
  { href: "/admin/devices", label: "端末" },
  { href: "/admin/positions", label: "最新位置" },
  { href: "/admin/raw-logs", label: "rawログ" },
  { href: "/admin/operations", label: "操作ログ" },
  { href: "/admin/test", label: "実機テスト" },
  { href: "/admin/mock", label: "モック投入" }
];

export function AdminShell({ children, email }: { children: React.ReactNode; email: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">GPS専用管理アプリ</p>
          <h1 className="text-2xl font-black text-slate-950">GPS車両管理システム</h1>
          <p className="mt-1 text-xs text-slate-500">{email}</p>
        </div>
        <div className="flex items-center gap-2">
          {gpsMenuItems.map((item) => (
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
