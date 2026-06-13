import Link from "next/link";
import { Bell, CreditCard, FileSearch, LogOut, MapPinned, Star } from "lucide-react";
import { signOutMemberAction } from "@/app/auth/actions";
import { formatDate } from "@/lib/format";
import { getPublishedProperties } from "@/lib/properties";
import { requireActiveMember } from "@/lib/user";

export default async function DashboardPage() {
  const member = await requireActiveMember();
  const properties = await getPublishedProperties({ maxPrice: 3000000 });
  const zeroYenCount = properties.filter((property) => property.price_yen === 0).length;
  const prefectureCount = new Set(properties.map((property) => property.prefecture).filter(Boolean)).size;

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
          <p className="mt-2 text-sm text-slate-700">対象エリア: {prefectureCount}都道府県</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-bold text-slate-500">0円物件</p>
          <p className="mt-2 text-2xl font-black text-brand-700">{zeroYenCount}件</p>
          <p className="mt-2 text-sm text-slate-700">掘り出し物件を優先確認</p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          [FileSearch, "物件検索", "0円物件、300万円以下、地域、物件種別で検索します。", "/properties?maxPrice=3000000"],
          [Star, "お気に入り物件", "気になる物件を保存し、検討ステータスとメモを管理します。", "/favorites"],
          [Bell, "通知設定", "新着物件や条件に合う物件の通知条件を登録します。", "/notifications"],
          [MapPinned, "エリア検索", "都道府県、市区町村、空き家・古家・土地・山林の条件で探します。", "/properties?maxPrice=3000000"],
          [CreditCard, "課金管理", "Stripe Checkout と契約状態を確認します。", "/billing"]
        ].map(([Icon, title, text, href]) => (
          <Link key={title as string} href={href as string} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm focus-ring">
            <Icon className="h-5 w-5 text-brand-700" />
            <h2 className="mt-3 font-bold text-slate-950">{title as string}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">{text as string}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
