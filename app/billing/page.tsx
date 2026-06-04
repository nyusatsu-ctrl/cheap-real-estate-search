import Link from "next/link";
import { CreditCard, ShieldCheck } from "lucide-react";
import { startCheckoutAction } from "@/app/billing/actions";
import { hasStripeEnv, MONTHLY_PRICE_YEN, TRIAL_DAYS } from "@/lib/billing/stripe";
import { requireMember } from "@/lib/user";

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ demo?: string; checkout?: string; error?: string }> }) {
  const params = await searchParams;
  const member = await requireMember();
  const stripeReady = hasStripeEnv();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/dashboard" className="mb-4 inline-block text-sm font-bold text-brand-700">
        ダッシュボードへ戻る
      </Link>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="inline-flex items-center gap-2 rounded bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
          <CreditCard className="h-4 w-4" />
          課金設定
        </p>
        <h1 className="mt-4 text-2xl font-black text-slate-950">14日間無料、その後月額{MONTHLY_PRICE_YEN.toLocaleString("ja-JP")}円</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          会員: {member.email} / 状態: {member.subscriptionStatus}
        </p>

        {!stripeReady || params.demo ? (
          <div className="mt-5 rounded border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            Stripe 環境変数が未設定です。本番では `STRIPE_SECRET_KEY`、`STRIPE_PRICE_ID`、`STRIPE_WEBHOOK_SECRET`、`NEXT_PUBLIC_APP_URL` を設定します。
          </div>
        ) : null}
        {params.checkout === "cancelled" ? (
          <div className="mt-5 rounded border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">決済登録をキャンセルしました。</div>
        ) : null}
        {params.error ? (
          <div className="mt-5 rounded border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">決済セッションを作成できませんでした。</div>
        ) : null}

        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded border border-slate-200 p-3">
            <dt className="text-xs font-bold text-slate-500">無料期間</dt>
            <dd className="mt-1 text-2xl font-black text-slate-950">{TRIAL_DAYS}日</dd>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <dt className="text-xs font-bold text-slate-500">月額</dt>
            <dd className="mt-1 text-2xl font-black text-brand-700">{MONTHLY_PRICE_YEN.toLocaleString("ja-JP")}円</dd>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <dt className="text-xs font-bold text-slate-500">プラン</dt>
            <dd className="mt-1 text-2xl font-black text-slate-950">1種類</dd>
          </div>
        </dl>

        <form action={startCheckoutAction} className="mt-6">
          <button className="w-full rounded bg-brand-700 px-5 py-3 font-bold text-white focus-ring">
            Stripeで無料トライアルを開始
          </button>
        </form>

        <div className="mt-5 rounded border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          <ShieldCheck className="mr-1 inline h-4 w-4 text-brand-700" />
          課金開始日、解約方法、返金条件は登録前に明記します。課金開始前の通知導線も本番実装で追加します。
        </div>
      </div>
    </div>
  );
}
