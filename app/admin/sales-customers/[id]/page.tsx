import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { SalesContractTable } from "@/components/sales-contracts/SalesContractTable";
import { requireAdmin } from "@/lib/admin";
import { getSalesCustomerContracts } from "@/lib/sales-contracts/data";

type SalesCustomerDetailParams = Promise<{ id: string }>;

export default async function SalesCustomerDetailPage({ params }: { params: SalesCustomerDetailParams }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const result = await getSalesCustomerContracts(id);

  if (result.tableMissing) {
    return (
      <AdminShell email={admin.email}>
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          契約管理テーブルが未作成です。supabase/sales-contracts.sql をSupabase SQL Editorで適用してください。
        </div>
      </AdminShell>
    );
  }

  if (!result.data.customer) notFound();

  return (
    <AdminShell email={admin.email}>
      <div className="mb-5">
        <Link href="/admin/sales-contracts" className="text-sm font-bold text-brand-700">契約台帳へ戻る</Link>
        <h1 className="mt-2 text-2xl font-black text-slate-950">{result.data.customer.name}</h1>
        <p className="mt-1 text-sm text-slate-600">{result.data.customer.address ?? "住所未登録"}</p>
      </div>
      <section className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">基本情報</h2>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <Info label="フリガナ" value={result.data.customer.kana} />
          <Info label="電話番号" value={result.data.customer.phone} />
          <Info label="メール" value={result.data.customer.email} />
          <Info label="職業" value={result.data.customer.occupation} />
          <Info label="勤務先" value={result.data.customer.employer_name} />
          <Info label="勤務先電話" value={result.data.customer.employer_phone} />
        </dl>
      </section>
      <SalesContractTable items={result.data.contracts} />
    </AdminShell>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-bold text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-950">{value || "-"}</dd>
    </div>
  );
}
