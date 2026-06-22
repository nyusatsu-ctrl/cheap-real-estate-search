import Link from "next/link";
import {
  formatSalesDate,
  formatYen,
  getCounterpartyLabel,
  getEndDate,
  getFinalPaymentAmount,
  getInitialPaymentAmount,
  getMonthlyAmount,
  getNextActionDate,
  getResidualValueAmount,
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
              <th className="px-3 py-3">車両区分</th>
              <th className="px-3 py-3">車種</th>
              <th className="px-3 py-3">ナンバー</th>
              <th className="px-3 py-3">契約方法</th>
              <th className="px-3 py-3">信販会社</th>
              <th className="px-3 py-3">回数・期間</th>
              <th className="px-3 py-3 text-right">契約金額</th>
              <th className="px-3 py-3 text-right">頭金</th>
              <th className="px-3 py-3 text-right">初回支払額</th>
              <th className="px-3 py-3">月額</th>
              <th className="px-3 py-3 text-right">最終支払額</th>
              <th className="px-3 py-3 text-right">残価</th>
              <th className="px-3 py-3">支払開始日</th>
              <th className="px-3 py-3">支払終了日</th>
              <th className="px-3 py-3">ステータス</th>
              <th className="px-3 py-3">次回対応日</th>
              <th className="px-3 py-3">詳細</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item) => {
              const nextActionDate = getNextActionDate(item);
              return (
                <tr key={item.contract.id} className="align-top hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-3">
                    <p className="font-bold text-slate-950">{item.customer?.name ?? "-"}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.customer?.kana ?? ""}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{item.customer?.phone ?? "-"}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <Badge className="bg-sky-50 text-sky-800">{VEHICLE_TYPE_LABELS[item.contract.vehicle_type]}</Badge>
                  </td>
                  <td className="min-w-40 whitespace-nowrap px-3 py-3 text-slate-700">
                    {[item.vehicle?.maker, item.vehicle?.model].filter(Boolean).join(" ") || "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{item.vehicle?.registration_number ?? "-"}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <Badge className={getContractTypeClass(item.contract.contract_type)}>
                      {CONTRACT_TYPE_LABELS[item.contract.contract_type]}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{getCounterpartyLabel(item)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{getTermLabel(item)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-slate-900">{formatYen(item.contract.sale_price)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">{formatYen(item.contract.down_payment)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">{formatYen(getInitialPaymentAmount(item))}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">{formatYen(getMonthlyAmount(item))}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">{formatYen(getFinalPaymentAmount(item))}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">{formatYen(getResidualValueAmount(item))}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{formatSalesDate(getStartDate(item))}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{formatSalesDate(getEndDate(item))}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <Badge className={getStatusClass(item.contract.status)}>
                      {CONTRACT_STATUS_LABELS[item.contract.status]}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <NextActionDate value={nextActionDate} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <Link href={`/admin/sales-contracts/${item.contract.id}`} className="font-bold text-brand-700 hover:text-brand-800">
                      詳細
                    </Link>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 ? (
              <tr>
                <td colSpan={19} className="px-3 py-8 text-center text-sm font-semibold text-slate-500">
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

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex rounded px-2 py-1 text-xs font-bold ${className}`}>{children}</span>;
}

function NextActionDate({ value }: { value: string | null }) {
  if (!value) return <span className="text-slate-400">-</span>;
  return <Badge className={`${getNextActionClass(value)} tabular-nums`}>{formatSalesDate(value)}</Badge>;
}

function getContractTypeClass(value: SalesContractListItem["contract"]["contract_type"]) {
  if (value === "loan") return "bg-indigo-50 text-indigo-800";
  if (value === "lease") return "bg-emerald-50 text-emerald-800";
  return "bg-slate-100 text-slate-700";
}

function getStatusClass(value: SalesContractListItem["contract"]["status"]) {
  if (value === "cancelled" || value === "trouble" || value === "payment_delay_contacted") return "bg-rose-50 text-rose-800";
  if (value === "waiting_delivery" || value === "payoff_scheduled") return "bg-amber-50 text-amber-800";
  if (value === "paid_off" || value === "lease_ended" || value === "delivered") return "bg-slate-100 text-slate-700";
  return "bg-teal-50 text-teal-800";
}

function getNextActionClass(value: string) {
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  if (value < today) return "bg-rose-50 text-rose-800";
  if (value === today) return "bg-amber-50 text-amber-800";
  return "bg-blue-50 text-blue-800";
}
