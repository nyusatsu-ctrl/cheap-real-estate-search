import Link from "next/link";
import { Bookmark, Search } from "lucide-react";
import { requireActiveMember } from "@/lib/user";

const statuses = [
  ["検討中", "気になる物件を比較する段階"],
  ["問い合わせ予定", "元サイトや自治体へ確認する段階"],
  ["現地確認予定", "内見、境界、接道、残置物を確認する段階"],
  ["見送り", "条件に合わなかった物件を記録する段階"]
];

export default async function FavoritesPage() {
  await requireActiveMember();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-950">お気に入り物件</h1>
          <p className="mt-1 text-sm text-slate-600">気になる格安不動産を保存し、検討状況を整理するための画面です。</p>
        </div>
        <Link href="/properties?priceRange=under300" className="inline-flex items-center gap-2 rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
          <Search className="h-4 w-4" />
          物件を探す
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {statuses.map(([title, description]) => (
          <div key={title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <Bookmark className="h-5 w-5 text-brand-700" />
            <h2 className="mt-3 font-bold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
        保存機能は本番運用時にユーザーごとの検討リストとして接続します。
      </div>
    </div>
  );
}
