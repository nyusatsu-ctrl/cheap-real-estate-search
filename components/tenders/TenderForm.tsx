import { saveTenderAction, deleteTenderAction } from "@/app/admin/tenders/actions";
import { PREFECTURES, REGIONS, TENDER_STATUS_LABELS, TENDER_TYPE_LABELS } from "@/lib/constants";
import type { Tender } from "@/lib/types";

export function TenderForm({ tender }: { tender?: Tender | null }) {
  return (
    <div className="grid gap-4">
      <form action={saveTenderAction} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <input type="hidden" name="id" value={tender?.id ?? ""} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="物件名" name="title" defaultValue={tender?.title} required className="md:col-span-2" />
          <Field label="発注機関" name="agency_name" defaultValue={tender?.agency_name} required />
          <Select label="物件種別" name="tender_type" defaultValue={tender?.tender_type} options={TENDER_TYPE_LABELS} />
          <Select label="地域" name="region" defaultValue={tender?.region ?? "全国"} options={Object.fromEntries(REGIONS.map((name) => [name, name]))} />
          <Select label="都道府県" name="prefecture" defaultValue={tender?.prefecture ?? "東京都"} options={Object.fromEntries(PREFECTURES.map((name) => [name, name]))} />
          <Field label="公告日" name="published_at" type="datetime-local" defaultValue={toDateTimeLocal(tender?.published_at)} />
          <Field label="締切日" name="deadline_at" type="datetime-local" defaultValue={toDateTimeLocal(tender?.deadline_at)} />
          <Field label="物件日または見積期限" name="bid_at" type="datetime-local" defaultValue={toDateTimeLocal(tender?.bid_at)} />
          <Field label="必要資格" name="required_qualification" defaultValue={tender?.required_qualification ?? ""} />
          <Field label="元ページURL" name="source_url" type="url" defaultValue={tender?.source_url} required />
          <Field label="仕様書PDF URL" name="pdf_url" type="url" defaultValue={tender?.pdf_url ?? ""} />
          <Field label="取得元名" name="source_name" defaultValue={tender?.tender_sources?.name ?? ""} required />
          <Field label="取得元種別" name="source_type" defaultValue="manual" required />
          <Select label="公開状態" name="status" defaultValue={tender?.status ?? "published"} options={TENDER_STATUS_LABELS} />
          <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">
            物件詳細メモ
            <textarea name="detail_memo" defaultValue={tender?.detail_memo ?? ""} rows={5} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
          </label>
          <Checkbox label="参加資格あり" name="qualification_required" defaultChecked={tender?.qualification_required ?? false} />
          <Checkbox label="新着フラグ" name="is_new" defaultChecked={tender?.is_new ?? true} />
          <Checkbox label="新着フラグ" name="is_deadline_soon" defaultChecked={tender?.is_deadline_soon ?? false} />
          <Checkbox label="空き家・古家・土地・山林物件" name="is_defense" defaultChecked={tender?.is_defense ?? false} />
        </div>
        <div className="mt-6 flex justify-end">
          <button className="rounded bg-brand-700 px-5 py-3 font-bold text-white focus-ring">保存する</button>
        </div>
      </form>
      {tender ? (
        <form action={deleteTenderAction} className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <input type="hidden" name="id" value={tender.id} />
          <p className="text-sm font-semibold text-rose-800">この物件を削除します。重複統合の前に、公式URLとPDF URLが同一か確認してください。</p>
          <button className="mt-3 rounded bg-rose-700 px-4 py-2 text-sm font-bold text-white focus-ring">削除する</button>
        </form>
      ) : null}
    </div>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  className?: string;
};

function Field({ label, name, className = "", ...props }: FieldProps) {
  return (
    <label className={`grid gap-1 text-sm font-semibold text-slate-700 ${className}`}>
      {label}
      <input name={name} className="rounded border border-slate-300 px-3 py-2 font-normal text-slate-950 focus-ring" {...props} />
    </label>
  );
}

function Select({ label, name, defaultValue, options }: { label: string; name: string; defaultValue?: string; options: Record<string, string> }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <select name={name} defaultValue={defaultValue ?? Object.keys(options)[0]} className="rounded border border-slate-300 bg-white px-3 py-2 font-normal text-slate-950 focus-ring">
        {Object.entries(options).map(([value, labelText]) => (
          <option key={value} value={value}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({ label, name, defaultChecked }: { label: string; name: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}
