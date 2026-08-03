import Link from "next/link";
import type { Metadata } from "next";
import { CreditCard, ShieldCheck } from "lucide-react";
import { openCustomerPortalAction, startCheckoutAction } from "@/app/billing/actions";
import { PropertyMemberStateBridge } from "@/components/PropertyMemberStateBridge";
import { hasStripeEnv, MONTHLY_PRICE_YEN, TRIAL_DAYS } from "@/lib/billing/stripe";
import { formatPropertyDateJst, getPropertyAccessPageState } from "@/lib/property-access";
import { propertyMetadata } from "@/lib/property-metadata";
import { requireMember } from "@/lib/user";

export const metadata: Metadata = propertyMetadata(
  "契約管理・料金｜格安不動産サーチ",
  "格安不動産サーチの月額4,980円プランへの申込み、カード変更、解約を管理します。"
);

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ demo?: string; checkout?: string; error?: string; access?: string }> }) {
  const params = await searchParams;
  const member = await requireMember();
  const stripeReady = hasStripeEnv();
  const canManageSubscription = Boolean(member.stripeCustomerId);
  const requiresPaymentAttention = ["past_due", "unpaid", "incomplete"].includes(member.subscriptionStatus);
  const hasCurrentSubscription = ["active", "past_due", "unpaid", "incomplete", "paused"].includes(member.subscriptionStatus);
  const accessEnded = ["trial_expired", "period_ended", "inactive"].includes(params.access ?? "");

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
      <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/dashboard" className="mb-4 inline-block text-sm font-bold text-brand-700">
        ダッシュボードへ戻る
      </Link>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="inline-flex items-center gap-2 rounded bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
          <CreditCard className="h-4 w-4" />
          課金設定
        </p>
        <h1 className="mt-4 text-2xl font-black text-slate-950">月額{MONTHLY_PRICE_YEN.toLocaleString("ja-JP")}円の有料プランに申し込む</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          会員: {member.email} / 契約状態: {subscriptionStatusLabel(member.subscriptionStatus, member.access.reason)}
        </p>

        {!stripeReady || params.demo ? (
          <div className="mt-5 rounded border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            Stripe環境が未設定です。決済機能は現在利用できません。
          </div>
        ) : null}
        {params.checkout === "cancelled" ? (
          <div className="mt-5 rounded border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">決済登録をキャンセルしました。</div>
        ) : null}
        {params.checkout === "success" ? (
          <div className="mt-5 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold leading-6 text-emerald-900">
            有料プランへのお申し込みを受け付けました。Stripeからの決済確認後、契約状態が反映されます。
          </div>
        ) : null}
        {params.error ? (
          <div className="mt-5 rounded border border-rose-200 bg-rose-50 p-3 text-sm font-semibold leading-6 text-rose-700">
            {billingErrorMessage(params.error)}
          </div>
        ) : null}
        {accessEnded ? (
          <div className="mt-5 rounded border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
            14日間の無料期間が終了しました。引き続き格安不動産サーチを利用する場合は、月額4,980円（税込）の有料プランへお申し込みください。
          </div>
        ) : null}
        {requiresPaymentAttention ? (
          <div className="mt-5 rounded border border-rose-200 bg-rose-50 p-3 text-sm font-semibold leading-6 text-rose-800">
            お支払いを確認できないため、物件情報の閲覧を停止しています。契約・支払い管理からカード情報と請求状況をご確認ください。
          </div>
        ) : null}

        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded border border-slate-200 p-3">
            <dt className="text-xs font-bold text-slate-500">無料登録</dt>
            <dd className="mt-1 text-2xl font-black text-slate-950">{TRIAL_DAYS}日</dd>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <dt className="text-xs font-bold text-slate-500">月額</dt>
            <dd className="mt-1 text-2xl font-black text-brand-700">{MONTHLY_PRICE_YEN.toLocaleString("ja-JP")}円<span className="ml-1 text-xs">税込</span></dd>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <dt className="text-xs font-bold text-slate-500">プラン</dt>
            <dd className="mt-1 text-2xl font-black text-slate-950">1種類</dd>
          </div>
        </dl>

        {member.subscriptionStatus === "trialing" ? (
          <div className="mt-5 rounded border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-950">
            無料期間: {formatPropertyDateJst(member.trialStartedAt)}から{formatPropertyDateJst(member.trialEndsAt)}まで。無料期間中に有料申込みを行う場合も、申込み時に4,980円が即時決済されます。
          </div>
        ) : null}
        {member.subscriptionStatus === "active" ? (
          <div className="mt-5 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
            {member.cancelAtPeriodEnd ? "利用期限" : "次回更新日"}: {formatPropertyDateJst(member.currentPeriodEnd)}
            {member.cancelAtPeriodEnd ? "。解約後もこの日まで利用できます。" : null}
          </div>
        ) : null}

        {!hasCurrentSubscription ? (
          <form action={startCheckoutAction} className="mt-6">
            <button disabled={!stripeReady} className="w-full rounded bg-brand-700 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-400 focus-ring">
              月額4,980円で利用を開始する
            </button>
          </form>
        ) : null}
        {canManageSubscription ? (
          <form action={openCustomerPortalAction} className="mt-3">
            <button disabled={!stripeReady} className="w-full rounded border border-brand-300 bg-white px-5 py-3 font-bold text-brand-800 disabled:cursor-not-allowed disabled:text-slate-400 focus-ring">
              契約・支払いを管理する
            </button>
          </form>
        ) : null}

        <div className="mt-5 rounded border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          <ShieldCheck className="mr-1 inline h-4 w-4 text-brand-700" />
          無料登録だけでは自動課金されません。有料申込み時に4,980円（税込）が即時決済され、以後毎月4,980円で自動更新されます。解約はStripeの契約管理画面から行え、支払済み期間の終了日まで利用できます。
        </div>
      </div>
      </div>
    </>
  );
}

function subscriptionStatusLabel(status: string, accessReason: string) {
  if (accessReason === "trial_expired" || accessReason === "invalid_trial_period") {
    return "無料期間終了";
  }
  if (accessReason === "paid_period_ended") {
    return "支払済み期間終了";
  }
  const labels: Record<string, string> = {
    trialing: "無料利用中",
    active: "有料会員",
    past_due: "支払確認待ち",
    unpaid: "未払い",
    canceled: "契約終了",
    incomplete: "決済未完了",
    incomplete_expired: "決済期限切れ",
    paused: "停止中"
  };
  return labels[status] ?? "状態不明";
}

function billingErrorMessage(error: string) {
  if (error === "price_mismatch") return "料金設定を確認できないため、申込みを停止しました。運営者へお問い合わせください。";
  if (error === "manage_existing") return "既存の契約があります。「契約・支払いを管理する」から請求状況をご確認ください。";
  if (error === "portal" || error === "portal_unavailable") return "契約管理画面を開けませんでした。時間をおいて再度お試しください。";
  return "決済画面を作成できませんでした。時間をおいて再度お試しください。";
}
