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
    desired_vehicle: firstParam(params.desired_vehicle),
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
      {hasSourceParams ? (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          自社ローン審査管理から初期値を受け取りました。内容を確認し、必要な契約条件を補完してから保存してください。
        </div>
      ) : null}
      <SalesContractForm mode="create" action={createSalesContractAction} sourceDefaults={sourceDefaults} />
    </AdminShell>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
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
