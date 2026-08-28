import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EcontractDocument } from "@/components/econtracts/EcontractDocument";
import { requireAdmin } from "@/lib/admin";
import { ECONTRACT_DISABLED_MESSAGE } from "@/lib/econtracts/rules";
import { getAdminEcontractDetail, isEcontractFeatureEnabled } from "@/lib/econtracts/server";

type Params = Promise<{ id: string }>;
export const metadata: Metadata = { title: "電子契約控え | 契約管理システム", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminEcontractPrintPage({ params }: { params: Params }) {
  await requireAdmin();
  if (!isEcontractFeatureEnabled()) {
    return <div className="mx-auto max-w-4xl px-4 py-8 text-sm font-bold text-slate-800">{ECONTRACT_DISABLED_MESSAGE}</div>;
  }
  const { id } = await params;
  const { contract } = await getAdminEcontractDetail(id);
  if (!contract || contract.status !== "signed") notFound();
  return (
    <div className="econtract-print-page mx-auto max-w-4xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-5 rounded border border-slate-200 bg-white p-4 shadow-sm print:hidden"><p className="font-black">ブラウザの印刷機能（⌘P / Ctrl+P）で印刷、または「PDFとして保存」を選択してください。</p></div>
      <div className="mb-5 grid gap-2 border-b border-slate-300 pb-4 text-sm font-semibold sm:grid-cols-2"><p>株式会社エコループ</p><p>契約管理番号: {contract.management_number}</p><p>version: {contract.document_version}</p><p>署名日時: {formatDateTime(contract.signed_at)}</p></div>
      <EcontractDocument html={contract.document_html_snapshot} />
      <section className="mt-6 break-inside-avoid rounded border border-slate-300 p-5 text-sm"><h2 className="text-lg font-black">署名時の重要事項同意</h2><ul className="mt-3 grid gap-2 font-semibold leading-6">{contract.consent_snapshot?.items.map((item) => <li key={item.id}>✓ {item.text}</li>)}</ul><p className="mt-5 break-all text-xs">本文SHA-256: {contract.document_hash}</p><p className="mt-1 break-all text-xs">証跡SHA-256: {contract.evidence_hash}</p></section>
    </div>
  );
}
function formatDateTime(value: string | null) { if (!value) return "-"; return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Tokyo" }).format(new Date(value)); }
