import Link from "next/link";
import type { ReactNode } from "react";
import {
  formatSalesDate,
  formatYen,
  getEffectiveMaturityDate,
  getEffectiveResidualValueAmount,
  getLeaseMaturityFlags
} from "@/lib/sales-contracts/data";
import { LEASE_COMPANY_LABELS } from "@/lib/sales-contracts/rules";
import type { SalesLeaseMaturityListItem } from "@/lib/sales-contracts/types";

export function LeaseMaturityUncreatedCandidates({ items }: { items: SalesLeaseMaturityListItem[] }) {
  return (
    <section className="mb-5 rounded-lg border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-black text-amber-950">満期管理未作成のリース契約</h2>
          <p className="mt-1 text-sm font-semibold text-amber-900">
            リース契約は登録済みですが、満期管理がまだ作成されていない契約候補です。期限切れ・今月・来月・90日以内の満期だけを表示し、自動作成は行いません。
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-amber-900 ring-1 ring-amber-200">
          {items.length.toLocaleString("ja-JP")}件
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-amber-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-amber-100 text-sm">
            <thead className="bg-amber-100/70 text-left text-xs font-bold text-amber-950">
              <tr>
                <th className="px-3 py-3">顧客名</th>
                <th className="px-3 py-3">電話番号</th>
                <th className="px-3 py-3">車種</th>
                <th className="px-3 py-3">登録番号・ナンバー</th>
                <th className="px-3 py-3">リース会社</th>
                <th className="px-3 py-3">満期予定日</th>
                <th className="px-3 py-3">残価</th>
                <th className="px-3 py-3">契約詳細</th>
                <th className="px-3 py-3">満期管理作成</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100">
              {items.map((item) => (
                <tr key={item.lease.id}>
                  <td className="whitespace-nowrap px-3 py-3">
                    <p className="font-bold text-slate-950">{item.customer?.name ?? "-"}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.customer?.kana ?? ""}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{item.customer?.phone ?? "-"}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{[item.vehicle?.maker, item.vehicle?.model].filter(Boolean).join(" ") || "-"}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{item.vehicle?.registration_number ?? "-"}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{LEASE_COMPANY_LABELS[item.lease.lease_company]}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <p className="font-bold text-slate-900">{formatSalesDate(getEffectiveMaturityDate(item))}</p>
                    <div className="mt-1">
                      <CandidateBadge item={item} />
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{formatYen(getEffectiveResidualValueAmount(item))}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <Link href={`/admin/sales-contracts/${item.contract.id}`} className="font-bold text-brand-700">
                      詳細
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <Link href={`/admin/sales-contracts/${item.contract.id}#lease-maturity`} className="rounded bg-brand-700 px-3 py-2 text-xs font-bold text-white focus-ring">
                      満期管理を作成
                    </Link>
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-sm font-semibold text-amber-900">
                    満期管理未作成の候補はありません。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function CandidateBadge({ item }: { item: SalesLeaseMaturityListItem }) {
  const flags = getLeaseMaturityFlags(item);
  if (flags.isMaturityOverdue) return <Badge className="bg-red-100 text-red-800 ring-red-200">期限切れ</Badge>;
  if (flags.isThisMonth) return <Badge className="bg-amber-100 text-amber-800 ring-amber-200">今月満期</Badge>;
  if (flags.isNextMonth) return <Badge className="bg-sky-100 text-sky-800 ring-sky-200">来月満期</Badge>;
  return <Badge className="bg-violet-100 text-violet-800 ring-violet-200">90日以内</Badge>;
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ring-1 ${className}`}>
      {children}
    </span>
  );
}
