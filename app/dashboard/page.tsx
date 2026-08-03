import Link from "next/link";
import type { Metadata } from "next";
import { CreditCard, FileSearch, MapPinned } from "lucide-react";
import { PropertyLogoutForm } from "@/components/PropertyLogoutForm";
import { PropertyMemberStateBridge } from "@/components/PropertyMemberStateBridge";
import { MONTHLY_PRICE_YEN } from "@/lib/billing/stripe";
import { formatPropertyDateJst, getPropertyAccessPageState } from "@/lib/property-access";
import { propertyMetadata } from "@/lib/property-metadata";
import { getPublishedProperties } from "@/lib/properties";
import { requireActiveMember } from "@/lib/user";

export const metadata: Metadata = propertyMetadata(
  "会員ダッシュボード｜格安不動産サーチ",
  "無料期間、契約状態、格安不動産の利用状況を確認できます。"
);

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const params = await searchParams;
  const member = await requireActiveMember();
  const properties = await getPublishedProperties({ maxPrice: 3000000 });
  const zeroYenCount = properties.filter((property) => property.price_yen === 0).length;
  const prefectureCount = new Set(properties.map((property) => property.prefecture).filter(Boolean)).size;
  const isTrial = member.access.reason === "trial";
  const isPaid = member.access.reason === "active";

  return (
    <>
      <PropertyMemberStateBridge
        member={{
          authenticated: true,
          email: member.email,
          role: member.role,
          accessState: getPropertyAccessPageState(member.access)
        }}
      />
      <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">会員ダッシュボード</p>
          <h1 className="text-2xl font-black text-slate-950">{member.email}</h1>
        </div>
        <PropertyLogoutForm />
      </div>

      {params.checkout === "success" ? (
        <div className="mb-5 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-900">
          有料プランへのお申し込みを受け付けました。Stripeからの決済確認後、契約状態が反映されます。
        </div>
      ) : null}

      {isTrial && member.access.showTrialEndingWarning ? (
        <div className="mb-5 rounded border border-amber-300 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950">
          無料期間はあと{member.access.remainingTrialDays}日です。無料期間終了後は物件情報を閲覧できなくなります。継続利用する場合は、月額4,980円（税込）の有料プランへお申し込みください。自動的に課金されることはありません。
          <Link href="/billing" className="mt-3 inline-flex rounded bg-amber-900 px-4 py-2 text-white focus-ring">
            月額4,980円で利用を開始する
          </Link>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
          <p className="text-sm font-bold text-brand-700">契約状態</p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {member.role === "admin" ? "管理者" : isTrial ? "無料利用中" : "有料会員"}
          </p>
          {isTrial ? (
            <dl className="mt-3 grid gap-1 text-sm text-slate-700">
              <div>開始日: {formatPropertyDateJst(member.trialStartedAt)}</div>
              <div>終了日: {formatPropertyDateJst(member.trialEndsAt)}</div>
              <div className="font-bold text-brand-800">残り{member.access.remainingTrialDays}日</div>
            </dl>
          ) : null}
          {isPaid ? (
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {member.cancelAtPeriodEnd ? "解約予約済み・利用期限" : "次回更新日"}: {formatPropertyDateJst(member.currentPeriodEnd)}
            </p>
          ) : null}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-500">公開物件</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{properties.length}件</p>
          <p className="mt-2 text-sm text-slate-700">対象エリア: {prefectureCount}都道府県</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-500">0円物件</p>
          <p className="mt-2 text-2xl font-black text-brand-700">{zeroYenCount}件</p>
          <p className="mt-2 text-sm text-slate-700">掘り出し物件を優先確認</p>
        </div>
      </section>

      {isTrial ? (
        <div className="mt-5 rounded border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
          無料期間終了後に自動課金されることはありません。継続利用には月額{MONTHLY_PRICE_YEN.toLocaleString("ja-JP")}円（税込）の有料申込みが必要です。
        </div>
      ) : null}
      {isPaid && member.cancelAtPeriodEnd ? (
        <div className="mt-5 rounded border border-sky-200 bg-sky-50 p-4 text-sm font-semibold leading-6 text-sky-950">
          解約予約を受け付けています。支払済み期間の終了日までは物件情報を利用できます。
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          [FileSearch, "物件検索", "0円物件、300万円以下、地域、物件種別で検索します。", "/properties?priceRange=under300"],
          [MapPinned, "エリア検索", "地方ブロック、都道府県、市区町村、空き家・古家・土地・山林の条件で探します。", "/properties"],
          [CreditCard, "契約・支払い管理", "有料申込み、カード変更、解約、契約期間の確認を行います。", "/billing"]
        ].map(([Icon, title, text, href]) => (
          <Link key={title as string} href={href as string} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm focus-ring">
            <Icon className="h-5 w-5 text-brand-700" />
            <h2 className="mt-3 font-bold text-slate-950">{title as string}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">{text as string}</p>
          </Link>
        ))}
      </section>
      </div>
    </>
  );
}
