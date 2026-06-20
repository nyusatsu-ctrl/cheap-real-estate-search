import Link from "next/link";
import {
  formatSalesDate,
  formatYen,
  getCounterpartyLabel,
  getEndDate,
  getMonthlyAmount,
  getStartDate,
  getTermLabel
} from "@/lib/sales-contracts/data";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_TYPE_LABELS,
  VEHICLE_TYPE_LABELS
} from "@/lib/sales-contracts/rules";
import type { SalesContractListItem } from "@/lib/sales-contracts/types";

export function SalesContractTable({ items }: { items: SalesContractListItem[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
            <tr>
              <th className="px-3 py-3">顧客名</th>
              <th className="px-3 py-3">電話番号</th>
              <th className="px-3 py-3">車種</th>
              <th className="px-3 py-3">区分</th>
              <th className="px-3 py-3">契約方法</th>
              <th className="px-3 py-3">信販・リース</th>
              <th className="px-3 py-3">回数・期間</th>
              <th className="px-3 py-3">月額</th>
              <th className="px-3 py-3">初回・開始</th>
              <th className="px-3 py-3">最終・終了</th>
              <th className="px-3 py-3">ステータス</th>
              <th className="px-3 py-3">詳細</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item) => (
              <tr key={item.contract.id}>
                <td className="whitespace-nowrap px-3 py-3">
                  <p className="font-bold text-slate-950">{item.customer?.name ?? "-"}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.customer?.kana ?? ""}</p>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-700">{item.customer?.phone ?? "-"}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-700">{[item.vehicle?.maker, item.vehicle?.model].filter(Boolean).join(" ") || "-"}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-700">{VEHICLE_TYPE_LABELS[item.contract.vehicle_type]}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-700">{CONTRACT_TYPE_LABELS[item.contract.contract_type]}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-700">{getCounterpartyLabel(item)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-700">{getTermLabel(item)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-700">{formatYen(getMonthlyAmount(item))}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-700">{formatSalesDate(getStartDate(item))}</td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-700">{formatSalesDate(getEndDate(item))}</td>
                <td className="whitespace-nowrap px-3 py-3">
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                    {CONTRACT_STATUS_LABELS[item.contract.status]}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <Link href={`/admin/sales-contracts/${item.contract.id}`} className="font-bold text-brand-700">
                    表示
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-sm font-semibold text-slate-500">
                  契約データはまだありません。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
