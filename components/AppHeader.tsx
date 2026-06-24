"use client";

import { EcoloopAdminBrand } from "@/components/EcoloopAdminBrand";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppHeader() {
  const pathname = usePathname();
  const isAdminLogin = pathname === "/admin/login";
  const isSalesAdmin = pathname.startsWith("/admin/sales-contracts") || pathname.startsWith("/admin/sales-customers") || pathname.startsWith("/admin/sales-lease-maturities") || pathname.startsWith("/admin/sales-help");
  const isContractAdmin = isSalesAdmin;
  const title = isContractAdmin ? "契約管理システム" : "建設業売上アップ診断";
  const href = isSalesAdmin ? "/admin/sales-contracts" : isAdminLogin ? "/admin/login" : "/diagnosis";
  const logoProps = isSalesAdmin
    ? { logoSrc: "/brand/ecoloop-logo.png", logoWidth: 134, logoHeight: 80, logoClassName: "h-8 sm:h-9" }
    : { logoSrc: "/images/ecoloop-sales-diagnosis-logo.png", logoWidth: 1914, logoHeight: 822, logoClassName: "h-9 sm:h-12" };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href={href} className="min-w-0">
          <EcoloopAdminBrand
            showSystemName
            systemName={title}
            className="gap-2 sm:gap-3"
            textClassName="text-xs sm:text-sm"
            priority={isAdminLogin}
            {...logoProps}
          />
        </Link>
        {!isContractAdmin ? (
          <nav className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-700 sm:gap-3 sm:text-sm">
            <Link href="/diagnosis" className="hover:text-brand-700">
              診断フォーム
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
