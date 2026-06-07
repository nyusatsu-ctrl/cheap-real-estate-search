import Link from "next/link";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import {
  deleteTenderSourceAction,
  importTenderSourcesCsvAction,
  runTenderSourceCrawlAction,
  saveTenderSourceAction,
  seedTenderSourcesAction
} from "@/app/admin/tender-sources/actions";
import { AdminShell } from "@/components/AdminShell";
import {
  REGIONS,
  TENDER_CRAWL_FREQUENCY_LABELS,
  TENDER_CRAWL_PRIORITY_LABELS,
  TENDER_CRAWLER_DIFFICULTY_LABELS,
  TENDER_CRAWLER_TYPE_LABELS,
  TENDER_SOURCE_FORMAT_LABELS,
  TENDER_SOURCE_ORGANIZATION_TYPE_LABELS
} from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { getCurrentAdmin } from "@/lib/admin";
import { getTenderSources } from "@/lib/tenders";
import type { TenderSource } from "@/lib/types";

export default async function TenderSourcesPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">管理画面</h1>
          <p className="mt-2 text-slate-700">取得元管理には管理者ログインが必要です。</p>
          <Link href="/admin/login" className="mt-5 inline-block rounded bg-brand-700 px-4 py-2 font-bold text-white focus-ring">ログインへ</Link>
        </div>
      </div>
    );
  }

  const sources = await getTenderSources();

  return (
    <AdminShell email={admin.email}>
      <div className="grid gap-5">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <form action={saveTenderSourceAction} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">取得元サイト登録</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="取得元名" name="source_name" required />
              <Select label="組織区分" name="organization_type" options={TENDER_SOURCE_ORGANIZATION_TYPE_LABELS} defaultValue="other" />
              <Select label="地域" name="region" options={Object.fromEntries(REGIONS.map((region) => [region, region]))} defaultValue="全国" />
              <Field label="都道府県" name="prefecture" />
              <Field label="base_url" name="base_url" type="url" />
              <Field label="tender_list_url" name="tender_list_url" type="url" required />
              <Field label="open_counter_url" name="open_counter_url" type="url" />
              <Field label="result_url" name="result_url" type="url" />
              <Field label="target_types" name="target_types" defaultValue="goods,services,open_counter,qualification_required" />
              <Select label="source_format" name="source_format" options={TENDER_SOURCE_FORMAT_LABELS} defaultValue="html" />
              <Select label="crawler_type" name="crawler_type" options={TENDER_CRAWLER_TYPE_LABELS} defaultValue="manual_only" />
              <Select label="crawler_difficulty" name="crawler_difficulty" options={TENDER_CRAWLER_DIFFICULTY_LABELS} defaultValue="medium" />
              <Select label="crawl_priority" name="crawl_priority" options={TENDER_CRAWL_PRIORITY_LABELS} defaultValue="C" />
              <Select label="crawl_frequency" name="crawl_frequency" options={TENDER_CRAWL_FREQUENCY_LABELS} defaultValue="weekly" />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <TextArea label="robots_note" name="robots_note" defaultValue="未確認" />
              <TextArea label="terms_note" name="terms_note" defaultValue="未確認" />
              <TextArea label="admin_note" name="admin_note" />
              <div className="grid content-start gap-3">
                <Check label="有効" name="is_active" defaultChecked />
                <Check label="robots/terms確認済み・自動クロール許可" name="crawl_ready" />
              </div>
            </div>
            <button className="mt-5 rounded bg-brand-700 px-4 py-2 font-bold text-white focus-ring">登録する</button>
          </form>

          <div className="grid gap-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">seed / CSV</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <form action={seedTenderSourcesAction}>
                  <button className="rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white focus-ring">公式取得元seedを登録</button>
                </form>
                <Link href="/admin/tender-sources/export" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
                  CSVエクスポート
                </Link>
              </div>
              <form action={importTenderSourcesCsvAction} className="mt-4 grid gap-3">
                <label className="grid gap-1 text-sm font-semibold text-slate-700">
                  CSVファイル
                  <input name="csv_file" type="file" accept=".csv,text/csv" className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
                </label>
                <TextArea label="CSV貼り付け" name="csv_text" rows={5} />
                <button className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">CSVインポート</button>
              </form>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              未確認の取得元は自動クロール対象外です。robots.txt と利用規約確認後に「自動クロール許可」を有効化してください。
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-black text-slate-950">取得元一覧</h2>
            <p className="mt-1 text-sm text-slate-600">{sources.length}件</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">取得元</th>
                  <th className="px-3 py-3">分類</th>
                  <th className="px-3 py-3">優先度</th>
                  <th className="px-3 py-3">最終取得</th>
                  <th className="px-3 py-3">件数/エラー</th>
                  <th className="px-3 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sources.map((source) => (
                  <tr key={source.id} className={!source.is_active ? "bg-slate-50 text-slate-500" : undefined}>
                    <td className="min-w-80 px-3 py-3 align-top">
                      <a href={source.tender_list_url ?? source.url} target="_blank" rel="noreferrer" className="font-black text-slate-950 hover:text-brand-700">
                        {source.source_name ?? source.name}
                      </a>
                      <p className="mt-1 break-all text-xs text-slate-500">{source.tender_list_url ?? source.url}</p>
                      <div className="mt-2 flex flex-wrap gap-1 text-xs font-bold">
                        <span className={source.crawl_ready ? "rounded bg-emerald-100 px-2 py-0.5 text-emerald-700" : "rounded bg-amber-100 px-2 py-0.5 text-amber-800"}>
                          {source.crawl_ready ? "確認済み" : "未確認"}
                        </span>
                        <span className={source.is_active ? "rounded bg-sky-100 px-2 py-0.5 text-sky-700" : "rounded bg-slate-200 px-2 py-0.5 text-slate-600"}>
                          {source.is_active ? "有効" : "無効"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top text-slate-700">
                      <p>{label(TENDER_SOURCE_ORGANIZATION_TYPE_LABELS, source.organization_type)}</p>
                      <p className="text-xs text-slate-500">{source.region ?? "-"} / {source.prefecture ?? "-"}</p>
                      <p className="mt-1 text-xs text-slate-500">{label(TENDER_CRAWLER_TYPE_LABELS, source.crawler_type)}</p>
                    </td>
                    <td className="px-3 py-3 align-top text-slate-700">
                      <p className="font-bold">{source.crawl_priority ?? "C"}</p>
                      <p className="text-xs">{label(TENDER_CRAWL_FREQUENCY_LABELS, source.crawl_frequency)}</p>
                    </td>
                    <td className="px-3 py-3 align-top text-slate-700">{formatDate(source.last_crawled_at)}</td>
                    <td className="px-3 py-3 align-top text-slate-700">
                      <p>{source.tender_count ?? 0}件</p>
                      <p className="mt-1 max-w-56 text-xs text-rose-700">{source.latest_error ?? source.last_error_message}</p>
                    </td>
                    <td className="min-w-72 px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <form action={runTenderSourceCrawlAction}>
                          <input type="hidden" name="id" value={source.id} />
                          <button className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus-ring">手動クロール</button>
                        </form>
                        <form action={deleteTenderSourceAction}>
                          <input type="hidden" name="id" value={source.id} />
                          <button className="rounded border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 focus-ring">削除</button>
                        </form>
                      </div>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-bold text-brand-700">編集</summary>
                        <EditSourceForm source={source} />
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function EditSourceForm({ source }: { source: TenderSource }) {
  return (
    <form action={saveTenderSourceAction} className="mt-3 grid gap-2 rounded border border-slate-200 bg-slate-50 p-3">
      <input type="hidden" name="id" value={source.id} />
      <Field label="取得元名" name="source_name" defaultValue={source.source_name ?? source.name} required />
      <Field label="tender_list_url" name="tender_list_url" defaultValue={source.tender_list_url ?? source.url} required />
      <Field label="base_url" name="base_url" defaultValue={source.base_url ?? source.url} />
      <Select label="組織区分" name="organization_type" options={TENDER_SOURCE_ORGANIZATION_TYPE_LABELS} defaultValue={source.organization_type ?? "other"} />
      <div className="grid gap-2 md:grid-cols-2">
        <Field label="地域" name="region" defaultValue={source.region ?? ""} />
        <Field label="都道府県" name="prefecture" defaultValue={source.prefecture ?? ""} />
      </div>
      <Field label="open_counter_url" name="open_counter_url" defaultValue={source.open_counter_url ?? ""} />
      <Field label="result_url" name="result_url" defaultValue={source.result_url ?? ""} />
      <Field label="target_types" name="target_types" defaultValue={(source.target_types ?? []).join(",")} />
      <div className="grid gap-2 md:grid-cols-2">
        <Select label="crawler_type" name="crawler_type" options={TENDER_CRAWLER_TYPE_LABELS} defaultValue={source.crawler_type ?? "manual_only"} />
        <Select label="source_format" name="source_format" options={TENDER_SOURCE_FORMAT_LABELS} defaultValue={source.source_format ?? "html"} />
        <Select label="難易度" name="crawler_difficulty" options={TENDER_CRAWLER_DIFFICULTY_LABELS} defaultValue={source.crawler_difficulty ?? "medium"} />
        <Select label="優先度" name="crawl_priority" options={TENDER_CRAWL_PRIORITY_LABELS} defaultValue={source.crawl_priority ?? "C"} />
        <Select label="頻度" name="crawl_frequency" options={TENDER_CRAWL_FREQUENCY_LABELS} defaultValue={source.crawl_frequency ?? "weekly"} />
      </div>
      <TextArea label="robots_note" name="robots_note" defaultValue={source.robots_note ?? ""} />
      <TextArea label="terms_note" name="terms_note" defaultValue={source.terms_note ?? ""} />
      <TextArea label="admin_note" name="admin_note" defaultValue={source.admin_note ?? ""} />
      <div className="flex flex-wrap gap-3">
        <Check label="有効" name="is_active" defaultChecked={source.is_active} />
        <Check label="自動クロール許可" name="crawl_ready" defaultChecked={Boolean(source.crawl_ready)} />
      </div>
      <button className="rounded bg-brand-700 px-3 py-2 text-xs font-bold text-white focus-ring">保存</button>
    </form>
  );
}

function Field({ label, name, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <input name={name} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" {...props} />
    </label>
  );
}

function TextArea({ label, name, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; name: string }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <textarea name={name} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" {...props} />
    </label>
  );
}

function Select({ label, name, options, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; name: string; options: Record<string, string> }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <select name={name} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" {...props}>
        {Object.entries(options).map(([value, labelText]) => (
          <option key={value} value={value}>{labelText}</option>
        ))}
      </select>
    </label>
  );
}

function Check({ label, name, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
      <input name={name} type="checkbox" {...props} />
      {label}
    </label>
  );
}

function label(labels: Record<string, string>, value?: string | null) {
  if (!value) return "-";
  return labels[value] ?? value;
}
