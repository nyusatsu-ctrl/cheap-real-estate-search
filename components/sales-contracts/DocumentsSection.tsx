import Link from "next/link";
import {
  DOCUMENT_TYPE_OPTIONS,
  DOCUMENT_VISIBILITY_LABELS,
  DOCUMENT_VISIBILITY_OPTIONS
} from "@/lib/sales-contracts/rules";
import type { SalesContractDetail } from "@/lib/sales-contracts/types";

const inputClass = "rounded border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus-ring";

export function DocumentsSection({
  detail,
  action
}: {
  detail: SalesContractDetail;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const typeLabels = new Map<string, string>(DOCUMENT_TYPE_OPTIONS.map((option) => [option.value, option.label]));

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">書類管理</h3>
      <div className="mt-4 divide-y divide-slate-200">
        {detail.documents.map((document) => (
          <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <div>
              <p className="font-bold text-slate-950">{document.title || typeLabels.get(document.document_type) || document.document_type}</p>
              <p className="mt-1 text-xs text-slate-500">{DOCUMENT_VISIBILITY_LABELS[document.visibility]}</p>
            </div>
            {document.file_url ? (
              <Link href={document.file_url} target="_blank" rel="noopener noreferrer" className="font-bold text-brand-700">開く</Link>
            ) : (
              <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">URL未登録</span>
            )}
          </div>
        ))}
        {detail.documents.length === 0 ? <p className="py-3 text-sm font-semibold text-slate-500">書類はまだありません。</p> : null}
      </div>

      <form action={action} className="mt-5 rounded border border-slate-200 bg-slate-50 p-4">
        <input type="hidden" name="contract_id" value={detail.contract.id} />
        <h4 className="text-base font-black text-slate-950">書類を追加</h4>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Field label="書類種別">
            <select name="document_type" className={inputClass}>
              {DOCUMENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="タイトル">
            <input name="title" className={inputClass} />
          </Field>
          <Field label="閲覧範囲">
            <select name="visibility" defaultValue="admin" className={inputClass}>
              {DOCUMENT_VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="URL">
            <input name="file_url" type="url" className={inputClass} />
          </Field>
          <Field label="storage_path">
            <input name="storage_path" className={inputClass} />
          </Field>
          <Field label="備考">
            <input name="document_memo" className={inputClass} />
          </Field>
        </div>
        <button className="mt-4 rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">追加</button>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      {label}
      {children}
    </label>
  );
}
