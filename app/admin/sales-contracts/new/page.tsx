import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell } from "@/components/AdminShell";
import { SalesContractForm } from "@/components/sales-contracts/SalesContractForm";
import { createSalesContractAction } from "@/app/admin/sales-contracts/actions";
import { requireAdmin } from "@/lib/admin";

type NewSalesContractSearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "新規契約登録 | 契約管理システム",
  description: "販売後の顧客、契約、車両、信販、書類、対応履歴を登録します。"
};

export default async function NewSalesContractPage({ searchParams }: { searchParams: NewSalesContractSearchParams }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const error = firstParam(params.error);
  const sourceDefaults = {
    source_system: firstParam(params.source_system),
    source_row_key: firstParam(params.source_row_key),
    source_row_number: firstParam(params.source_row_number),
    source_received_at: firstParam(params.source_received_at)
  };
  const hasSourceParams = Object.values(sourceDefaults).some(Boolean);

  return (
    <AdminShell email={admin.email} systemName="契約管理システム">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/sales-contracts" className="text-sm font-bold text-brand-700">契約台帳へ戻る</Link>
          <h1 className="mt-2 text-2xl font-black text-slate-950">新規契約登録</h1>
          <p className="mt-1 text-sm text-slate-600">販売後の顧客・契約・車両・信販・書類・対応履歴を登録します。</p>
        </div>
      </div>
      {error ? (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div>
      ) : null}
      {hasSourceParams ? (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          申込参照パラメータを受け取りました。GAS側の自動コピーは未実装のため、必要な顧客情報は手入力してください。
        </div>
      ) : null}
      <SalesContractForm mode="create" action={createSalesContractAction} sourceDefaults={sourceDefaults} />
    </AdminShell>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
