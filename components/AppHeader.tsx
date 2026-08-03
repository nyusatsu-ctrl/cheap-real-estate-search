"use client";

import { EcoloopAdminBrand } from "@/components/EcoloopAdminBrand";
import { PropertyLogoutForm } from "@/components/PropertyLogoutForm";
import {
  getBridgedPropertyMemberState,
  subscribeToPropertyMemberState,
  type PropertyMemberState
} from "@/components/PropertyMemberStateBridge";
import type { PropertyAccessPageState } from "@/lib/property-access";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DIAGNOSIS_APP_NAME } from "@/lib/diagnosis-brand";

export function AppHeader() {
  const pathname = usePathname();
  if (pathname.startsWith("/diagnosis/print")) return null;
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
    pathname.startsWith("/construction-sales-diagnosis")
    || pathname.startsWith("/diagnosis")
    || pathname === "/admin/login"
    || pathname.startsWith("/admin/diagnoses");
  const showPropertyMemberState =
    pathname === "/"
    || [
      "/properties",
      "/plans",
      "/signup",
      "/login",
      "/dashboard",
      "/billing",
      "/forgot-password",
      "/reset-password",
      "/auth/callback",
      "/estimate",
      "/legal",
      "/privacy",
      "/terms",
      "/contact",
      "/partners"
    ].some((prefix) => pathname.startsWith(prefix));

  if (pathname.startsWith("/income-potential")) return <IncomePotentialHeader />;
  if (isSalesAdmin) return <ContractAdminHeader />;
  if (isTenderRoute) return <TenderHeader />;
  if (isDiagnosisRoute) return <DiagnosisHeader priority={pathname === "/admin/login"} />;
  return <RealEstateHeader showMemberState={showPropertyMemberState} />;
}

function IncomePotentialHeader() {
  return (
    <header className="border-b border-[#2a2418] bg-[#0b0a0f] text-stone-100">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/income-potential" className="min-w-0">
          <div className="min-w-0">
            <p className="text-base font-black leading-tight tracking-normal text-[#f4d58d] sm:text-lg">年収ポテンシャル診断</p>
            <p className="mt-1 text-xs font-semibold text-stone-400">Income Potential Check</p>
          </div>
        </Link>
        <nav className="flex shrink-0 items-center gap-3 text-xs font-bold text-stone-300 sm:text-sm">
          <Link href="/income-potential" className="hover:text-[#f4d58d]">
            診断する
          </Link>
        </nav>
      </div>
    </header>
  );
}

function DiagnosisHeader({ priority = false }: { priority?: boolean }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/diagnosis" className="min-w-0">
          <EcoloopAdminBrand
            showSystemName
            systemName={DIAGNOSIS_APP_NAME}
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
            無料診断
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

function RealEstateHeader({ showMemberState }: { showMemberState: boolean }) {
  const fetchedMember = usePropertyMember(showMemberState);
  const member = showMemberState ? fetchedMember : null;
  const showAnonymousActions = !showMemberState || member?.authenticated === false;

  return (
    <header className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-sky-50 shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:gap-4 sm:py-5">
        <Link href="/properties" className="flex w-full min-w-0 items-center gap-2.5 sm:w-auto sm:gap-4">
          <Image
            src="/images/ecoloop-logo.jpeg"
            alt="株式会社エコループ"
            width={903}
            height={539}
            priority
            className="h-11 w-auto shrink-0 object-contain sm:h-14"
            sizes="(max-width: 640px) 120px, 150px"
          />
          <div className="min-w-0">
            <p className="text-[22px] font-black leading-tight text-emerald-950 sm:text-3xl">格安不動産サーチ</p>
            <p className="mt-0.5 text-[15px] font-bold leading-tight text-emerald-700 sm:text-lg">株式会社エコループ</p>
          </div>
        </Link>
        <nav className="flex w-full flex-wrap items-center gap-1.5 text-[13px] font-bold text-slate-700 sm:w-auto sm:justify-end sm:gap-2 sm:text-[15px]">
          <Link href="/properties" className="rounded-full bg-white/85 px-2.5 py-1.5 shadow-sm ring-1 ring-emerald-100 hover:text-emerald-700 sm:px-3 sm:py-2">
            物件一覧
          </Link>
          <Link href="/plans" className="rounded-full bg-white/85 px-2.5 py-1.5 shadow-sm ring-1 ring-emerald-100 hover:text-emerald-700 sm:px-3 sm:py-2">
            料金
          </Link>
          {showAnonymousActions ? (
            <>
              <Link href="/signup" className="rounded-full bg-white/85 px-2.5 py-1.5 shadow-sm ring-1 ring-emerald-100 hover:text-emerald-700 sm:px-3 sm:py-2">
                無料登録
              </Link>
              <Link href="/dashboard" className="rounded-full bg-white/85 px-2.5 py-1.5 shadow-sm ring-1 ring-emerald-100 hover:text-emerald-700 sm:px-3 sm:py-2">
                会員ログイン
              </Link>
            </>
          ) : null}
          {member?.authenticated ? (
            <>
              <span className="max-w-full truncate rounded bg-white/85 px-2.5 py-1.5 text-xs shadow-sm ring-1 ring-emerald-100 sm:max-w-64 sm:px-3 sm:py-2 sm:text-sm" title={member.email}>
                {member.email}
                <span className="ml-2 font-black text-emerald-700">{propertyMemberStatusLabel(member)}</span>
              </span>
              <Link
                href={member.role === "admin" ? "/admin/properties" : "/dashboard"}
                className="rounded-full bg-white/85 px-2.5 py-1.5 shadow-sm ring-1 ring-emerald-100 hover:text-emerald-700 sm:px-3 sm:py-2"
              >
                {member.role === "admin" ? "管理画面" : "会員ページ"}
              </Link>
              <PropertyLogoutForm compact />
            </>
          ) : null}
          {!member?.authenticated ? (
            <Link href="/admin/login?next=/admin/properties" className="px-1 py-1 text-xs font-semibold text-slate-500 underline-offset-4 hover:text-emerald-700 hover:underline sm:text-sm">
              管理者ログイン
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

function usePropertyMember(enabled: boolean) {
  const [member, setMember] = useState<PropertyMemberState | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let ignore = false;
    const unsubscribe = subscribeToPropertyMemberState((nextMember) => {
      if (!ignore) setMember(nextMember);
    });
    const bridgedMember = getBridgedPropertyMemberState();
    if (bridgedMember) {
      const syncTimeoutId = window.setTimeout(() => {
        if (!ignore) setMember(bridgedMember);
      }, 0);
      return () => {
        ignore = true;
        window.clearTimeout(syncTimeoutId);
        unsubscribe();
      };
    }

    // Property pages publish their server-known member state during hydration.
    // Delay the fallback request briefly so those pages do not query Auth/Profile twice.
    const timeoutId = window.setTimeout(() => {
      if (getBridgedPropertyMemberState()) return;
      fetch("/api/property-member", { cache: "no-store" })
        .then((response) => response.ok ? response.json() as Promise<PropertyMemberState> : null)
        .then((data) => {
          if (!ignore && data) setMember(data);
        })
        .catch(() => {
          if (!ignore) setMember(null);
        });
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [enabled]);

  return member;
}

function propertyMemberStatusLabel(member: Extract<PropertyMemberState, { authenticated: true }>) {
  if (member.role === "admin") return "管理者";

  const labels: Record<PropertyAccessPageState, string> = {
    anonymous: "未ログイン",
    trial: "無料期間中",
    active: "有料会員",
    admin: "管理者",
    trial_expired: "無料期間終了",
    payment_required: "支払い確認要",
    inactive: "利用停止"
  };
  return labels[member.accessState];
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
