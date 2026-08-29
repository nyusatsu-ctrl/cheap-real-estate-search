import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EcontractDocument } from "@/components/econtracts/EcontractDocument";
import { EcontractSigningForm } from "@/components/econtracts/EcontractSigningForm";
import {
  confirmEcontractIdentityAction,
  sendEcontractOtpAction,
  verifyEcontractOtpAction
} from "@/app/econtracts/[token]/actions";
import { maskCustomerName } from "@/lib/econtracts/crypto";
import {
  getEcontractAvailability,
  getEcontractStatusClass,
  getEcontractStatusLabel
} from "@/lib/econtracts/rules";
import {
  findEcontractByToken,
  getEcontractRequestTime,
  getLatestVerification,
  getRequestEvidence,
  getValidAccessSession,
  insertEcontractEvent,
  requireEcontractServiceClient
} from "@/lib/econtracts/server";

type Params = Promise<{ token: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "電子契約 | 株式会社エコループ",
  description: "株式会社エコループの電子契約確認ページです。",
  robots: { index: false, follow: false, noarchive: true, nocache: true }
};

export default async function EcontractPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { token } = await params;
  const query = await searchParams;
  let econtract = await findEcontractByToken(token);
  if (!econtract) notFound();
  const requestTime = await getEcontractRequestTime();
  const expired = getEcontractAvailability(econtract.status, econtract.link_expires_at, requestTime.getTime()) === "expired";
  const evidence = await getRequestEvidence();

  if (!expired && econtract.status === "sent" && !econtract.opened_at) {
    const now = new Date().toISOString();
    const client = requireEcontractServiceClient();
    const openedResult = await client.from("sales_econtracts").update({ status: "opened", opened_at: now }).eq("id", econtract.id).eq("status", "sent").is("opened_at", null).select("id").maybeSingle();
    if (openedResult.error) throw openedResult.error;
    if (openedResult.data) {
      await insertEcontractEvent({ econtractId: econtract.id, eventType: "opened", actorKind: "customer", evidence });
      econtract = { ...econtract, status: "opened", opened_at: now };
    }
  }

  const accessSession = await getValidAccessSession(econtract.id, econtract.delivery_revision);
  const identityConfirmed = Boolean(accessSession);
  const verification = accessSession
    ? await getLatestVerification(econtract.id, econtract.delivery_revision, { accessSessionId: accessSession.id })
    : null;
  const viewerVerified = Boolean(verification?.verified_at);
  const error = firstParam(query.error);
  const message = firstParam(query.message);
  const completed = firstParam(query.completed) === "1";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-black text-brand-700">株式会社エコループ</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black leading-tight text-slate-950">電子契約の確認</h1>
            <p className="mt-2 text-sm font-semibold text-slate-600">契約管理番号: {econtract.management_number}</p>
          </div>
          <span className={`rounded px-3 py-1 text-sm font-black ${getEcontractStatusClass(econtract.status)}`}>
            {getEcontractStatusLabel(econtract.status, econtract.link_expires_at, requestTime.getTime())}
          </span>
        </div>
      </header>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {message ? <Notice tone="success">{message}</Notice> : null}
      {completed ? <Notice tone="success">電子契約が完了しました。契約控えはこの画面で確認・印刷保存できます。</Notice> : null}

      {expired ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
          <h2 className="text-xl font-black">URLの有効期限が切れています</h2>
          <p className="mt-3 font-semibold leading-7">契約自体に一律の短い失効期限を設けているものではありません。安全のため専用URLだけを失効しています。株式会社エコループへ再送をご依頼ください。</p>
        </section>
      ) : econtract.status === "cancelled" ? (
        <section className="rounded-lg border border-slate-300 bg-slate-100 p-6 text-slate-800 shadow-sm">
          <h2 className="text-xl font-black">この電子契約は取消済みです</h2>
          <p className="mt-3 font-semibold leading-7">詳細は株式会社エコループへお問い合わせください。</p>
        </section>
      ) : !identityConfirmed ? (
        <IdentityGate token={token} maskedName={maskCustomerName(econtract.customer_snapshot.name)} title={econtract.document_title} />
      ) : (
        <div className="space-y-6">
          {econtract.status === "signed" && viewerVerified ? (
            <SignedSummary token={token} title={econtract.document_title} signedAt={econtract.signed_at} documentHash={econtract.document_hash} evidenceHash={econtract.evidence_hash} />
          ) : null}

          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
            <p className="text-sm font-black text-amber-800">重要事項</p>
            <h2 className="mt-1 text-xl font-black text-amber-950">最初に必ずご確認ください</h2>
            <ol className="mt-4 grid gap-3">
              {econtract.important_items_snapshot.map((item, index) => (
                <li key={item.id} className="rounded border border-amber-200 bg-white p-4 text-base font-semibold leading-7 text-slate-800">
                  <span className="mr-2 font-black text-amber-800">{index + 1}.</span>{item.text}
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-black text-slate-950">契約全文</h2>
            <EcontractDocument html={econtract.document_html_snapshot} />
            <p className="mt-2 break-all text-xs font-semibold text-slate-500">本文SHA-256: {econtract.document_hash}</p>
          </section>

          {econtract.status === "signed" && viewerVerified ? (
            <SignedEvidence contract={econtract} />
          ) : viewerVerified ? (
            <EcontractSigningForm token={token} items={econtract.important_items_snapshot} />
          ) : (
            <OtpPanel token={token} destination={econtract.delivery_destination_masked} otpSent={Boolean(verification && !verification.invalidated_at)} />
          )}
        </div>
      )}
    </div>
  );
}

function IdentityGate({ token, maskedName, title }: { token: string; maskedName: string; title: string }) {
  return (
    <section className="rounded-lg border border-sky-200 bg-white p-5 shadow-sm sm:p-7">
      <p className="text-sm font-black text-sky-700">本人確認 1/2</p>
      <h2 className="mt-1 text-2xl font-black text-slate-950">申込時のお名前を確認します</h2>
      <p className="mt-3 font-semibold leading-7 text-slate-700">対象: {maskedName}<br />書類: {title}</p>
      <form action={confirmEcontractIdentityAction} className="mt-6 grid gap-3">
        <input type="hidden" name="token" value={token} />
        <label className="grid gap-2 text-sm font-black text-slate-700">
          申込時の氏名（漢字・カナを含め登録どおり）
          <input name="customer_name" autoComplete="name" required className="rounded border border-slate-300 px-4 py-3 text-lg font-semibold text-slate-950 focus-ring" />
        </label>
        <button className="mt-2 rounded bg-sky-700 px-5 py-3 text-base font-black text-white shadow-sm focus-ring">氏名を確認して契約書を開く</button>
      </form>
      <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">専用URLだけでは署名できません。契約時には登録メールアドレスへ送る認証コードも必要です。</p>
    </section>
  );
}

function OtpPanel({ token, destination, otpSent }: { token: string; destination: string; otpSent: boolean }) {
  return (
    <section className="rounded-lg border border-sky-200 bg-sky-50 p-5 shadow-sm sm:p-6">
      <p className="text-sm font-black text-sky-700">本人確認 2/2</p>
      <h2 className="mt-1 text-xl font-black text-sky-950">メール認証</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-sky-900">認証先: {destination}（有効時間10分、入力は5回まで）</p>
      <form action={sendEcontractOtpAction} className="mt-4">
        <input type="hidden" name="token" value={token} />
        <button className="w-full rounded border border-sky-300 bg-white px-5 py-3 text-base font-black text-sky-800 shadow-sm focus-ring">
          {otpSent ? "新しい認証コードを再送する" : "認証コードをメールで受け取る"}
        </button>
      </form>
      <form action={verifyEcontractOtpAction} className="mt-5 grid gap-3 border-t border-sky-200 pt-5">
        <input type="hidden" name="token" value={token} />
        <label className="grid gap-2 text-sm font-black text-sky-950">
          6桁の認証コード
          <input name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9０-９]{6}" maxLength={6} required className="rounded border border-sky-300 bg-white px-4 py-3 text-center text-2xl font-black tracking-[0.3em] text-slate-950 focus-ring" />
        </label>
        <button className="rounded bg-sky-700 px-5 py-3 text-base font-black text-white shadow-sm focus-ring">本人確認を完了する</button>
      </form>
    </section>
  );
}

function SignedSummary({ token, title, signedAt, documentHash, evidenceHash }: { token: string; title: string; signedAt: string | null; documentHash: string; evidenceHash: string | null }) {
  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-emerald-950 shadow-sm">
      <p className="text-sm font-black text-emerald-700">締結完了</p>
      <h2 className="mt-1 text-2xl font-black">{title}</h2>
      <p className="mt-3 font-semibold leading-7">署名日時: {formatDateTime(signedAt)}<br />契約本文と同意結果は締結時点の内容で固定保存されています。</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/econtracts/${token}/print`} target="_blank" className="rounded bg-emerald-700 px-4 py-3 text-sm font-black text-white shadow-sm focus-ring">契約控えを印刷・PDF保存</Link>
      </div>
      <p className="mt-4 break-all text-xs font-semibold text-emerald-900">本文hash: {documentHash}<br />証跡hash: {evidenceHash ?? "-"}</p>
    </section>
  );
}

function SignedEvidence({ contract }: { contract: NonNullable<Awaited<ReturnType<typeof findEcontractByToken>>> }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-black text-slate-950">契約証跡</h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <EvidenceItem label="契約管理番号" value={contract.management_number} />
        <EvidenceItem label="契約書version" value={contract.document_version} />
        <EvidenceItem label="送信日時" value={formatDateTime(contract.sent_at)} />
        <EvidenceItem label="開封日時" value={formatDateTime(contract.opened_at)} />
        <EvidenceItem label="本人認証日時" value={formatDateTime(contract.verified_at)} />
        <EvidenceItem label="署名日時" value={formatDateTime(contract.signed_at)} />
        <EvidenceItem label="本人認証方法" value="メールOTP" />
        <EvidenceItem label="認証先" value={contract.delivery_destination_masked} />
      </dl>
      <div className="mt-5">
        <h3 className="text-sm font-black text-slate-950">署名時の個別同意</h3>
        <ul className="mt-2 grid gap-2 text-sm font-semibold leading-6 text-slate-700">
          {contract.consent_snapshot?.items.map((item) => <li key={item.id} className="rounded bg-slate-50 px-3 py-2">✓ {item.text}</li>)}
        </ul>
      </div>
    </section>
  );
}

function EvidenceItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded bg-slate-50 p-3"><dt className="font-black text-slate-600">{label}</dt><dd className="mt-1 break-words font-semibold text-slate-900">{value}</dd></div>;
}

function Notice({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  return <div className={`mb-5 rounded border px-4 py-3 text-sm font-bold ${tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{children}</div>;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Tokyo" }).format(new Date(value));
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
