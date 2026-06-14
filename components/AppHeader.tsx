"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppHeader() {
  const pathname = usePathname();
  const isDiagnosisArea = pathname.startsWith("/diagnosis") || pathname.startsWith("/admin/diagnoses") || pathname === "/admin/login";

  if (isDiagnosisArea) {
    return (
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/diagnosis" className="text-base font-bold text-slate-950">
            建設業売上アップ診断
          </Link>
          <nav className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <Link href="/diagnosis" className="hover:text-brand-700">
              診断フォーム
            </Link>
            <Link href="/admin/login" className="hover:text-brand-700">
              管理者ログイン
            </Link>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-base font-bold text-slate-950">
          建設業売上アップ診断
        </Link>
        <nav className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <Link href="/properties" className="hover:text-brand-700">
            物件一覧
          </Link>
          <Link href="/plans" className="hover:text-brand-700">
            料金
          </Link>
          <Link href="/signup" className="hover:text-brand-700">
            無料登録
          </Link>
          <Link href="/dashboard" className="hover:text-brand-700">
            会員
          </Link>
          <Link href="/admin/login" className="hover:text-brand-700">
            管理者ログイン
          </Link>
        </nav>
      </div>
    </header>
  );
}
