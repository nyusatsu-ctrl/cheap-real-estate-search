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
import type {
  SalesLeaseMaturityFilters,
  SalesLeaseMaturityQuickFilter,
  SalesLeaseMaturitySummary
} from "@/lib/sales-contracts/types";

type LeaseMaturitiesSearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "リース満期 | 契約管理システム",
  description: "登録済みのリース満期予定、顧客選択、残価、追加精算金、次回連絡予定を管理します。"
};

const QUICK_FILTER_OPTIONS: Array<{ value: SalesLeaseMaturityQuickFilter | ""; label: string; summaryKey?: keyof SalesLeaseMaturitySummary }> = [
  { value: "", label: "すべて" },
  { value: "overdue", label: "期限切れ", summaryKey: "overdue" },
  { value: "this_month", label: "今月満期", summaryKey: "thisMonth" },
  { value: "next_month", label: "来月満期", summaryKey: "nextMonth" },
  { value: "within_30_days", label: "30日以内", summaryKey: "within30Days" },
  { value: "waiting_response", label: "回答待ち", summaryKey: "waitingResponse" },
  { value: "contact_overdue", label: "次回連絡期限切れ", summaryKey: "contactOverdue" }
];

export default async function SalesLeaseMaturitiesPage({ searchParams }: { searchParams: LeaseMaturitiesSearchParams }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const filters = getFilters(params);
  const result = await getSalesLeaseMaturityList(filters);
  const { items, summary } = result.data;
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

      <SummaryCards summary={summary} />
      <QuickFilterNav filters={filters} summary={summary} />

      <form className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {filters.quickFilter ? <input type="hidden" name="quick_filter" value={filters.quickFilter} /> : null}
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

      <LeaseMaturityTable items={items} />
    </AdminShell>
  );
}

function getFilters(params: Record<string, string | string[] | undefined>): SalesLeaseMaturityFilters {
  const maturityMonth = firstParam(params.maturity_month);
  const leaseCompany = firstParam(params.lease_company);
  const maturityStatus = firstParam(params.maturity_status);
  const customerChoice = firstParam(params.customer_choice);
  const quickFilter = firstParam(params.quick_filter);
  return {
    maturityMonth: /^\d{4}-\d{2}$/.test(maturityMonth) ? maturityMonth : undefined,
    leaseCompany: LEASE_COMPANY_OPTIONS.some((option) => option.value === leaseCompany) ? leaseCompany as SalesLeaseMaturityFilters["leaseCompany"] : undefined,
    maturityStatus: LEASE_MATURITY_STATUS_OPTIONS.some((option) => option.value === maturityStatus) ? maturityStatus as SalesLeaseMaturityFilters["maturityStatus"] : undefined,
    customerChoice: LEASE_MATURITY_CHOICE_OPTIONS.some((option) => option.value === customerChoice) ? customerChoice as SalesLeaseMaturityFilters["customerChoice"] : undefined,
    quickFilter: QUICK_FILTER_OPTIONS.some((option) => option.value === quickFilter) && quickFilter ? quickFilter as SalesLeaseMaturityQuickFilter : undefined
  };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function SummaryCards({ summary }: { summary: SalesLeaseMaturitySummary }) {
  const cards = [
    { label: "全件数", value: summary.total, className: "border-slate-200 bg-white text-slate-950" },
    { label: "期限切れ", value: summary.overdue, className: "border-red-200 bg-red-50 text-red-800" },
    { label: "今月満期", value: summary.thisMonth, className: "border-amber-200 bg-amber-50 text-amber-800" },
    { label: "来月満期", value: summary.nextMonth, className: "border-sky-200 bg-sky-50 text-sky-800" },
    { label: "回答待ち", value: summary.waitingResponse, className: "border-violet-200 bg-violet-50 text-violet-800" },
    { label: "次回連絡期限切れ", value: summary.contactOverdue, className: "border-rose-200 bg-rose-50 text-rose-800" }
  ];

  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-lg border px-4 py-3 shadow-sm ${card.className}`}>
          <p className="text-xs font-bold">{card.label}</p>
          <p className="mt-1 text-2xl font-black tabular-nums">{card.value.toLocaleString("ja-JP")}</p>
        </div>
      ))}
    </div>
  );
}

function QuickFilterNav({ filters, summary }: { filters: SalesLeaseMaturityFilters; summary: SalesLeaseMaturitySummary }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {QUICK_FILTER_OPTIONS.map((option) => {
        const active = (filters.quickFilter ?? "") === option.value;
        const count = option.summaryKey ? summary[option.summaryKey] : summary.total;
        return (
          <Link
            key={option.value || "all"}
            href={buildQuickFilterHref(filters, option.value)}
            className={`rounded-full border px-3 py-2 text-sm font-bold focus-ring ${
              active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {option.label}
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
              {count.toLocaleString("ja-JP")}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function buildQuickFilterHref(filters: SalesLeaseMaturityFilters, quickFilter: SalesLeaseMaturityQuickFilter | "") {
  const params = new URLSearchParams();
  if (filters.maturityMonth) params.set("maturity_month", filters.maturityMonth);
  if (filters.leaseCompany) params.set("lease_company", filters.leaseCompany);
  if (filters.maturityStatus) params.set("maturity_status", filters.maturityStatus);
  if (filters.customerChoice) params.set("customer_choice", filters.customerChoice);
  if (quickFilter) params.set("quick_filter", quickFilter);
  const query = params.toString();
  return query ? `/admin/sales-lease-maturities?${query}` : "/admin/sales-lease-maturities";
}
