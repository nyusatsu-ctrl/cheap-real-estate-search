import Link from "next/link";
import { Bell, Check, FileSearch, ShieldCheck, Star } from "lucide-react";
import { MONTHLY_PRICE_YEN, TRIAL_DAYS } from "@/lib/billing/stripe";

const features = [
  "全国の格安不動産一覧の閲覧",
  "0円物件・300万円以下物件の絞り込み",
  "空き家・古家付き土地・山林・土地の絞り込み",
  "地域・都道府県・市区町村フィルター",
  "キーワード検索",
  "物件詳細と元サイトURLの確認",
  "お気に入り保存と検討ステータス管理",
  "新着物件の通知設定"
];

export default function PlansPage() {
  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
              <ShieldCheck className="h-4 w-4" />
              {TRIAL_DAYS}日間無料、その後は必要な方だけ継続
            </p>
            <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-slate-950 md:text-5xl">
              全国の格安不動産を、月額{MONTHLY_PRICE_YEN.toLocaleString("ja-JP")}円で。
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
              全国の0円物件・空き家・古家付き土地・山林・300万円以下の格安不動産をまとめて探せるサービスです。無料トライアル中は全機能を利用できます。
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex items-center justify-center rounded bg-brand-700 px-5 py-3 font-bold text-white focus-ring">14日間無料で始める</Link>
              <Link href="/billing" className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 focus-ring">課金設定を見る</Link>
            </div>
          </div>

          <div className="rounded-lg border border-brand-200 bg-white p-5 shadow-sm">
            <p className="inline-block rounded bg-brand-700 px-2 py-1 text-xs font-bold text-white">単一プラン</p>
            <h2 className="mt-4 text-xl font-black text-slate-950">全機能プラン</h2>
            <div className="mt-4 flex items-end gap-2">
              <p className="text-4xl font-black text-brand-700">月額{MONTHLY_PRICE_YEN.toLocaleString("ja-JP")}円</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              登録から{TRIAL_DAYS}日間は0円。無料登録だけでは自動課金されず、継続利用する場合だけ有料プランへ申し込みます。
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">料金設計</h2>
            <dl className="mt-5 grid gap-4">
              <div className="rounded border border-slate-200 p-4">
                <dt className="text-sm font-bold text-slate-500">無料期間</dt>
                <dd className="mt-1 text-2xl font-black text-slate-950">{TRIAL_DAYS}日間</dd>
              </div>
              <div className="rounded border border-slate-200 p-4">
                <dt className="text-sm font-bold text-slate-500">無料期間終了後</dt>
                <dd className="mt-1 text-2xl font-black text-brand-700">月額{MONTHLY_PRICE_YEN.toLocaleString("ja-JP")}円</dd>
              </div>
              <div className="rounded border border-slate-200 p-4">
                <dt className="text-sm font-bold text-slate-500">プラン数</dt>
                <dd className="mt-1 text-2xl font-black text-slate-950">1種類</dd>
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
            [FileSearch, "物件を見つける", "0円物件、空き家、土地、山林をまとめて確認します。"],
            [Star, "検討を管理する", "お気に入りと検討ステータスで気になる物件を整理します。"],
            [Bell, "見逃しを減らす", "新着物件や条件に合う物件の確認漏れを減らします。"]
          ].map(([Icon, title, text]) => (
            <div key={title as string} className="rounded-lg border border-slate-200 p-4">
              <Icon className="h-5 w-5 text-brand-700" />
              <h3 className="mt-3 font-bold text-slate-950">{title as string}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{text as string}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
