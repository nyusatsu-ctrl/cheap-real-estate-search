import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EcontractDocument } from "@/components/econtracts/EcontractDocument";
import { findEcontractByToken, getLatestVerification, getValidAccessSession } from "@/lib/econtracts/server";

type Params = Promise<{ token: string }>;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "契約控え | 株式会社エコループ",
  robots: { index: false, follow: false, noarchive: true, nocache: true }
};

export default async function EcontractPrintPage({ params }: { params: Params }) {
  const { token } = await params;
  const contract = await findEcontractByToken(token);
  if (!contract || contract.status !== "signed") notFound();
  const accessSession = await getValidAccessSession(contract.id, contract.delivery_revision);
  const verification = accessSession
    ? await getLatestVerification(contract.id, contract.delivery_revision, { accessSessionId: accessSession.id })
    : null;
  if (!verification?.verified_at) notFound();

  return (
    <div className="econtract-print-page mx-auto max-w-4xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-5 rounded border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <p className="font-black text-slate-950">契約控え</p>
        <p className="mt-1 text-sm font-semibold text-slate-600">ブラウザの印刷機能（⌘P / Ctrl+P）から印刷、または「PDFとして保存」を選択してください。</p>
      </div>
      <div className="mb-5 grid gap-2 border-b border-slate-300 pb-4 text-sm font-semibold text-slate-700 sm:grid-cols-2">
        <p>株式会社エコループ</p>
        <p>契約管理番号: {contract.management_number}</p>
        <p>契約書version: {contract.document_version}</p>
        <p>署名日時: {formatDateTime(contract.signed_at)}</p>
      </div>
      <EcontractDocument html={contract.document_html_snapshot} />
      <section className="mt-6 break-inside-avoid rounded border border-slate-300 p-5 text-sm">
        <h2 className="text-lg font-black">署名時の重要事項同意</h2>
        <ul className="mt-3 grid gap-2 font-semibold leading-6">
          {contract.consent_snapshot?.items.map((item) => <li key={item.id}>✓ {item.text}</li>)}
        </ul>
        <dl className="mt-5 grid gap-2 sm:grid-cols-2">
          <Evidence label="本人認証" value="メールOTP" />
          <Evidence label="認証先" value={contract.delivery_destination_masked} />
          <Evidence label="本人認証日時" value={formatDateTime(contract.verified_at)} />
          <Evidence label="署名日時" value={formatDateTime(contract.signed_at)} />
        </dl>
        <p className="mt-5 break-all text-xs">本文SHA-256: {contract.document_hash}</p>
        <p className="mt-1 break-all text-xs">証跡SHA-256: {contract.evidence_hash}</p>
      </section>
    </div>
  );
}

function Evidence({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-black text-slate-600">{label}</dt><dd>{value}</dd></div>;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Tokyo" }).format(new Date(value));
}
