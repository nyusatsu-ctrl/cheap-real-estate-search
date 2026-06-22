import {
  CONTACT_METHOD_OPTIONS,
  CONTACT_STATUS_OPTIONS
} from "@/lib/sales-contracts/rules";
import type { SalesContractDetail } from "@/lib/sales-contracts/types";

const inputClass = "rounded border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus-ring";

export function LeaseMaturityHistoryForm({
  detail,
  action
}: {
  detail: SalesContractDetail;
  action: (formData: FormData) => void | Promise<void>;
}) {
  if (!detail.leaseMaturity) {
    return (
      <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
        満期管理を保存すると、満期対応履歴を追加できるようになります。
      </div>
    );
  }

  return (
    <form action={action} className="rounded border border-slate-200 bg-slate-50 p-4">
      <input type="hidden" name="maturity_id" value={detail.leaseMaturity.id} />
      <input type="hidden" name="contract_id" value={detail.contract.id} />
      <input type="hidden" name="customer_id" value={detail.customer?.id ?? ""} />
      <input type="hidden" name="return_to" value={`/admin/sales-contracts/${detail.contract.id}`} />
      <h4 className="text-base font-black text-slate-950">満期対応履歴を追加</h4>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Field label="対応日時">
          <input name="history_handled_at" type="datetime-local" className={inputClass} />
        </Field>
        <Field label="対応者">
          <input name="history_handled_by" className={inputClass} />
        </Field>
        <Field label="対応方法">
          <select name="history_method" defaultValue="phone" className={inputClass}>
            {CONTACT_METHOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field label="ステータス">
          <select name="history_status" defaultValue="normal" className={inputClass}>
            {CONTACT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field label="次回対応日">
          <input name="history_next_action_date" type="date" className={inputClass} />
        </Field>
        <Field label="添付URL">
          <input name="history_attachment_url" type="url" className={inputClass} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="対応内容">
          <textarea name="history_content" rows={3} required className={inputClass} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="備考">
          <textarea name="history_memo" rows={2} className={inputClass} />
        </Field>
      </div>
      <button className="mt-4 rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">履歴を追加</button>
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
