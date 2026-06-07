import Link from "next/link";
import { importPastAwardCsvAction } from "@/app/admin/past-awards/actions";
import { AdminShell } from "@/components/AdminShell";
import { TENDER_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { getCurrentAdmin } from "@/lib/admin";
import { getAdminPastAwardResults, summarizePastAwards } from "@/lib/past-awards";
import type { PastAwardResult } from "@/lib/types";

type SearchParams = {
  status?: string;
  imported?: string;
  updated?: string;
  local?: string;
};

export default async function AdminPastAwardsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const admin = await getCurrentAdmin();
  const status = params.status ?? "all";
  const awards = await getAdminPastAwardResults(status);
  const stats = summarizePastAwards(awards);
  const agencyCounts = countBy(awards, (award) => award.agency_name);
  const businessTypeCounts = countBy(awards, (award) => award.business_type ?? tenderTypeLabel(award.tender_type));
  const content = (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">過去落札データ</h2>
          <p className="mt-1 text-sm text-slate-600">AI分析の学習元になる過去落札結果を管理します。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries({ all: "すべて", approved: "承認済み", pending: "確認待ち", rejected: "却下" }).map(([value, label]) => (
            <Link key={value} href={`/admin/past-awards?status=${value}`} className={`rounded border px-3 py-2 text-sm font-bold focus-ring ${status === value ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-700"}`}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {!admin ? (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
          ローカル開発データを表示しています。Supabase管理者ログインなしの場合、CSVは `data/past-award-results.json` に保存されます。
        </div>
      ) : null}

      {params.imported || params.updated ? (
        <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
          CSVインポート: 新規 {params.imported ?? 0}件、更新 {params.updated ?? 0}件{params.local ? "（ローカル保存）" : ""}
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <Metric label="表示件数" value={stats.count} />
        <Metric label="平均落札額" value={formatYen(stats.averageAwardAmount)} />
        <Metric label="最低落札額" value={formatYen(stats.minAwardAmount)} />
        <Metric label="最高落札額" value={formatYen(stats.maxAwardAmount)} />
        <Metric label="平均落札率" value={formatRate(stats.averageWinRate)} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <CountPanel title="発注機関別件数" counts={agencyCounts} />
        <CountPanel title="業種別件数" counts={businessTypeCounts} />
      </div>

      <CsvImportForm />

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
                  <td colSpan={10} className="px-3 py-8 text-center text-slate-500">過去落札データはまだありません。</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  if (admin) return <AdminShell email={admin.email}>{content}</AdminShell>;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">{content}</div>
    </main>
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

function CountPanel({ title, counts }: { title: string; counts: { label: string; count: number }[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="font-black text-slate-950">{title}</h3>
      <div className="mt-3 grid gap-2">
        {counts.slice(0, 10).map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 rounded border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
            <span className="truncate font-semibold text-slate-700">{item.label}</span>
            <span className="font-black text-slate-950">{item.count}</span>
          </div>
        ))}
        {counts.length === 0 ? <p className="text-sm text-slate-500">データがありません。</p> : null}
      </div>
    </div>
  );
}

function formatYen(value: number | null) {
  if (value === null) return "-";
  return `${value.toLocaleString("ja-JP")}円`;
}

function formatRate(value: number | null) {
  if (value === null) return "-";
  return `${value.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}%`;
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

function countBy(awards: PastAwardResult[], keyFn: (award: PastAwardResult) => string) {
  const counts = new Map<string, number>();
  for (const award of awards) {
    const key = keyFn(award) || "未設定";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ja"));
}
