import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { EcontractDocument } from "@/components/econtracts/EcontractDocument";
import { requireAdmin } from "@/lib/admin";
import { ECONTRACT_DISABLED_MESSAGE, ECONTRACT_KIND_LABELS, getEcontractStatusClass, getEcontractStatusLabel } from "@/lib/econtracts/rules";
import { getAdminEcontractDetail, isEcontractFeatureEnabled } from "@/lib/econtracts/server";

type Params = Promise<{ id: string }>;

export const metadata: Metadata = { title: "電子契約証跡 | 契約管理システム" };
export const dynamic = "force-dynamic";

export default async function AdminEcontractDetailPage({ params }: { params: Params }) {
  const admin = await requireAdmin();
  if (!isEcontractFeatureEnabled()) {
    return (
      <AdminShell email={admin.email} systemName="契約管理システム">
        <div className="rounded border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800">
          {ECONTRACT_DISABLED_MESSAGE}
        </div>
      </AdminShell>
    );
  }
  const { id } = await params;
  const result = await getAdminEcontractDetail(id);
  const contract = result.contract;
  if (!contract) notFound();

  return (
    <AdminShell email={admin.email} systemName="契約管理システム">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/admin/sales-contracts/${contract.contract_id}#econtracts`} className="text-sm font-black text-brand-700">販売契約詳細へ戻る</Link>
          <h1 className="mt-2 text-2xl font-black text-slate-950">電子契約・証跡</h1>
        </div>
        <span className={`rounded px-3 py-1 text-sm font-black ${getEcontractStatusClass(contract.status)}`}>{getEcontractStatusLabel(contract.status, contract.link_expires_at)}</span>
      </div>

      <section className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Info label="種別" value={ECONTRACT_KIND_LABELS[contract.contract_kind]} />
          <Info label="管理番号" value={contract.management_number} />
          <Info label="version" value={contract.document_version} />
          <Info label="revision" value={String(contract.revision)} />
          <Info label="送信" value={formatDateTime(contract.sent_at)} />
          <Info label="開封" value={formatDateTime(contract.opened_at)} />
          <Info label="氏名確認" value={formatDateTime(contract.identity_confirmed_at)} />
          <Info label="本人認証" value={formatDateTime(contract.verified_at)} />
          <Info label="署名" value={formatDateTime(contract.signed_at)} />
          <Info label="取消" value={formatDateTime(contract.cancelled_at)} />
          <Info label="認証方式" value="メールOTP" />
          <Info label="認証先" value={contract.delivery_destination_masked} />
        </dl>
        {contract.status === "signed" ? <Link href={`/admin/econtracts/${contract.id}/print`} target="_blank" className="mt-4 inline-block rounded bg-emerald-700 px-4 py-2 text-sm font-black text-white focus-ring">契約控えを印刷・PDF保存</Link> : null}
      </section>

      <div className="space-y-5">
        <section><h2 className="mb-3 text-xl font-black text-slate-950">締結時点の契約本文</h2><EcontractDocument html={contract.document_html_snapshot} /><p className="mt-2 break-all text-xs font-semibold text-slate-500">本文SHA-256: {contract.document_hash}</p></section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">個別同意</h2>
          <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-slate-700">{(contract.consent_snapshot?.items ?? contract.important_items_snapshot).map((item) => <li key={item.id} className="rounded bg-slate-50 p-3">{contract.consent_snapshot ? "✓ " : "未署名: "}{item.text}</li>)}</ul>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">署名証跡</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <Info label="署名IP" value={contract.signer_ip ?? "-"} />
            <Info label="user agent" value={contract.signer_user_agent ?? "-"} />
            <Info label="証跡SHA-256" value={contract.evidence_hash ?? "-"} />
            <Info label="取消理由" value={contract.cancelled_reason ?? "-"} />
          </dl>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">操作・認証履歴</h2>
          <ol className="mt-3 grid gap-2">{result.events.map((event) => <li key={event.id} className="rounded border border-slate-200 bg-slate-50 p-3 text-sm"><p className="font-black text-slate-900">{eventLabel(event.event_type)}</p><p className="mt-1 font-semibold text-slate-600">{formatDateTime(event.created_at)} / {event.actor_kind} / IP {event.ip_address ?? "-"}</p></li>)}{result.events.length === 0 ? <li className="text-sm font-semibold text-slate-500">履歴はありません。</li> : null}</ol>
        </section>
      </div>
    </AdminShell>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded bg-slate-50 p-3"><dt className="font-black text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold text-slate-900">{value}</dd></div>; }
function formatDateTime(value: string | null) { if (!value) return "-"; return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Tokyo" }).format(new Date(value)); }
function eventLabel(value: string) { return ({ sent: "送信", resent: "再送", opened: "開封", identity_confirmed: "氏名確認", identity_failed: "氏名確認失敗", otp_sent: "OTP送信", otp_failed: "OTP不一致", otp_expired: "OTP期限切れ", otp_verified: "本人認証完了", signed: "署名完了", cancelled: "取消", delivery_failed: "送信失敗", otp_delivery_failed: "OTP送信失敗" } as Record<string, string>)[value] ?? value; }
