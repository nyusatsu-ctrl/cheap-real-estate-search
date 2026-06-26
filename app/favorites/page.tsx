import Link from "next/link";
import type { Metadata } from "next";
import { Bookmark, Search } from "lucide-react";
import { saveFavoriteTenderAction } from "@/app/tenders/actions";
import { FAVORITE_TENDER_STATUS_LABELS, TENDER_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { assessTenderDeadline, assessTenderSourceAvailability, sourceAvailabilityLabel } from "@/lib/tender-deadlines";
import { requireUsableTenderMember } from "@/lib/tender-access";
import { tenderMetadata } from "@/lib/tender-metadata";
import { getFavoriteTenders } from "@/lib/tenders";

export const metadata: Metadata = tenderMetadata(
  "お気に入り案件｜官公庁案件サーチ",
  "官公庁案件サーチで保存した案件を確認し、対応状況を管理します。"
);

export default async function FavoritesPage() {
  const access = await requireUsableTenderMember();
  const favorites = await getFavoriteTenders(access.userId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-950">お気に入り案件</h1>
          <p className="mt-1 text-sm text-slate-600">気になる官公庁案件を保存し、対応状況とメモを整理します。</p>
        </div>
        <Link href="/tenders" className="inline-flex items-center gap-2 rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
          <Search className="h-4 w-4" />
          案件を探す
        </Link>
      </div>

      {favorites.length ? (
        <div className="grid gap-4">
          {favorites.map((favorite) => {
            const tender = favorite.tenders;
            const deadline = tender ? assessTenderDeadline(tender) : null;
            const availability = tender ? assessTenderSourceAvailability(tender) : null;
            return (
              <article key={favorite.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Bookmark className="h-4 w-4 text-brand-700" />
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                        {FAVORITE_TENDER_STATUS_LABELS[favorite.status]}
                      </span>
                      {tender ? <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">{TENDER_TYPE_LABELS[tender.tender_type]}</span> : null}
                    </div>
                    <h2 className="mt-2 text-lg font-black leading-7 text-slate-950">
                      {tender ? <Link href={`/tenders/${tender.id}`} className="hover:text-brand-700">{tender.title}</Link> : "案件情報を取得できません"}
                    </h2>
                    {tender ? (
                      <p className="mt-1 text-sm leading-6 text-slate-700">
                        {tender.agency_name} / {tender.region} / {tender.prefecture} / {deadline?.deadlineAt ? formatDate(deadline.deadlineAt) : "期限不明"} / {availability ? sourceAvailabilityLabel(availability, deadline?.status ?? "unknown") : "-"}
                      </p>
                    ) : null}
                    {favorite.memo ? <p className="mt-2 rounded bg-slate-50 p-3 text-sm leading-6 text-slate-700">{favorite.memo}</p> : null}
                  </div>
                  {tender ? (
                    <form action={saveFavoriteTenderAction} className="grid min-w-72 gap-2">
                      <input type="hidden" name="tender_id" value={tender.id} />
                      <label className="grid gap-1 text-xs font-bold text-slate-600">
                        対応ステータス
                        <select name="status" defaultValue={favorite.status} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-normal focus-ring">
                          {Object.entries(FAVORITE_TENDER_STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs font-bold text-slate-600">
                        メモ
                        <textarea name="memo" rows={3} defaultValue={favorite.memo ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm font-normal focus-ring" />
                      </label>
                      <button className="rounded bg-brand-700 px-3 py-2 text-sm font-bold text-white focus-ring">更新</button>
                    </form>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          保存済みの案件はありません。
        </div>
      )}
    </div>
  );
}
