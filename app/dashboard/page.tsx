import Link from "next/link";
import { Bell, Bookmark, Calculator, CreditCard, LogOut, Search } from "lucide-react";
import { signOutMemberAction } from "@/app/auth/actions";
import { formatDate } from "@/lib/format";
import { getPublishedProperties } from "@/lib/properties";
import { requireActiveMember } from "@/lib/user";

export default async function DashboardPage() {
  const member = await requireActiveMember();
  const properties = await getPublishedProperties({ maxPrice: 3000000 });
  const zeroYenCount = properties.filter((property) => property.price_yen === 0).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">会員ダッシュボード</p>
          <h1 className="text-2xl font-black text-slate-950">{member.email}</h1>
        </div>
        <form action={signOutMemberAction}>
          <button className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
            <LogOut className="h-4 w-4" />
            ログアウト
          </button>
        </form>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
          <p className="text-sm font-bold text-brand-700">契約状態</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{member.subscriptionStatus}</p>
          <p className="mt-2 text-sm text-slate-700">無料期間終了: {formatDate(member.trialEndsAt)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-500">公開物件</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{properties.length}件</p>
          <p className="mt-2 text-sm text-slate-700">0円物件: {zeroYenCount}件</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-500">月額プラン</p>
          <p className="mt-2 text-2xl font-black text-brand-700">2,980円</p>
          <p className="mt-2 text-sm text-slate-700">無料期間後は手動で有料登録</p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          [Search, "物件を探す", "0円から300万円以下の物件を検索します。", "/properties"],
          [Bookmark, "保存条件", "将来的にエリアや価格条件を保存して通知に使います。", "/properties"],
          [Bell, "新着確認", "新着、価格変更、成約済みの更新を確認します。", "/properties"],
          [Calculator, "見積もり相談", "名義変更、解体、残置物処分、リフォームを相談します。", "/estimate"],
          [CreditCard, "課金設定", "Stripe Checkout と契約状態を確認します。", "/billing"]
        ].map(([Icon, title, text, href]) => (
          <Link key={title as string} href={href as string} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm focus-ring">
            {/* TypeScript narrows tuple icons poorly in JSX without this local component shape. */}
            <Icon className="h-5 w-5 text-brand-700" />
            <h2 className="mt-3 font-bold text-slate-950">{title as string}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">{text as string}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
