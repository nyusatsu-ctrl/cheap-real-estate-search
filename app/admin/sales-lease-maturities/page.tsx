import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell } from "@/components/AdminShell";
import { LeaseMaturityTable } from "@/components/sales-contracts/LeaseMaturityTable";
import { requireAdmin } from "@/lib/admin";
import { getSalesLeaseMaturityList } from "@/lib/sales-contracts/data";
import {
  LEASE_COMPANY_OPTIONS,
  LEASE_MATURITY_CHOICE_OPTIONS,
  LEASE_MATURITY_STATUS_OPTIONS
} from "@/lib/sales-contracts/rules";
import type { SalesLeaseMaturityFilters } from "@/lib/sales-contracts/types";

type LeaseMaturitiesSearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "リース満期 | 契約管理システム",
  description: "登録済みのリース満期予定、顧客選択、残価、追加精算金、次回連絡予定を管理します。"
};

export default async function SalesLeaseMaturitiesPage({ searchParams }: { searchParams: LeaseMaturitiesSearchParams }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const filters = getFilters(params);
  const result = await getSalesLeaseMaturityList(filters);
  const setupMissing = firstParam(params.setup) === "missing";

  return (
    <AdminShell email={admin.email} systemName="契約管理システム">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-950">リース満期</h1>
          <p className="mt-1 text-sm text-slate-600">契約詳細で作成済みのリース満期管理だけを表示します。</p>
        </div>
        <Link href="/admin/sales-contracts" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
          契約台帳
        </Link>
      </div>

      {(result.tableMissing || setupMissing) ? (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          リース満期管理テーブルが未作成です。supabase/sales-contracts.sql のリース満期管理SQLをSupabase SQL Editorで適用してください。
        </div>
      ) : null}
      {result.errorMessage && !result.tableMissing ? (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          {result.errorMessage}
        </div>
      ) : null}

      <form className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            満期月
            <input name="maturity_month" type="month" defaultValue={filters.maturityMonth ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 focus-ring" />
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            リース会社
            <select name="lease_company" defaultValue={filters.leaseCompany ?? ""} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus-ring">
              <option value="">すべて</option>
              {LEASE_COMPANY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            ステータス
            <select name="maturity_status" defaultValue={filters.maturityStatus ?? ""} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus-ring">
              <option value="">すべて</option>
              {LEASE_MATURITY_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            お客様の選択
            <select name="customer_choice" defaultValue={filters.customerChoice ?? ""} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus-ring">
              <option value="">すべて</option>
              {LEASE_MATURITY_CHOICE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white focus-ring">絞り込み</button>
          <Link href="/admin/sales-lease-maturities" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
            クリア
          </Link>
        </div>
      </form>

      <LeaseMaturityTable items={result.data} />
    </AdminShell>
  );
}

function getFilters(params: Record<string, string | string[] | undefined>): SalesLeaseMaturityFilters {
  const maturityMonth = firstParam(params.maturity_month);
  const leaseCompany = firstParam(params.lease_company);
  const maturityStatus = firstParam(params.maturity_status);
  const customerChoice = firstParam(params.customer_choice);
  return {
    maturityMonth: /^\d{4}-\d{2}$/.test(maturityMonth) ? maturityMonth : undefined,
    leaseCompany: LEASE_COMPANY_OPTIONS.some((option) => option.value === leaseCompany) ? leaseCompany as SalesLeaseMaturityFilters["leaseCompany"] : undefined,
    maturityStatus: LEASE_MATURITY_STATUS_OPTIONS.some((option) => option.value === maturityStatus) ? maturityStatus as SalesLeaseMaturityFilters["maturityStatus"] : undefined,
    customerChoice: LEASE_MATURITY_CHOICE_OPTIONS.some((option) => option.value === customerChoice) ? customerChoice as SalesLeaseMaturityFilters["customerChoice"] : undefined
  };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
