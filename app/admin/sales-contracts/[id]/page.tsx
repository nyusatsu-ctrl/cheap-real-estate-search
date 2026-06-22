import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { ContactHistoryForm } from "@/components/sales-contracts/ContactHistoryForm";
import { DocumentsSection } from "@/components/sales-contracts/DocumentsSection";
import { LeaseMaturityCard } from "@/components/sales-contracts/LeaseMaturityCard";
import { SalesContractDetail } from "@/components/sales-contracts/SalesContractDetail";
import { SalesContractForm } from "@/components/sales-contracts/SalesContractForm";
import {
  addLeaseMaturityHistoryAction,
  upsertLeaseMaturityAction
} from "@/app/admin/sales-lease-maturities/actions";
import {
  addContactHistoryAction,
  addDocumentAction,
  updateSalesContractAction
} from "@/app/admin/sales-contracts/actions";
import { requireAdmin } from "@/lib/admin";
import { getSalesContractDetail } from "@/lib/sales-contracts/data";

type SalesContractDetailParams = Promise<{ id: string }>;
type SalesContractDetailSearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "契約詳細 | 契約管理システム",
  description: "契約台帳の契約詳細、車両、ローン、リース、書類、対応履歴を管理します。"
};

export default async function SalesContractDetailPage({
  params,
  searchParams
}: {
  params: SalesContractDetailParams;
  searchParams: SalesContractDetailSearchParams;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const error = firstParam(query.error);
  const result = await getSalesContractDetail(id);

  if (result.tableMissing) {
    return (
      <AdminShell email={admin.email} systemName="契約管理システム">
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          契約管理テーブルが未作成です。supabase/sales-contracts.sql をSupabase SQL Editorで適用してください。
        </div>
      </AdminShell>
    );
  }

  if (!result.data) notFound();

  return (
    <AdminShell email={admin.email} systemName="契約管理システム">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/sales-contracts" className="text-sm font-bold text-brand-700">契約台帳へ戻る</Link>
          <h1 className="mt-2 text-2xl font-black text-slate-950">契約詳細</h1>
        </div>
      </div>
      {error ? (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div>
      ) : null}
      <div className="space-y-6">
        <SalesContractDetail detail={result.data} />
        {result.data.contract.contract_type === "lease" ? (
          <LeaseMaturityCard detail={result.data} action={upsertLeaseMaturityAction} historyAction={addLeaseMaturityHistoryAction} />
        ) : null}
        <section>
          <h2 className="mb-3 text-xl font-black text-slate-950">編集</h2>
          <SalesContractForm mode="edit" action={updateSalesContractAction} detail={result.data} />
        </section>
        <DocumentsSection detail={result.data} action={addDocumentAction} />
        <ContactHistoryForm detail={result.data} action={addContactHistoryAction} />
      </div>
    </AdminShell>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
