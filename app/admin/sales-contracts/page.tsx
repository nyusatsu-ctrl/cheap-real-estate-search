import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell } from "@/components/AdminShell";
import { SalesContractTable } from "@/components/sales-contracts/SalesContractTable";
import { requireAdmin } from "@/lib/admin";
import { getSalesContractList } from "@/lib/sales-contracts/data";
import {
  CONTRACT_STATUS_OPTIONS,
  CONTRACT_TYPE_OPTIONS,
  VEHICLE_TYPE_OPTIONS
} from "@/lib/sales-contracts/rules";
import type { SalesContractFilters } from "@/lib/sales-contracts/types";

type SalesContractsSearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "契約台帳 | 契約管理システム",
  description: "販売後の顧客、契約、車両、ローン、リース、書類、対応履歴を管理します。"
};

const COUNTERPARTY_FILTER_OPTIONS = [
  { value: "aplus", label: "アプラス" },
  { value: "aplus_showa", label: "アプラス・昭和リース連携" },
  { value: "premium", label: "プレミアファイナンス" },
  { value: "ast", label: "アスト" }
] as const;

const NEXT_ACTION_FILTER_OPTIONS = [
  { value: "due_today", label: "今日まで" },
  { value: "within_7_days", label: "7日以内" },
  { value: "overdue", label: "期限切れ" }
] as const;

const SOURCE_FILTER_OPTIONS = [
  { value: "manual", label: "手入力" },
  { value: "gas_loan_review", label: "自社ローン審査管理" }
] as const;

const SORT_OPTIONS = [
  { value: "updated_desc", label: "更新日が新しい順" },
  { value: "created_desc", label: "登録日が新しい順" },
  { value: "next_action_asc", label: "次回対応日が近い順" }
] as const;

export default async function SalesContractsPage({ searchParams }: { searchParams: SalesContractsSearchParams }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const filters = getFilters(params);
  const result = await getSalesContractList(filters);
  const setupMissing = firstParam(params.setup) === "missing";
  const hasActiveFilters = Boolean(filters.keyword || filters.vehicleType || filters.contractType || filters.status || filters.financeCompany || filters.source || filters.nextAction);

  return (
    <AdminShell email={admin.email} systemName="契約管理システム">
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
          契約管理テーブルが未作成です。DB管理者が sales contracts baseline migration を適用してください。この画面からは実行しません。
        </div>
      ) : null}
      {result.errorMessage && !result.tableMissing ? (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          {result.errorMessage}
        </div>
      ) : null}

      <form className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <label className="grid gap-1 text-xs font-bold text-slate-600 lg:col-span-2">
            検索
            <input name="q" defaultValue={filters.keyword ?? ""} placeholder="氏名・電話・車種・ナンバー・車台番号" className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 focus-ring" />
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            車両区分
            <select name="vehicle_type" defaultValue={filters.vehicleType ?? ""} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus-ring">
              <option value="">すべて</option>
              {VEHICLE_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
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
              {COUNTERPARTY_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            契約ステータス
            <select name="status" defaultValue={filters.status ?? ""} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus-ring">
              <option value="">すべて</option>
              {CONTRACT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            登録元
            <select name="source" defaultValue={filters.source ?? ""} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus-ring">
              <option value="">すべて</option>
              {SOURCE_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            次回対応日
            <select name="next_action" defaultValue={filters.nextAction ?? ""} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus-ring">
              <option value="">すべて</option>
              {NEXT_ACTION_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">
            並び順
            <select name="sort" defaultValue={filters.sort ?? "updated_desc"} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus-ring">
              {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className="rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white focus-ring">絞り込み</button>
          <Link href="/admin/sales-contracts" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
            クリア
          </Link>
          <span className="text-xs font-bold text-slate-500">表示件数: {result.data.length.toLocaleString("ja-JP")}件</span>
        </div>
      </form>

      <SalesContractTable items={result.data} emptyState={hasActiveFilters ? "filtered" : "onboarding"} />
    </AdminShell>
  );
}

function getFilters(params: Record<string, string | string[] | undefined>): SalesContractFilters {
  const vehicleType = firstParam(params.vehicle_type);
  const contractType = firstParam(params.contract_type);
  const status = firstParam(params.status);
  const financeCompany = firstParam(params.finance_company);
  const source = firstParam(params.source);
  const nextAction = firstParam(params.next_action);
  const sort = firstParam(params.sort);
  return {
    keyword: firstParam(params.q) || undefined,
    vehicleType: VEHICLE_TYPE_OPTIONS.some((option) => option.value === vehicleType) ? vehicleType as SalesContractFilters["vehicleType"] : undefined,
    contractType: CONTRACT_TYPE_OPTIONS.some((option) => option.value === contractType) ? contractType as SalesContractFilters["contractType"] : undefined,
    status: CONTRACT_STATUS_OPTIONS.some((option) => option.value === status) ? status as SalesContractFilters["status"] : undefined,
    financeCompany: COUNTERPARTY_FILTER_OPTIONS.some((option) => option.value === financeCompany) ? financeCompany as SalesContractFilters["financeCompany"] : undefined,
    source: SOURCE_FILTER_OPTIONS.some((option) => option.value === source) ? source as SalesContractFilters["source"] : undefined,
    nextAction: NEXT_ACTION_FILTER_OPTIONS.some((option) => option.value === nextAction) ? nextAction as SalesContractFilters["nextAction"] : undefined,
    sort: SORT_OPTIONS.some((option) => option.value === sort) ? sort as SalesContractFilters["sort"] : "updated_desc"
  };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
