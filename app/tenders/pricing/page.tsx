import Link from "next/link";
import type { Metadata } from "next";
import { Bell, Check, CreditCard, FileSearch, ShieldCheck, Star } from "lucide-react";
import { startTenderCheckoutAction } from "@/app/tenders/billing/actions";
import { getCurrentTenderAccess } from "@/lib/tender-access";
import { TENDER_MONTHLY_PRICE_TEXT, TENDER_SERVICE_NAME, TENDER_TRIAL_DAYS } from "@/lib/tender-billing";
import { tenderMetadata } from "@/lib/tender-metadata";

export const metadata: Metadata = tenderMetadata(
  "料金｜官公庁案件サーチ",
  "官公庁案件サーチは14日間無料、無料期間中カード登録不要。継続利用は月額9,800円（税込）です。"
);

export const dynamic = "force-dynamic";

const features = [
  "物品・役務・オープンカウンター案件の検索",
  "防衛省・自衛隊、各省庁、調達ポータル案件の確認",
  "入札期限・掲載状態による絞り込み",
  "案件詳細と公式URLの確認",
  "お気に入り保存と対応ステータス管理",
  "希望条件に合う新着案件のアプリ内通知",
  "期限不明・掲載終了案件の判別",
  "CSVや管理画面での運用状況確認"
];

export default async function TenderPricingPage() {
  const access = await getCurrentTenderAccess();
  const canStartCheckout = Boolean(access && access.subscriptionStatus !== "admin");

  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
              <ShieldCheck className="h-4 w-4" />
              {TENDER_TRIAL_DAYS}日間無料・カード登録不要
            </p>
            <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-slate-950 md:text-5xl">
              官公庁案件を毎日確認し、参加できる案件を見逃しにくくする。
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
              {TENDER_SERVICE_NAME}は、物品・役務・オープンカウンター・全省庁統一資格対象案件を検索し、通知条件に合う新着案件をアプリ内で確認できる会員制サービスです。
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/tenders/signup" className="inline-flex items-center justify-center rounded bg-brand-700 px-5 py-3 font-bold text-white focus-ring">
                14日間無料で始める
              </Link>
              <Link href="/tenders/login" className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 focus-ring">
                ログイン
              </Link>
              {canStartCheckout ? (
                <form action={startTenderCheckoutAction}>
                  <button className="inline-flex w-full items-center justify-center rounded border border-brand-700 bg-white px-5 py-3 font-bold text-brand-700 focus-ring sm:w-auto">
                    有料プランに申し込む
                  </button>
                </form>
              ) : (
                <Link href="/tenders/login?next=/tenders/billing" className="inline-flex items-center justify-center rounded border border-brand-700 bg-white px-5 py-3 font-bold text-brand-700 focus-ring">
                  有料プランに申し込む
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-brand-200 bg-white p-5 shadow-sm">
            <p className="inline-block rounded bg-brand-700 px-2 py-1 text-xs font-bold text-white">単一プラン</p>
            <h2 className="mt-4 text-xl font-black text-slate-950">{TENDER_SERVICE_NAME}</h2>
            <p className="mt-4 text-4xl font-black text-brand-700">{TENDER_MONTHLY_PRICE_TEXT}</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              登録から{TENDER_TRIAL_DAYS}日間は無料です。無料期間終了後に自動課金されることはありません。有料プランへ申し込んだ時点から月額課金が始まり、解約するまで毎月自動更新されます。
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">料金</h2>
            <dl className="mt-5 grid gap-4">
              <div className="rounded border border-slate-200 p-4">
                <dt className="text-sm font-bold text-slate-500">無料期間</dt>
                <dd className="mt-1 text-2xl font-black text-slate-950">{TENDER_TRIAL_DAYS}日間</dd>
                <p className="mt-1 text-sm text-slate-600">無料期間中はカード登録不要です。</p>
              </div>
              <div className="rounded border border-slate-200 p-4">
                <dt className="text-sm font-bold text-slate-500">有料プラン</dt>
                <dd className="mt-1 text-2xl font-black text-brand-700">{TENDER_MONTHLY_PRICE_TEXT}</dd>
                <p className="mt-1 text-sm text-slate-600">有料申込み後から毎月自動更新です。</p>
              </div>
              <div className="rounded border border-slate-200 p-4">
                <dt className="text-sm font-bold text-slate-500">銀行振込</dt>
                <dd className="mt-1 text-lg font-black text-slate-950">手動対応</dd>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  クレジットカードをお持ちでない方、または法人名義での銀行振込をご希望の方は、銀行振込でのお申し込みも可能です。入金確認後、利用権限を付与いたします。
                </p>
              </div>
              <div className="rounded border border-slate-200 p-4">
                <dt className="text-sm font-bold text-slate-500">年額プラン</dt>
                <dd className="mt-1 text-2xl font-black text-slate-950">なし</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">使える機能</h2>
            <ul className="mt-5 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
              {features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 md:grid-cols-3">
          {[
            [FileSearch, "案件を探す", "物品・役務・オープンカウンター案件を条件で絞り込みます。"],
            [Star, "検討を管理する", "お気に入りと対応ステータスで参加候補を整理します。"],
            [Bell, "通知で確認する", "希望条件に合う新着案件をアプリ内通知で確認します。"],
            [CreditCard, "必要な時だけ有料申込み", "無料期間終了後も自動課金されません。"]
          ].map(([Icon, title, text]) => (
            <div key={title as string} className="rounded-lg border border-slate-200 p-4">
              <Icon className="h-5 w-5 text-brand-700" />
              <h3 className="mt-3 font-bold text-slate-950">{title as string}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{text as string}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8">
        <article className="rounded-lg border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-700 shadow-sm">
          <h2 className="font-black text-slate-950">課金・法的表示</h2>
          <p className="mt-2">
            無料体験終了後に自動課金されることはありません。有料申込み後は解約するまで毎月自動更新されます。
          </p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 font-bold text-brand-700">
            <Link href="/tenders/terms">利用規約</Link>
            <Link href="/tenders/privacy">プライバシーポリシー</Link>
            <Link href="/tenders/legal">特定商取引法に基づく表記</Link>
          </div>
        </article>
      </section>
    </div>
  );
}
