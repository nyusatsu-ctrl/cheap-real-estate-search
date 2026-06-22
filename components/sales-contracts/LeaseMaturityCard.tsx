import {
  formatSalesDate,
  formatSalesDateTime,
  formatYen
} from "@/lib/sales-contracts/data";
import {
  CONTACT_METHOD_LABELS,
  CONTACT_STATUS_LABELS
} from "@/lib/sales-contracts/rules";
import type { SalesContractDetail } from "@/lib/sales-contracts/types";
import { LeaseMaturityHistoryForm } from "@/components/sales-contracts/LeaseMaturityHistoryForm";
import { LeaseMaturitySettlementForm } from "@/components/sales-contracts/LeaseMaturitySettlementForm";

export function LeaseMaturityCard({
  detail,
  action,
  historyAction
}: {
  detail: SalesContractDetail;
  action: (formData: FormData) => void | Promise<void>;
  historyAction: (formData: FormData) => void | Promise<void>;
}) {
  if (!detail.lease) return null;

  const lease = detail.lease;
  const maturity = detail.leaseMaturity;
  const maturityDate = maturity?.maturity_date ?? lease.lease_end_date;
  const residualValueAmount = maturity?.residual_value_amount ?? lease.residual_value_amount;

  return (
    <section id="lease-maturity" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">リース満期管理</h2>
          <p className="mt-1 text-sm text-slate-600">
            満期予定日: {formatSalesDate(maturityDate)} / 残価: {formatYen(residualValueAmount)}
          </p>
        </div>
        {!maturity ? (
          <span className="rounded bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900">未作成</span>
        ) : null}
      </div>

      <LeaseMaturitySettlementForm detail={detail} action={action} />

      <div className="mt-6 space-y-4">
        <div>
          <h3 className="text-lg font-black text-slate-950">満期対応履歴</h3>
          {detail.leaseMaturityHistories.length ? (
            <div className="mt-3 divide-y divide-slate-200 rounded border border-slate-200">
              {detail.leaseMaturityHistories.map((history) => (
                <div key={history.id} className="p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-slate-950">
                      {formatSalesDateTime(history.handled_at)} / {CONTACT_METHOD_LABELS[history.method]} / {CONTACT_STATUS_LABELS[history.status]}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">{history.handled_by ?? "-"}</p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-slate-700">{history.content}</p>
                  {history.next_action_date ? <p className="mt-2 text-xs font-semibold text-slate-500">次回対応: {formatSalesDate(history.next_action_date)}</p> : null}
                  {history.memo ? <p className="mt-2 whitespace-pre-wrap text-xs font-semibold text-slate-500">備考: {history.memo}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm font-semibold text-slate-500">満期対応履歴はまだありません。</p>
          )}
        </div>
        <LeaseMaturityHistoryForm detail={detail} action={historyAction} />
      </div>
    </section>
  );
}
