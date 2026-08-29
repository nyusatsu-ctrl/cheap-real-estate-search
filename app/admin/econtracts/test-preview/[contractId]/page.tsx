import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { EcontractDocument } from "@/components/econtracts/EcontractDocument";
import { requireAdmin } from "@/lib/admin";
import { isEcontractFeatureEnabled } from "@/lib/econtracts/server";
import { loadEcontractTestPreview } from "@/lib/econtracts/test-preview";
import { FINANCE_COMPANY_LABELS, VEHICLE_TYPE_LABELS } from "@/lib/sales-contracts/rules";

type TestPreviewParams = Promise<{ contractId: string }>;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "電子契約テストプレビュー | 契約管理システム",
  description: "管理者専用の電子契約テストプレビューです。契約締結や証跡作成は行いません。",
  robots: { index: false, follow: false }
};

export default async function EcontractTestPreviewPage({ params }: { params: TestPreviewParams }) {
  const { contractId } = await params;
  const admin = await requireAdmin(`/admin/econtracts/test-preview/${contractId}`);
  if (!isEcontractFeatureEnabled()) notFound();
  const preview = await loadEcontractTestPreview(contractId);

  return (
    <AdminShell email={admin.email} systemName="契約管理システム">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-lg border-2 border-violet-500 bg-violet-50 p-5 shadow-sm" role="status">
          <p className="text-sm font-black text-violet-700">管理者専用</p>
          <h1 className="mt-1 text-2xl font-black text-violet-950">テストプレビュー・契約は成立しません</h1>
          <p className="mt-2 text-sm font-bold leading-6 text-violet-900">
            この画面では契約内容と重要事項だけを確認できます。OTPの発行、署名、契約成立、正式契約レコードや証跡の作成はできません。
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-teal-700">電子契約内容の確認</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">{preview.document.title}</h2>
          </div>
          <Link href={`/admin/sales-contracts/${contractId}#econtracts`} className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 focus-ring">
            契約詳細へ戻る
          </Link>
        </div>

        <dl className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <PreviewInfo label="申込者" value={`${preview.customer.name} 様`} />
          <PreviewInfo label="車両区分" value={VEHICLE_TYPE_LABELS[preview.terms.vehicleType]} />
          <PreviewInfo label="希望車種" value={preview.terms.desiredVehicle || "未登録"} />
          <PreviewInfo label="信販会社" value={FINANCE_COMPANY_LABELS[preview.terms.financeCompany]} />
        </dl>

        <section aria-labelledby="test-important-items" className="rounded-lg border border-amber-300 bg-amber-50 p-5 shadow-sm sm:p-6">
          <p className="text-sm font-black text-amber-800">実際の顧客画面と同じ9項目</p>
          <h2 id="test-important-items" className="mt-1 text-xl font-black text-amber-950">重要事項</h2>
          <ol className="mt-4 grid gap-3">
            {preview.document.importantItems.map((item, index) => (
              <li key={item.id} className="flex gap-3 rounded border border-amber-200 bg-white p-4 text-sm font-bold leading-6 text-slate-800">
                <span aria-hidden="true" className="mt-0.5 text-lg font-black text-amber-700">□</span>
                <span><span className="mr-1 font-black text-amber-900">{index + 1}.</span>{item.text}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded bg-amber-100 px-4 py-3 text-sm font-black text-amber-950">確認専用のため、チェック操作はできません。</p>
        </section>

        <EcontractDocument html={preview.document.html} />

        <div className="rounded-lg border-2 border-violet-500 bg-violet-50 p-5 text-center">
          <p className="text-lg font-black text-violet-950">テストプレビュー・契約は成立しません</p>
          <p className="mt-2 text-sm font-bold text-violet-900">OTP送信・署名・契約成立の操作は、この画面にはありません。</p>
        </div>
      </div>
    </AdminShell>
  );
}

function PreviewInfo({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-black text-slate-500">{label}</dt><dd className="mt-1 break-words font-bold text-slate-900">{value}</dd></div>;
}
