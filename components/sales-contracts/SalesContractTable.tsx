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
import { LOAN_REVIEW_APP_URL } from "@/lib/sales-contracts/source";
import type { SalesContractListItem } from "@/lib/sales-contracts/types";

type SalesContractTableEmptyState = "default" | "onboarding" | "filtered";

export function SalesContractTable({
  items,
  emptyState = "default"
}: {
  items: SalesContractListItem[];
  emptyState?: SalesContractTableEmptyState;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
            <tr>
              <th className="px-3 py-3">顧客名</th>
              <th className="px-3 py-3">電話番号</th>
              <th className="px-3 py-3">登録元</th>
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
                    <SourceBadge source={item.contract.source_system} />
                  </td>
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
                    {isUnconfirmedContractStatus(item.contract.status) ? (
                      <p className="mt-1 text-xs font-bold text-violet-700">未確定</p>
                    ) : null}
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
                <td colSpan={20} className="px-3 py-8">
                  <EmptySalesContractsState variant={emptyState} />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptySalesContractsState({ variant }: { variant: SalesContractTableEmptyState }) {
  if (variant === "filtered") {
    return (
      <div className="py-5 text-center text-sm font-semibold text-slate-500">
        条件に一致する契約データはありません。
      </div>
    );
  }

  if (variant !== "onboarding") {
    return (
      <div className="py-5 text-center text-sm font-semibold text-slate-500">
        契約データはまだありません。
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-left">
      <h2 className="text-xl font-black text-slate-950">契約データはまだありません</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
        新規契約登録、または自社ローン審査管理アプリから契約予定のお客様を送信して、契約台帳に登録してください。
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/admin/sales-contracts/new" className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
          新規契約を登録
        </Link>
        <a
          href={LOAN_REVIEW_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-800 focus-ring"
        >
          自社ローン審査管理を開く
        </a>
      </div>
      <p className="mt-4 text-sm font-semibold leading-6 text-emerald-900">
        GAS審査管理から送信した場合は、顧客情報・電話番号・希望車種などが自動入力されます。契約条件を確認してから保存してください。
      </p>
      <ol className="mt-4 grid gap-2 text-sm font-bold text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
        {["審査管理で顧客を選択", "契約管理へ登録を押す", "契約条件を確認", "契約を登録"].map((step, index) => (
          <li key={step} className="rounded border border-emerald-100 bg-white px-3 py-2">
            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-xs text-white">{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
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

function SourceBadge({ source }: { source: string | null }) {
  if (source === "gas_loan_review") {
    return <Badge className="bg-emerald-50 text-emerald-800">自社ローン審査管理</Badge>;
  }
  return <Badge className="bg-slate-100 text-slate-700">手入力</Badge>;
}

function getContractTypeClass(value: SalesContractListItem["contract"]["contract_type"]) {
  if (value === "loan") return "bg-indigo-50 text-indigo-800";
  if (value === "lease") return "bg-emerald-50 text-emerald-800";
  return "bg-slate-100 text-slate-700";
}

function getStatusClass(value: SalesContractListItem["contract"]["status"]) {
  if (value === "contract_candidate" || value === "negotiating" || value === "terms_pending") return "bg-violet-50 text-violet-800";
  if (value === "cancelled" || value === "trouble" || value === "payment_delay_contacted") return "bg-rose-50 text-rose-800";
  if (value === "waiting_delivery" || value === "payoff_scheduled") return "bg-amber-50 text-amber-800";
  if (value === "paid_off" || value === "lease_ended" || value === "delivered" || value === "completed") return "bg-slate-100 text-slate-700";
  return "bg-teal-50 text-teal-800";
}

function isUnconfirmedContractStatus(value: SalesContractListItem["contract"]["status"]) {
  return value === "contract_candidate" || value === "terms_pending";
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
