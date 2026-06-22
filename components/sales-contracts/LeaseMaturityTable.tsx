import Link from "next/link";
import {
  formatSalesDate,
  formatYen,
  getEffectiveMaturityDate,
  getEffectiveResidualValueAmount
} from "@/lib/sales-contracts/data";
import {
  LEASE_COMPANY_LABELS,
  LEASE_MATURITY_CHOICE_LABELS,
  LEASE_MATURITY_STATUS_LABELS
} from "@/lib/sales-contracts/rules";
import type { SalesLeaseMaturityListItem } from "@/lib/sales-contracts/types";

export function LeaseMaturityTable({ items }: { items: SalesLeaseMaturityListItem[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
            <tr>
              <th className="px-3 py-3">顧客名</th>
              <th className="px-3 py-3">電話番号</th>
              <th className="px-3 py-3">車種</th>
              <th className="px-3 py-3">ナンバー</th>
              <th className="px-3 py-3">リース会社</th>
              <th className="px-3 py-3">満期予定日</th>
              <th className="px-3 py-3">残価</th>
              <th className="px-3 py-3">お客様の選択</th>
              <th className="px-3 py-3">追加精算金</th>
              <th className="px-3 py-3">ステータス</th>
              <th className="px-3 py-3">次回連絡予定日</th>
              <th className="px-3 py-3">詳細</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item) => {
              const maturityStatus = item.maturity?.maturity_status ?? "not_started";
              const customerChoice = item.maturity?.customer_choice ?? "undecided";
              return (
                <tr key={item.lease.id}>
                  <td className="whitespace-nowrap px-3 py-3">
                    <p className="font-bold text-slate-950">{item.customer?.name ?? "-"}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.customer?.kana ?? ""}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{item.customer?.phone ?? "-"}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{[item.vehicle?.maker, item.vehicle?.model].filter(Boolean).join(" ") || "-"}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{item.vehicle?.registration_number ?? "-"}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{LEASE_COMPANY_LABELS[item.lease.lease_company]}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{formatSalesDate(getEffectiveMaturityDate(item))}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{formatYen(getEffectiveResidualValueAmount(item))}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{LEASE_MATURITY_CHOICE_LABELS[customerChoice]}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{formatYen(item.maturity?.additional_settlement_amount)}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                      {LEASE_MATURITY_STATUS_LABELS[maturityStatus]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{formatSalesDate(item.maturity?.next_contact_date)}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <Link href={`/admin/sales-contracts/${item.contract.id}`} className="font-bold text-brand-700">
                      表示
                    </Link>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-sm font-semibold text-slate-500">
                  登録済みのリース満期管理はありません。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
