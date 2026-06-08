import Link from "next/link";
import { importPastAwardCsvAction } from "@/app/admin/past-awards/actions";
import { AdminShell } from "@/components/AdminShell";
import { PREFECTURES, REGIONS, TENDER_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/admin";
import { getAdminPastAwardPage, PAST_AWARD_PER_PAGE_OPTIONS, summarizePastAwards } from "@/lib/past-awards";
import type { AdminPastAwardFilters } from "@/lib/past-awards";
import type { PastAwardResult } from "@/lib/types";

type SearchParams = {
  status?: string;
  page?: string;
  perPage?: string;
  keyword?: string;
  agencyName?: string;
  region?: string;
  prefecture?: string;
  businessType?: string;
  tenderType?: string;
  openedFrom?: string;
  openedTo?: string;
  publishedFrom?: string;
  publishedTo?: string;
  imported?: string;
  updated?: string;
  local?: string;
};

const TENDER_TYPE_OPTIONS = [
  ["goods", "物品"],
  ["service", "役務"],
  ["open_counter", "オープンカウンター"],
  ["unified_qualification", "全省庁統一資格必要案件"],
  ["construction", "工事"],
  ["other", "その他"]
];

export default async function AdminPastAwardsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const admin = await requireAdmin();
  const pageResult = await getAdminPastAwardPage(params);
  const { awards, filters, page, perPage, totalCount, totalPages, from, to, statusCounts } = pageResult;
  const pageStats = summarizePastAwards(awards);
  const content = (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">過去落札データ</h2>
          <p className="mt-1 text-sm text-slate-600">AI分析の学習元になる過去落札結果を管理します。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries({ all: "すべて", approved: "承認済み", pending: "確認待ち", rejected: "却下" }).map(([value, label]) => (
            <Link key={value} href={buildPastAwardsHref(filters, page, perPage, { status: value, page: "1" })} className={`rounded border px-3 py-2 text-sm font-bold focus-ring ${filters.status === value ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-700"}`}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {params.imported || params.updated ? (
        <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
          CSVインポート: 新規 {params.imported ?? 0}件、更新 {params.updated ?? 0}件{params.local ? "（ローカル保存）" : ""}
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <Metric label="総件数" value={formatNumber(statusCounts.all)} />
        <Metric label="表示対象" value={formatNumber(totalCount)} />
        <Metric label="approved 件数" value={formatNumber(statusCounts.approved)} />
        <Metric label="pending 件数" value={formatNumber(statusCounts.pending)} />
        <Metric label="rejected 件数" value={formatNumber(statusCounts.rejected)} />
        <Metric label="表示中平均落札額" value={formatYen(pageStats.averageAwardAmount)} />
        <Metric label="表示中最低落札額" value={formatYen(pageStats.minAwardAmount)} />
        <Metric label="表示中最高落札額" value={formatYen(pageStats.maxAwardAmount)} />
        <Metric label="表示中平均落札率" value={formatRate(pageStats.averageWinRate)} />
      </div>

      <FilterForm filters={filters} perPage={perPage} />

      <CsvImportForm />

      <PaginationBar filters={filters} page={page} perPage={perPage} totalCount={totalCount} totalPages={totalPages} from={from} to={to} />

      <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
              <tr>
                <th className="px-3 py-3">案件</th>
                <th className="px-3 py-3">発注機関</th>
                <th className="px-3 py-3">地域</th>
                <th className="px-3 py-3">業種</th>
                <th className="px-3 py-3">落札業者</th>
                <th className="px-3 py-3">落札額</th>
                <th className="px-3 py-3">予定価格</th>
                <th className="px-3 py-3">落札率</th>
                <th className="px-3 py-3">開札日</th>
                <th className="px-3 py-3">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {awards.map((award) => (
                <AwardRow key={award.id} award={award} />
              ))}
              {awards.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-slate-500">条件に一致する過去落札データはありません。</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <PaginationBar filters={filters} page={page} perPage={perPage} totalCount={totalCount} totalPages={totalPages} from={from} to={to} compact />
    </>
  );

  return <AdminShell email={admin.email}>{content}</AdminShell>;
}

function FilterForm({ filters, perPage }: { filters: AdminPastAwardFilters; perPage: number }) {
  return (
    <form action="/admin/past-awards" className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <input type="hidden" name="page" value="1" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          キーワード
          <input name="keyword" defaultValue={filters.keyword} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" placeholder="案件名・落札業者など" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          発注機関
          <input name="agencyName" defaultValue={filters.agencyName} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" placeholder="防衛省、国土交通省など" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          地域
          <select name="region" defaultValue={filters.region} className="rounded border border-slate-300 bg-white px-3 py-2 font-normal focus-ring">
            <option value="">すべて</option>
            {REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          都道府県
          <select name="prefecture" defaultValue={filters.prefecture} className="rounded border border-slate-300 bg-white px-3 py-2 font-normal focus-ring">
            <option value="">すべて</option>
            {PREFECTURES.map((prefecture) => <option key={prefecture} value={prefecture}>{prefecture}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          業種
          <input name="businessType" defaultValue={filters.businessType} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" placeholder="清掃、保守、物品など" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          案件種別
          <select name="tenderType" defaultValue={filters.tenderType} className="rounded border border-slate-300 bg-white px-3 py-2 font-normal focus-ring">
            <option value="">すべて</option>
            {TENDER_TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          review_status
          <select name="status" defaultValue={filters.status} className="rounded border border-slate-300 bg-white px-3 py-2 font-normal focus-ring">
            <option value="all">すべて</option>
            <option value="approved">承認済み</option>
            <option value="pending">確認待ち</option>
            <option value="rejected">却下</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          perPage
          <select name="perPage" defaultValue={String(perPage)} className="rounded border border-slate-300 bg-white px-3 py-2 font-normal focus-ring">
            {PAST_AWARD_PER_PAGE_OPTIONS.map((value) => <option key={value} value={value}>{value}件</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          開札日 from
          <input name="openedFrom" type="date" defaultValue={filters.openedFrom} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          開札日 to
          <input name="openedTo" type="date" defaultValue={filters.openedTo} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          公告日 from
          <input name="publishedFrom" type="date" defaultValue={filters.publishedFrom} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          公告日 to
          <input name="publishedTo" type="date" defaultValue={filters.publishedTo} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">検索する</button>
        <Link href="/admin/past-awards" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">リセット</Link>
      </div>
    </form>
  );
}

function CsvImportForm() {
  return (
    <form action={importPastAwardCsvAction} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-950">CSVインポート</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">ヘッダー例: 発注機関,案件名,地域,都道府県,業種,案件種別,落札業者,落札額,予定価格,落札率,公告日,開札日,URL</p>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          確認状態
          <select name="review_status" defaultValue="approved" className="rounded border border-slate-300 bg-white px-3 py-2 font-normal focus-ring">
            <option value="approved">承認済み</option>
            <option value="pending">確認待ち</option>
          </select>
        </label>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          CSVファイル
          <input name="csv_file" type="file" accept=".csv,text/csv" className="rounded border border-slate-300 bg-white px-3 py-2 font-normal focus-ring" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          CSV貼り付け
          <textarea name="csv_text" rows={5} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" placeholder="発注機関,案件名,地域,業種,落札業者,落札額,予定価格,落札率,公告日,開札日,URL" />
        </label>
      </div>
      <button className="mt-4 rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">インポートする</button>
    </form>
  );
}

function PaginationBar({ filters, page, perPage, totalCount, totalPages, from, to, compact = false }: { filters: AdminPastAwardFilters; page: number; perPage: number; totalCount: number; totalPages: number; from: number; to: number; compact?: boolean }) {
  const previousHref = buildPastAwardsHref(filters, page, perPage, { page: String(Math.max(1, page - 1)) });
  const nextHref = buildPastAwardsHref(filters, page, perPage, { page: String(Math.min(totalPages, page + 1)) });
  return (
    <div className={`${compact ? "mt-4" : "mt-5"} flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700`}>
      <span>総件数: {formatNumber(totalCount)}件 / 表示中: {from ? `${formatNumber(from)}〜${formatNumber(to)}件` : "0件"}</span>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={previousHref} className={`rounded border px-3 py-1.5 ${page <= 1 ? "pointer-events-none border-slate-200 text-slate-300" : "border-slate-300 bg-white text-slate-700"}`}>前へ</Link>
        <span className="px-2 py-1.5">{formatNumber(page)} / {formatNumber(totalPages)}</span>
        <Link href={nextHref} className={`rounded border px-3 py-1.5 ${page >= totalPages ? "pointer-events-none border-slate-200 text-slate-300" : "border-slate-300 bg-white text-slate-700"}`}>次へ</Link>
        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{perPage}件/ページ</span>
      </div>
    </div>
  );
}

function AwardRow({ award }: { award: PastAwardResult }) {
  return (
    <tr>
      <td className="px-3 py-3">
        <a href={award.source_url} target="_blank" rel="noreferrer" className="font-bold text-slate-950 hover:text-brand-700">{award.title}</a>
        <p className="mt-1 text-xs text-slate-500">{award.source_name ?? "取得元未設定"}</p>
      </td>
      <td className="px-3 py-3 text-slate-700">{award.agency_name}</td>
      <td className="px-3 py-3 text-slate-700">{award.region}{award.prefecture ? ` / ${award.prefecture}` : ""}</td>
      <td className="px-3 py-3 text-slate-700">{award.business_type ?? tenderTypeLabel(award.tender_type)}</td>
      <td className="px-3 py-3 text-slate-700">{award.winner_name ?? "-"}</td>
      <td className="px-3 py-3 font-semibold text-slate-900">{formatYen(award.award_amount_yen)}</td>
      <td className="px-3 py-3 text-slate-700">{formatYen(award.planned_price_yen)}</td>
      <td className="px-3 py-3 text-slate-700">{formatRate(award.win_rate)}</td>
      <td className="px-3 py-3 text-slate-700">{formatDate(award.opened_at)}</td>
      <td className="px-3 py-3 text-slate-700">{reviewStatusLabel(award.review_status)}</td>
    </tr>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function buildPastAwardsHref(filters: AdminPastAwardFilters, page: number, perPage: number, overrides: Record<string, string> = {}) {
  const params = new URLSearchParams();
  const values: Record<string, string> = {
    status: filters.status,
    page: String(page),
    perPage: String(perPage),
    keyword: filters.keyword,
    agencyName: filters.agencyName,
    region: filters.region,
    prefecture: filters.prefecture,
    businessType: filters.businessType,
    tenderType: filters.tenderType,
    openedFrom: filters.openedFrom,
    openedTo: filters.openedTo,
    publishedFrom: filters.publishedFrom,
    publishedTo: filters.publishedTo,
    ...overrides
  };

  for (const [key, value] of Object.entries(values)) {
    if (value && !(key === "status" && value === "all")) params.set(key, value);
  }

  const query = params.toString();
  return query ? `/admin/past-awards?${query}` : "/admin/past-awards";
}

function formatYen(value: number | null) {
  if (value === null) return "-";
  return `${formatNumber(value)}円`;
}

function formatRate(value: number | null) {
  if (value === null) return "-";
  return `${value.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}%`;
}

function formatNumber(value: number) {
  return value.toLocaleString("ja-JP");
}

function tenderTypeLabel(value: PastAwardResult["tender_type"]) {
  if (!value) return "-";
  if (value === "construction") return "工事";
  if (value === "other") return "その他";
  return TENDER_TYPE_LABELS[value];
}

function reviewStatusLabel(value: PastAwardResult["review_status"]) {
  if (value === "approved") return "承認済み";
  if (value === "pending") return "確認待ち";
  return "却下";
}
