import Link from "next/link";
import type { Metadata } from "next";
import { CreditCard, ExternalLink, ShieldCheck } from "lucide-react";
import { openTenderCustomerPortalAction, startTenderCheckoutAction } from "@/app/tenders/billing/actions";
import { formatDate } from "@/lib/format";
import { getCurrentTenderAccess, tenderAccessNotice, tenderAccessStatusLabel } from "@/lib/tender-access";
import { getTenderStripeSetupStatus, hasTenderStripeEnv, TENDER_MONTHLY_PRICE_TEXT, TENDER_TRIAL_DAYS } from "@/lib/tender-billing";
import { tenderMetadata } from "@/lib/tender-metadata";

export const metadata: Metadata = tenderMetadata(
  "契約状況｜官公庁案件サーチ",
  "官公庁案件サーチの無料体験、契約状況、有料申込みを確認します。"
);

export default async function TenderBillingPage({
  searchParams
}: {
  searchParams: Promise<{ checkout?: string; error?: string; setup?: string; trial?: string }>;
}) {
  const params = await searchParams;
  const access = await getCurrentTenderAccess();
  const stripeReady = hasTenderStripeEnv();
  const stripeStatus = getTenderStripeSetupStatus();

  if (!access) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">契約状況を確認するにはログインが必要です</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">14日間無料で開始できます。無料期間中はカード登録不要です。</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/tenders/signup?next=/tenders/billing" className="rounded bg-brand-700 px-4 py-2 font-bold text-white focus-ring">無料体験を開始</Link>
            <Link href="/tenders/login?next=/tenders/billing" className="rounded border border-slate-300 bg-white px-4 py-2 font-bold text-slate-800 focus-ring">ログイン</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/tenders" className="mb-4 inline-block text-sm font-bold text-brand-700">
        案件一覧へ戻る
      </Link>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="inline-flex items-center gap-2 rounded bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
          <CreditCard className="h-4 w-4" />
          官公庁案件サーチ 契約状況
        </p>
        <h1 className="mt-4 text-2xl font-black text-slate-950">{TENDER_MONTHLY_PRICE_TEXT}の有料プラン</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          会員: {access.email} / 状態: {tenderAccessStatusLabel(access.subscriptionStatus)}
        </p>

        <div className={`mt-5 rounded border p-3 text-sm font-semibold leading-6 ${access.canUse ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          {tenderAccessNotice(access)}
          {access.setupError ? <p className="mt-2 text-rose-700">設定確認: {access.setupError}</p> : null}
        </div>

        {params.checkout === "success" ? (
          <div className="mt-5 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">有料プランの申込みを受け付けました。反映まで少し時間がかかる場合があります。</div>
        ) : null}
        {params.checkout === "cancelled" ? (
          <div className="mt-5 rounded border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">有料プラン申込みをキャンセルしました。</div>
        ) : null}
        {params.trial === "expired" ? (
          <div className="mt-5 rounded border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
            14日間の無料期間が終了しました。継続して使う場合だけ、有料プランに申し込んでください。
          </div>
        ) : null}
        {params.setup === "stripe" || !stripeReady ? (
          <div className="mt-5 rounded border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            Stripe設定が未完了です。本番では `STRIPE_SECRET_KEY`、`STRIPE_TENDER_PRICE_ID`、`STRIPE_WEBHOOK_SECRET`、`NEXT_PUBLIC_APP_URL` を設定してください。
          </div>
        ) : null}
        {params.error ? (
          <div className="mt-5 rounded border border-rose-200 bg-rose-50 p-3 text-sm font-semibold leading-6 text-rose-700">
            {tenderBillingErrorMessage(params.error)}
          </div>
        ) : null}

        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatusCard label="無料期間" value={`${TENDER_TRIAL_DAYS}日間`} detail="カード登録不要" />
          <StatusCard label="月額" value={TENDER_MONTHLY_PRICE_TEXT} detail="税込・毎月自動更新" />
          <StatusCard label="無料終了日" value={formatDate(access.trialEndsAt)} detail={access.daysRemaining === null ? "-" : `残り${access.daysRemaining}日`} />
          <StatusCard label="契約期間終了" value={formatDate(access.currentPeriodEnd)} detail={access.cancelAtPeriodEnd ? "期間終了で解約予定" : "-"} />
          <StatusCard label="Stripe設定" value={stripeReady ? "設定済み" : "未設定"} detail={formatStripeStatus(stripeStatus)} />
          <StatusCard label="年額プラン" value="なし" detail="今回は未実装" />
        </dl>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <form action={startTenderCheckoutAction}>
            <button className="w-full rounded bg-brand-700 px-5 py-3 font-bold text-white focus-ring">
              有料プランに申し込む
            </button>
          </form>
          <form action={openTenderCustomerPortalAction}>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 focus-ring">
              <ExternalLink className="h-4 w-4" />
              支払方法・解約を管理
            </button>
          </form>
        </div>

        <div className="mt-5 rounded border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          <ShieldCheck className="mr-1 inline h-4 w-4 text-brand-700" />
          無料体験だけでは自動課金されません。有料プランへ申し込んだ時点から月額課金が始まり、解約するまで毎月自動更新されます。
        </div>
      </div>
    </div>
  );
}

function StatusCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded border border-slate-200 p-3">
      <dt className="text-xs font-bold text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-black text-slate-950">{value}</dd>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function formatStripeStatus(status: ReturnType<typeof getTenderStripeSetupStatus>) {
  const missing = [
    status.hasSecretKey ? null : "secret",
    status.hasTenderPriceId ? null : "price",
    status.hasWebhookSecret ? null : "webhook",
    status.hasAppUrl ? null : "app_url"
  ].filter(Boolean);
  return missing.length ? `不足: ${missing.join(", ")}` : "Checkout/Portal/Webhook準備OK";
}

function tenderBillingErrorMessage(error: string) {
  const messages: Record<string, string> = {
    stripe_price: "Stripeの価格設定を確認できませんでした。Price IDの誤り、またはSecret KeyとPrice IDのlive/testモード不一致が考えられます。管理者へお問い合わせください。",
    stripe_auth: "StripeのSecret Keyを確認できませんでした。決済設定を確認してください。",
    stripe_url: "Stripe Checkoutの戻り先URL設定に問題があります。NEXT_PUBLIC_APP_URLを確認してください。",
    stripe_customer: "Stripeの顧客情報を確認できませんでした。管理者へお問い合わせください。",
    stripe_resource: "Stripeの決済リソースを確認できませんでした。価格IDや顧客IDの設定を確認してください。",
    no_customer: "支払方法・解約管理を開くには、有料申込み完了後の顧客情報が必要です。",
    portal: "Stripeの契約管理画面を開始できませんでした。時間をおいて再度お試しください。",
    checkout: "Stripe Checkoutを開始できませんでした。時間をおいて再度お試しください。"
  };
  return messages[error] ?? "決済処理を開始できませんでした。時間をおいて再度お試しください。";
}
