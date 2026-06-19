import {
  CONTACT_METHOD_OPTIONS,
  CONTACT_STATUS_OPTIONS
} from "@/lib/sales-contracts/rules";
import type { SalesContractDetail } from "@/lib/sales-contracts/types";

const inputClass = "rounded border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus-ring";

export function ContactHistoryForm({
  detail,
  action
}: {
  detail: SalesContractDetail;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="contract_id" value={detail.contract.id} />
      <input type="hidden" name="customer_id" value={detail.customer?.id ?? ""} />
      <h3 className="text-lg font-black text-slate-950">対応履歴を追加</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Field label="対応日時">
          <input name="contact_handled_at" type="datetime-local" className={inputClass} />
        </Field>
        <Field label="対応者">
          <input name="contact_handled_by" className={inputClass} />
        </Field>
        <Field label="対応方法">
          <select name="contact_method" defaultValue="phone" className={inputClass}>
            {CONTACT_METHOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>
        <Field label="ステータス">
          <select name="contact_status" defaultValue="normal" className={inputClass}>
            {CONTACT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>
        <Field label="次回対応日">
          <input name="contact_next_action_date" type="date" className={inputClass} />
        </Field>
        <Field label="添付URL">
          <input name="contact_attachment_url" type="url" className={inputClass} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="対応内容">
          <textarea name="contact_content" rows={4} required className={inputClass} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="備考">
          <textarea name="contact_memo" rows={2} className={inputClass} />
        </Field>
      </div>
      <button className="mt-4 rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">追加</button>
    </form>
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
