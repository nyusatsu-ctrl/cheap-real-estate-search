import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { SalesContractTable } from "@/components/sales-contracts/SalesContractTable";
import { requireAdmin } from "@/lib/admin";
import { getSalesContractList } from "@/lib/sales-contracts/data";
import {
  CONTRACT_STATUS_OPTIONS,
  CONTRACT_TYPE_OPTIONS,
  FINANCE_COMPANY_OPTIONS
} from "@/lib/sales-contracts/rules";
import type { SalesContractFilters } from "@/lib/sales-contracts/types";

type SalesContractsSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SalesContractsPage({ searchParams }: { searchParams: SalesContractsSearchParams }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const filters = getFilters(params);
  const result = await getSalesContractList(filters);
  const setupMissing = firstParam(params.setup) === "missing";

  return (
    <AdminShell email={admin.email}>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-950">契約台帳</h1>
          <p className="mt-1 text-sm text-slate-600">販売後の顧客、契約、車両、ローン、リース、書類、対応履歴を管理します。</p>
        </div>
        <Link href="/admin/sales-contracts/new" className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
          新規契約登録
        </Link>
      </div>

      {(result.tableMissing || setupMissing) ? (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          契約管理テーブルが未作成です。supabase/sales-contracts.sql をSupabase SQL Editorで適用してください。マイグレーションはこの画面からは実行しません。
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
            検索
            <input name="q" defaultValue={filters.keyword ?? ""} placeholder="氏名・電話・車種・ナンバー・車台番号" className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 focus-ring" />
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            契約方法
            <select name="contract_type" defaultValue={filters.contractType ?? ""} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus-ring">
              <option value="">すべて</option>
              {CONTRACT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            信販会社
            <select name="finance_company" defaultValue={filters.financeCompany ?? ""} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus-ring">
              <option value="">すべて</option>
              {FINANCE_COMPANY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            契約ステータス
            <select name="status" defaultValue={filters.status ?? ""} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus-ring">
              <option value="">すべて</option>
              {CONTRACT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white focus-ring">絞り込み</button>
          <Link href="/admin/sales-contracts" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
            クリア
          </Link>
        </div>
      </form>

      <SalesContractTable items={result.data} />
    </AdminShell>
  );
}

function getFilters(params: Record<string, string | string[] | undefined>): SalesContractFilters {
  const contractType = firstParam(params.contract_type);
  const status = firstParam(params.status);
  const financeCompany = firstParam(params.finance_company);
  return {
    keyword: firstParam(params.q) || undefined,
    contractType: CONTRACT_TYPE_OPTIONS.some((option) => option.value === contractType) ? contractType as SalesContractFilters["contractType"] : undefined,
    status: CONTRACT_STATUS_OPTIONS.some((option) => option.value === status) ? status as SalesContractFilters["status"] : undefined,
    financeCompany: FINANCE_COMPANY_OPTIONS.some((option) => option.value === financeCompany) ? financeCompany as SalesContractFilters["financeCompany"] : undefined
  };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
