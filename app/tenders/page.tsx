import Link from "next/link";
import type { Metadata } from "next";
import { TenderSearchFilters } from "@/components/tenders/TenderSearchFilters";
import { TenderTable } from "@/components/tenders/TenderTable";
import { requireUsableTenderMember, tenderAccessNotice } from "@/lib/tender-access";
import { tenderMetadata } from "@/lib/tender-metadata";
import { getPublishedTenders, parseTenderFilters } from "@/lib/tenders";

type SearchParams = {
  region?: string;
  prefecture?: string;
  tenderType?: string;
  qualification?: string;
  deadlineStatus?: string;
  keyword?: string;
  sort?: string;
  defenseOnly?: string;
  openCounterOnly?: string;
};

export const metadata: Metadata = tenderMetadata("官公庁案件サーチ｜株式会社エコループ");

export default async function TendersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const access = await requireUsableTenderMember();
  const tenders = await getPublishedTenders(parseTenderFilters(params));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-950">官公庁案件一覧</h1>
          <p className="mt-1 text-sm text-slate-600">物品・役務・オープンカウンター・全省庁統一資格対象案件を検索できます。</p>
        </div>
        <Link href="/qualification/how-to-apply" className="rounded border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700 focus-ring">
          資格ガイドを見る
        </Link>
      </div>
      <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold leading-6 text-emerald-900">
        {tenderAccessNotice(access)}
      </div>
      <TenderSearchFilters {...params} />
      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{tenders.length}件</p>
        <p className="text-xs text-slate-500">期限切れ・公式ページ掲載終了は通常非表示です。期限不明の案件は公式公告で必ず締切を確認してください。</p>
      </div>
      <p className="mt-2 text-xs text-slate-500">掲載情報は公式情報をもとにした案件候補です。参加前に必ず公式公告・仕様書・参加条件をご確認ください。</p>
      <div className="mt-4">
        <TenderTable tenders={tenders} restricted={false} />
      </div>
      {tenders.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          条件に一致する案件はありません。
        </div>
      ) : null}
    </div>
  );
}
