import Link from "next/link";
import { FAVORITE_TENDER_STATUS_LABELS, TENDER_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { canUseMemberFeatures, getFavoriteTenders } from "@/lib/tenders";
import { requireMember } from "@/lib/user";

export default async function FavoritesPage() {
  const member = await requireMember();
  if (!canUseMemberFeatures(member)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h1 className="text-xl font-black text-amber-950">お気に入り機能は制限されています</h1>
          <p className="mt-2 text-sm leading-6 text-amber-900">無料トライアル終了後は、有料プランへの申し込みが必要です。</p>
          <Link href="/billing?trial=expired" className="mt-5 inline-block rounded bg-brand-700 px-4 py-2 font-bold text-white focus-ring">課金管理へ</Link>
        </div>
      </div>
    );
  }

  const favorites = await getFavoriteTenders(member.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-950">お気に入り案件</h1>
          <p className="mt-1 text-sm text-slate-600">保存した案件の対応ステータスとメモを確認できます。</p>
        </div>
        <Link href="/tenders" className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">案件を探す</Link>
      </div>
      <div className="grid gap-3">
        {favorites.map((favorite) => (
          <div key={favorite.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700">{FAVORITE_TENDER_STATUS_LABELS[favorite.status]}</span>
              {favorite.tenders ? <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{TENDER_TYPE_LABELS[favorite.tenders.tender_type]}</span> : null}
            </div>
            <h2 className="mt-2 text-lg font-black text-slate-950">
              {favorite.tenders ? <Link href={`/tenders/${favorite.tenders.id}`} className="hover:text-brand-700">{favorite.tenders.title}</Link> : "削除済み案件"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{favorite.tenders?.agency_name} / 保存日 {formatDate(favorite.created_at)}</p>
            {favorite.memo ? <p className="mt-3 rounded bg-slate-50 p-3 text-sm leading-6 text-slate-700">{favorite.memo}</p> : null}
          </div>
        ))}
      </div>
      {favorites.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">保存した案件はまだありません。</div>
      ) : null}
    </div>
  );
}
