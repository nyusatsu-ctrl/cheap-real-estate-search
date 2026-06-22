"use client";

import { EcoloopAdminBrand } from "@/components/EcoloopAdminBrand";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppHeader() {
  const pathname = usePathname();
  const isAdminLogin = pathname === "/admin/login";
  const isSalesAdmin = pathname.startsWith("/admin/sales-contracts") || pathname.startsWith("/admin/sales-customers") || pathname.startsWith("/admin/sales-lease-maturities");
  const isContractAdmin = isAdminLogin || isSalesAdmin;
  const title = isContractAdmin ? "契約管理システム" : "格安不動産サーチ";
  const href = isSalesAdmin ? "/admin/sales-contracts" : isAdminLogin ? "/admin/login" : "/";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href={href} className={isContractAdmin ? "min-w-0" : "text-base font-bold text-slate-950"}>
          {isContractAdmin ? (
            <EcoloopAdminBrand showSystemName logoClassName="h-8 sm:h-9" priority={isAdminLogin} />
          ) : title}
        </Link>
        {!isContractAdmin ? (
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
        ) : null}
      </div>
    </header>
  );
}
