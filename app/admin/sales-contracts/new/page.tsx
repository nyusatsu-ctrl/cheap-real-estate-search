import Link from "next/link";
import type { Metadata } from "next";
import { AdminShell } from "@/components/AdminShell";
import { SalesContractForm } from "@/components/sales-contracts/SalesContractForm";
import { createSalesContractAction } from "@/app/admin/sales-contracts/actions";
import { requireAdmin } from "@/lib/admin";
import type { SalesContractType, SalesFinanceCompany, SalesVehicleType } from "@/lib/sales-contracts/types";

type NewSalesContractSearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "新規契約登録 | 契約管理システム",
  description: "販売後の顧客、契約、車両、信販、書類、対応履歴を登録します。"
};

export default async function NewSalesContractPage({ searchParams }: { searchParams: NewSalesContractSearchParams }) {
  const params = await searchParams;
  const admin = await requireAdmin(buildCurrentPath(params));
  const sourceSystem = firstParam(params.source_system);
  const error = firstParam(params.error);
  const sourceDefaults = {
    source_system: sourceSystem,
    source_row_key: firstParam(params.source_row_key),
    source_row_number: firstParam(params.source_row_number),
    source_received_at: firstParam(params.source_received_at),
    customer_name: firstParam(params.customer_name),
    phone: firstParam(params.phone),
    email: firstParam(params.email),
    prefecture: firstParam(params.prefecture),
    employer_name: firstParam(params.employer_name),
    desired_vehicle: firstNonEmpty(params.desired_vehicle, params.desired_car, params.model, params.vehicle_model),
    vehicle_type: normalizeVehicleType(firstParam(params.vehicle_type)),
    contract_type: normalizeContractType(firstParam(params.contract_type)),
    finance_company: normalizeFinanceCompany(firstParam(params.finance_company)),
    payment_estimate: firstParam(params.payment_estimate),
    application_amount: firstParam(params.application_amount),
    payment_count: firstParam(params.payment_count),
    initial_payment_amount: firstParam(params.initial_payment_amount),
    monthly_payment: firstParam(params.monthly_payment),
    total_payment_amount: firstParam(params.total_payment_amount),
    status: firstParam(params.status),
    review1: firstParam(params.review1),
    review2: firstParam(params.review2),
    source_memo: firstParam(params.source_memo)
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
      {hasSourceParams ? <SourceImportSummary sourceDefaults={sourceDefaults} /> : null}
      <SalesContractForm mode="create" action={createSalesContractAction} sourceDefaults={sourceDefaults} />
    </AdminShell>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function firstNonEmpty(...values: Array<string | string[] | undefined>) {
  for (const value of values) {
    const text = firstParam(value).trim();
    if (text) return text;
  }
  return "";
}

function SourceImportSummary({
  sourceDefaults
}: {
  sourceDefaults: {
    source_row_number?: string;
    source_received_at?: string;
    desired_vehicle?: string;
    payment_estimate?: string;
    status?: string;
    customer_name?: string;
    phone?: string;
  };
}) {
  return (
    <section className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-black text-emerald-900">自社ローン審査管理から連携しました</p>
          <p className="mt-1 text-sm text-emerald-800">内容を確認し、契約金額や支払条件を補完してから保存してください。自動登録は行いません。</p>
        </div>
      </div>
      <dl className="mt-3 grid gap-2 text-sm md:grid-cols-4">
        <SummaryItem label="申込元" value="自社ローン審査管理" />
        <SummaryItem label="申込管理番号" value={sourceDefaults.source_row_number} />
        <SummaryItem label="受信日時" value={sourceDefaults.source_received_at} />
        <SummaryItem label="希望車種" value={sourceDefaults.desired_vehicle} />
        <SummaryItem label="支払目安" value={sourceDefaults.payment_estimate} />
        <SummaryItem label="元ステータス" value={sourceDefaults.status} />
        <SummaryItem label="顧客名" value={sourceDefaults.customer_name} />
        <SummaryItem label="電話番号" value={sourceDefaults.phone} />
      </dl>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded border border-emerald-100 bg-white/75 px-3 py-2">
      <dt className="text-xs font-bold text-emerald-700">{label}</dt>
      <dd className="mt-1 break-words font-bold text-slate-950">{value || "-"}</dd>
    </div>
  );
}

function buildCurrentPath(params: Awaited<NewSalesContractSearchParams>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (key === "error") return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item) query.append(key, item);
      });
      return;
    }
    if (value) query.set(key, value);
  });
  const queryString = query.toString();
  return queryString ? `/admin/sales-contracts/new?${queryString}` : "/admin/sales-contracts/new";
}

function normalizeVehicleType(value: string): SalesVehicleType | undefined {
  if (value === "car" || value === "車") return "car";
  if (value === "bike" || value === "バイク") return "bike";
  return undefined;
}

function normalizeContractType(value: string): SalesContractType | undefined {
  if (value === "cash" || value === "現金") return "cash";
  if (value === "loan" || value === "ローン") return "loan";
  if (value === "lease" || value === "リース") return "lease";
  return undefined;
}

function normalizeFinanceCompany(value: string): SalesFinanceCompany | undefined {
  if (value === "premium" || value === "プレミアファイナンス") return "premium";
  if (value === "aplus" || value === "アプラス") return "aplus";
  if (value === "ast" || value === "アスト") return "ast";
  return undefined;
}
