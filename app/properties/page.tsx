import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, CircleCheck, LockKeyhole, ShieldCheck } from "lucide-react";
import { PropertyCard } from "@/components/PropertyCard";
import { SearchFilters } from "@/components/SearchFilters";
import { PROPERTY_PUBLIC_PRICE_RANGE_OPTIONS } from "@/lib/constants";
import { PROPERTY_INFORMATION_NOTICE } from "@/lib/legal";
import {
  evaluatePropertyAccess,
  formatPropertyDateJst,
  getPropertyAccessPageState,
  type PropertyAccessPageState
} from "@/lib/property-access";
import { buildPropertySearchPath, firstString, normalizePropertyFilters, type PropertySearchParams } from "@/lib/property-filters";
import { propertyMetadata } from "@/lib/property-metadata";
import { getPublishedPropertiesResult } from "@/lib/properties";
import { getCurrentMember, type CurrentMember } from "@/lib/user";

const PUBLIC_PROPERTIES_PAGE_SIZE = 100;

export const metadata: Metadata = propertyMetadata(
  "物件一覧｜格安不動産サーチ",
  "全国の0円物件、空き家、古家付き土地、山林、300万円以下の格安不動産を検索できます。"
);

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<PropertySearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const member = await getCurrentMember();
  const access = member?.access ?? evaluatePropertyAccess(null);
  const accessState = getPropertyAccessPageState(access);
  if (!member || !access.allowed) {
    return (
      <RestrictedProperties
        accessState={accessState}
        memberEmail={member?.email ?? null}
        memberStatus={member?.subscriptionStatus ?? null}
      />
    );
  }

  const filters = normalizePropertyFilters(resolvedSearchParams, {
    priceRangeOptions: PROPERTY_PUBLIC_PRICE_RANGE_OPTIONS,
    locationFilterMode: "prefecture-only"
  });
  const requestedPage = getRequestedPage(resolvedSearchParams);
  const propertiesResult = await getPublishedPropertiesResult(filters, { page: requestedPage, pageSize: PUBLIC_PROPERTIES_PAGE_SIZE });
  const { properties, totalCount, page, pageSize, errorMessage } = propertiesResult;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentSearchPath = buildPropertySearchPath(resolvedSearchParams, { page });

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-sky-50/60 to-white">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:py-8">
        <section className="mb-3 rounded-lg border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/80 to-sky-50 p-4 shadow-lg shadow-emerald-900/5 sm:mb-5 sm:p-7">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full bg-emerald-700 px-2.5 py-0.5 text-xs font-black text-white shadow-sm sm:px-3 sm:py-1">
              毎朝更新
            </p>
            <h1 className="mt-2 text-xl font-black leading-tight text-slate-950 sm:mt-3 sm:text-4xl">
              全国の格安不動産・0円物件を毎朝更新
            </h1>
            <p className="mt-2 text-sm font-semibold leading-5 text-slate-700 sm:mt-3 sm:text-base sm:leading-6">
              空き家・山林・土地・戸建てをまとめて検索できます。
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-bold text-emerald-900 sm:mt-4 sm:gap-2 sm:text-sm">
              <span className="rounded-full bg-white/85 px-2.5 py-0.5 shadow-sm ring-1 ring-emerald-100 sm:px-3 sm:py-1">毎朝取得</span>
              <span className="rounded-full bg-white/85 px-2.5 py-0.5 shadow-sm ring-1 ring-emerald-100 sm:px-3 sm:py-1">地域で探す</span>
              <span className="rounded-full bg-white/85 px-2.5 py-0.5 shadow-sm ring-1 ring-emerald-100 sm:px-3 sm:py-1">掲載元で確認</span>
            </div>
          </div>
        </section>
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/95 px-3 py-2 text-[11px] font-medium leading-4 text-amber-900 shadow-sm sm:mb-5 sm:text-xs sm:leading-5">
          <span className="font-black">掲載情報について：</span>
          {PROPERTY_INFORMATION_NOTICE}
        </div>
        <MemberAccessSummary member={member} accessState={accessState} />
        <SearchFilters
          key={currentSearchPath}
          locations={[]}
          prefecture={filters.prefecture}
          priceRange={filters.priceRange}
          priceRangeOptions={PROPERTY_PUBLIC_PRICE_RANGE_OPTIONS}
          propertyType={filters.propertyType}
          sort={filters.sort}
          keyword={filters.keyword}
          locationMode="prefecture-only"
        />
        <div className="mt-5 flex items-center justify-between rounded-lg border border-slate-200 bg-white/85 px-4 py-3 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">{formatResultRange(totalCount, properties.length, page, pageSize)}</p>
        </div>
        {errorMessage ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            {errorMessage}
          </div>
        ) : null}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} returnPath={currentSearchPath} />
          ))}
        </div>
        {properties.length === 0 && !errorMessage ? (
          <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
            条件に一致する公開物件はありません。
          </div>
        ) : null}
        {!errorMessage && totalPages > 1 ? (
          <Pagination searchParams={resolvedSearchParams} currentPage={page} totalPages={totalPages} />
        ) : null}
      </div>
    </div>
  );
}

function MemberAccessSummary({
  member,
  accessState
}: {
  member: CurrentMember;
  accessState: PropertyAccessPageState;
}) {
  if (accessState === "trial") {
    return (
      <section className="mb-5 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sky-950" aria-label="無料期間">
        <div className="flex items-start gap-3">
          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
          <div>
            <p className="font-black">14日間の無料期間中です</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <div>開始日: {formatPropertyDateJst(member.trialStartedAt)}</div>
              <div>終了日: {formatPropertyDateJst(member.trialEndsAt)}</div>
              <div>残り: {member.access.remainingTrialDays}日</div>
            </div>
            <p className="mt-2 text-xs leading-5">無料登録だけでは自動課金されません。無料期間中は物件一覧と物件詳細を閲覧できます。</p>
          </div>
        </div>
      </section>
    );
  }

  if (accessState === "active") {
    return (
      <section className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950" aria-label="有料会員">
        <div className="flex items-start gap-3">
          <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div>
            <p className="font-black">有料会員として利用中です</p>
            <p className="mt-1 text-sm">
              {member.cancelAtPeriodEnd ? "利用期限" : "次回更新日"}: {formatPropertyDateJst(member.currentPeriodEnd)}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-800" aria-label="管理者アクセス">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700" />
        <p className="font-black">管理者権限で物件情報を閲覧しています</p>
      </div>
    </section>
  );
}

function RestrictedProperties({
  accessState,
  memberEmail,
  memberStatus
}: {
  accessState: PropertyAccessPageState;
  memberEmail: string | null;
  memberStatus: string | null;
}) {
  const content = restrictedContent(accessState, memberStatus);
  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-emerald-50 via-sky-50/60 to-white">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <section className="grid gap-6 rounded-lg border border-emerald-100 bg-white p-6 shadow-lg shadow-emerald-900/5 md:grid-cols-[1fr_20rem] md:items-center">
          <div>
            <LockKeyhole className="h-8 w-8 text-emerald-700" />
            <h1 className="mt-4 text-3xl font-black leading-tight text-slate-950">{content.heading}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
              {content.description}
            </p>
            {memberEmail ? <p className="mt-3 text-sm font-semibold text-slate-500">ログイン中: {memberEmail}</p> : null}
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold text-emerald-900">
              <span className="rounded bg-emerald-50 px-3 py-2">登録後14日間無料</span>
              <span className="rounded bg-sky-50 px-3 py-2">カード登録不要</span>
              <span className="rounded bg-slate-100 px-3 py-2">自動課金なし</span>
            </div>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-bold text-slate-500">{content.label}</p>
            <p className="mt-2 text-3xl font-black text-emerald-800">月額4,980円<span className="ml-1 text-xs">税込</span></p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{content.paymentDescription}</p>
            <div className="mt-5 grid gap-2">
              <Link href={content.primaryHref} className="rounded bg-emerald-700 px-4 py-3 text-center font-bold text-white focus-ring">
                {content.primaryLabel}
              </Link>
              {accessState === "anonymous" ? (
                <Link href="/login?next=/properties" className="rounded border border-slate-300 bg-white px-4 py-3 text-center font-bold text-slate-700 focus-ring">
                  会員ログイン
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function restrictedContent(accessState: PropertyAccessPageState, memberStatus: string | null) {
  if (accessState === "anonymous") {
    return {
      heading: "登録後14日間、格安不動産を無料で検索",
      description:
        "0円物件、空き家、古家付き土地、山林、300万円以下の物件を毎朝更新しています。無料登録すると、14日間だけ実際の物件一覧と詳細を閲覧できます。",
      label: "初めての方へ",
      paymentDescription: "無料登録にカードは不要です。14日後に自動課金されることはありません。",
      primaryHref: "/signup",
      primaryLabel: "無料登録する"
    };
  }

  if (accessState === "trial_expired") {
    return {
      heading: "無料期間が終了しました",
      description:
        "14日間の無料期間が終了したため、物件一覧と物件詳細の閲覧を停止しています。継続利用する場合は有料プランへお申し込みください。",
      label: "無料期間終了",
      paymentDescription: "有料申込み時に4,980円（税込）が即時決済され、以後毎月自動更新されます。",
      primaryHref: "/billing?access=trial_expired",
      primaryLabel: "月額4,980円で利用を開始する"
    };
  }

  if (accessState === "payment_required") {
    return {
      heading: "お支払いの確認が必要です",
      description:
        "現在のお支払いを確認できないため、物件一覧と物件詳細の閲覧を停止しています。契約・支払い管理で請求状況をご確認ください。",
      label: propertySubscriptionStatusLabel(memberStatus),
      paymentDescription: "カード情報や未払いの請求を確認すると、契約状態に応じて利用を再開できます。",
      primaryHref: "/billing?access=payment_required",
      primaryLabel: "契約・支払いを確認する"
    };
  }

  return {
    heading: "現在は物件を閲覧できません",
    description:
      "契約が終了または停止しているため、物件一覧と物件詳細の閲覧を停止しています。契約状態を確認し、必要に応じて有料プランへ再度お申し込みください。",
    label: propertySubscriptionStatusLabel(memberStatus),
    paymentDescription: "有料申込み時に4,980円（税込）が即時決済され、以後毎月自動更新されます。",
    primaryHref: "/billing?access=inactive",
    primaryLabel: "契約状態を確認する"
  };
}

function propertySubscriptionStatusLabel(status: string | null) {
  const labels: Record<string, string> = {
    active: "有料期間終了",
    past_due: "支払い確認待ち",
    unpaid: "未払い",
    canceled: "契約終了",
    incomplete: "決済未完了",
    incomplete_expired: "決済期限切れ",
    paused: "利用停止"
  };
  return status ? labels[status] ?? "利用停止" : "利用停止";
}

function Pagination({
  searchParams,
  currentPage,
  totalPages
}: {
  searchParams: PropertySearchParams;
  currentPage: number;
  totalPages: number;
}) {
  const items = getPaginationItems(currentPage, totalPages);

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="物件一覧ページ">
      {currentPage > 1 ? (
        <Link href={buildPageHref(searchParams, currentPage - 1)} className={paginationLinkClass}>
          前へ
        </Link>
      ) : (
        <span className={paginationDisabledClass}>前へ</span>
      )}
      {items.map((item, index) => {
        if (item === "ellipsis") {
          return (
            <span key={`ellipsis-${index}`} className="px-2 text-sm font-semibold text-slate-400">
              ...
            </span>
          );
        }

        const isCurrent = item === currentPage;
        return isCurrent ? (
          <span key={item} aria-current="page" className={paginationCurrentClass}>
            {item}
          </span>
        ) : (
          <Link key={item} href={buildPageHref(searchParams, item)} className={paginationLinkClass}>
            {item}
          </Link>
        );
      })}
      {currentPage < totalPages ? (
        <Link href={buildPageHref(searchParams, currentPage + 1)} className={paginationLinkClass}>
          次へ
        </Link>
      ) : (
        <span className={paginationDisabledClass}>次へ</span>
      )}
    </nav>
  );
}

function getRequestedPage(params: PropertySearchParams) {
  const page = Number(firstString(params.page));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function formatResultRange(totalCount: number, itemCount: number, page: number, pageSize: number) {
  if (totalCount === 0) return "0件";
  if (itemCount === 0) return `${totalCount.toLocaleString("ja-JP")}件中 0件を表示`;

  const start = (page - 1) * pageSize + 1;
  const end = start + itemCount - 1;
  return `${totalCount.toLocaleString("ja-JP")}件中 ${start.toLocaleString("ja-JP")}〜${end.toLocaleString("ja-JP")}件を表示`;
}

function getPaginationItems(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);

  if (currentPage <= 4) {
    [2, 3, 4, 5].forEach((page) => pages.add(page));
  }

  if (currentPage >= totalPages - 3) {
    [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1].forEach((page) => pages.add(page));
  }

  const sortedPages = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  sortedPages.forEach((page, index) => {
    const previous = sortedPages[index - 1];
    if (previous && page - previous > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  });

  return items;
}

function buildPageHref(params: PropertySearchParams, page: number) {
  return buildPropertySearchPath(params, { page });
}

const paginationLinkClass = "inline-flex min-h-10 min-w-10 items-center justify-center rounded border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm hover:border-emerald-600 hover:text-emerald-700 focus-ring";
const paginationCurrentClass = "inline-flex min-h-10 min-w-10 items-center justify-center rounded border border-emerald-700 bg-emerald-700 px-3 text-sm font-bold text-white shadow-sm";
const paginationDisabledClass = "inline-flex min-h-10 min-w-10 items-center justify-center rounded border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-400";
