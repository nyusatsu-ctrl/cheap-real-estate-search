"use client";

import { EcoloopAdminBrand } from "@/components/EcoloopAdminBrand";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function AppHeader() {
  const pathname = usePathname();
  const isSalesAdmin = pathname.startsWith("/admin/sales-contracts") || pathname.startsWith("/admin/sales-customers") || pathname.startsWith("/admin/sales-lease-maturities") || pathname.startsWith("/admin/sales-help");
  const isTenderRoute =
    pathname.startsWith("/tenders")
    || pathname.startsWith("/favorites")
    || pathname.startsWith("/notifications")
    || pathname.startsWith("/qualification")
    || pathname.startsWith("/support-product")
    || pathname.startsWith("/admin/tenders")
    || pathname.startsWith("/admin/tender-sources")
    || pathname.startsWith("/admin/tender-candidates")
    || pathname.startsWith("/admin/past-awards")
    || pathname.startsWith("/admin/defense-crawl");
  const isDiagnosisRoute =
    pathname === "/"
    || pathname.startsWith("/diagnosis")
    || pathname === "/admin/login"
    || pathname.startsWith("/admin/diagnoses");

  if (isSalesAdmin) return <ContractAdminHeader />;
  if (isTenderRoute) return <TenderHeader />;
  if (isDiagnosisRoute) return <DiagnosisHeader priority={pathname === "/admin/login"} />;
  return <RealEstateHeader />;
}

function DiagnosisHeader({ priority = false }: { priority?: boolean }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/diagnosis" className="min-w-0">
          <EcoloopAdminBrand
            showSystemName
            systemName="建設業売上アップ診断"
            className="gap-2 sm:gap-3"
            textClassName="text-xs sm:text-sm"
            priority={priority}
            logoSrc="/images/ecoloop-sales-diagnosis-logo.png"
            logoWidth={1914}
            logoHeight={822}
            logoClassName="h-9 sm:h-12"
          />
        </Link>
        <nav className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-700 sm:gap-3 sm:text-sm">
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

function TenderHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/tenders" className="min-w-0">
          <div className="min-w-0">
            <p className="text-base font-black leading-tight text-slate-950 sm:text-lg">官公庁案件サーチ</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">株式会社エコループ</p>
          </div>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-slate-700 sm:gap-x-4 sm:text-sm">
          <Link href="/tenders" className="hover:text-brand-700">
            案件一覧
          </Link>
          <Link href="/favorites" className="hover:text-brand-700">
            お気に入り
          </Link>
          <Link href="/notifications" className="inline-flex items-center gap-1 hover:text-brand-700">
            通知
            <TenderUnreadBadge />
          </Link>
          <Link href="/qualification" className="hover:text-brand-700">
            資格ガイド
          </Link>
          <Link href="/tenders/pricing" className="hover:text-brand-700">
            料金
          </Link>
          <Link href="/admin/login?next=/admin/tenders" className="hover:text-brand-700">
            管理者ログイン
          </Link>
        </nav>
      </div>
    </header>
  );
}

function TenderUnreadBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let ignore = false;
    fetch("/api/tender-notifications/unread-count", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ count?: number }> : { count: 0 })
      .then((data) => {
        if (!ignore) setCount(Number(data.count ?? 0));
      })
      .catch(() => {
        if (!ignore) setCount(0);
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (count <= 0) return null;
  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand-700 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function RealEstateHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/properties" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Image
            src="/images/ecoloop-logo.jpeg"
            alt="株式会社エコループ"
            width={903}
            height={539}
            priority
            className="h-8 w-auto shrink-0 object-contain sm:h-10"
            sizes="(max-width: 640px) 90px, 112px"
          />
          <div className="min-w-0">
            <p className="text-base font-black leading-tight text-slate-950 sm:text-lg">格安不動産サーチ</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">株式会社エコループ</p>
          </div>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-slate-700 sm:gap-x-4 sm:text-sm">
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
          <Link href="/admin/login?next=/admin/properties" className="hover:text-brand-700">
            管理者ログイン
          </Link>
        </nav>
      </div>
    </header>
  );
}

function ContractAdminHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/admin/sales-contracts" className="min-w-0">
          <EcoloopAdminBrand
            showSystemName
            systemName="契約管理システム"
            className="gap-2 sm:gap-3"
            textClassName="text-xs sm:text-sm"
            logoSrc="/brand/ecoloop-logo.png"
            logoWidth={134}
            logoHeight={80}
            logoClassName="h-8 sm:h-9"
          />
        </Link>
      </div>
    </header>
  );
}
