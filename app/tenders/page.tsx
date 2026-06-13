import Link from "next/link";
import { TenderSearchFilters } from "@/components/tenders/TenderSearchFilters";
import { TenderTable } from "@/components/tenders/TenderTable";
import { canUseMemberFeatures, getPublishedTenders, parseTenderFilters } from "@/lib/tenders";
import { getCurrentMember } from "@/lib/user";

type SearchParams = {
  region?: string;
  prefecture?: string;
  tenderType?: string;
  qualification?: string;
  keyword?: string;
  sort?: string;
  defenseOnly?: string;
  openCounterOnly?: string;
};

export default async function TendersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const [member, tenders] = await Promise.all([getCurrentMember(), getPublishedTenders(parseTenderFilters(params))]);
  const restricted = Boolean(member && !canUseMemberFeatures(member));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-950">格安不動産物件一覧</h1>
          <p className="mt-1 text-sm text-slate-600">物品・役務・0円物件・エリア検索必要物件を検索できます。</p>
        </div>
        <Link href="/qualification/how-to-apply" className="rounded border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700 focus-ring">
          エリア検索の取得方法
        </Link>
      </div>
      {restricted ? (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
          無料トライアル終了後は、詳細閲覧・お気に入り・通知機能が制限されます。継続する場合は有料プランに申し込んでください。
        </div>
      ) : null}
      <TenderSearchFilters {...params} />
      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{tenders.length}件</p>
        <p className="text-xs text-slate-500">掲載情報は公式情報をもとにしたメタ情報です。参加前に必ず公式ページ・仕様書・公告文を確認してください。</p>
      </div>
      <div className="mt-4">
        <TenderTable tenders={tenders} restricted={restricted} />
      </div>
      {tenders.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          条件に一致する物件はありません。
        </div>
      ) : null}
    </div>
  );
}
