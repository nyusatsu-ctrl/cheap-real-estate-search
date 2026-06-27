import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2, CreditCard } from "lucide-react";
import { createTenderBankTransferRequestAction } from "@/app/tenders/billing/bank-transfer/actions";
import { formatDate } from "@/lib/format";
import { getCurrentTenderBankTransferRequests, TENDER_BANK_TRANSFER_STATUS_LABELS } from "@/lib/tender-bank-transfer";
import { requireTenderMemberAccess } from "@/lib/tender-access";
import { TENDER_MONTHLY_PRICE_TEXT } from "@/lib/tender-billing";
import { tenderMetadata } from "@/lib/tender-metadata";

export const metadata: Metadata = tenderMetadata(
  "銀行振込申込み｜官公庁案件サーチ",
  "官公庁案件サーチの銀行振込申込みフォームです。入金確認後に管理者が利用権限を付与します。"
);

export default async function TenderBankTransferPage({
  searchParams
}: {
  searchParams: Promise<{ submitted?: string; error?: string }>;
}) {
  const params = await searchParams;
  const access = await requireTenderMemberAccess();
  if (!access) redirect("/tenders/login?next=/tenders/billing/bank-transfer");
  const { requests, error } = await getCurrentTenderBankTransferRequests(access.userId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/tenders/billing" className="mb-4 inline-block text-sm font-bold text-brand-700">
        契約状況へ戻る
      </Link>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="inline-flex items-center gap-2 rounded bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
          <Building2 className="h-4 w-4" />
          銀行振込で申し込む
        </p>
        <h1 className="mt-4 text-2xl font-black text-slate-950">請求書払い・銀行振込での利用申込み</h1>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          カード決済は{TENDER_MONTHLY_PRICE_TEXT}の毎月自動更新です。クレジットカードをお持ちでない方、または法人名義で銀行振込をご希望の方は、銀行振込でのお申し込みも可能です。
          銀行振込は自動更新ではなく、入金確認後に管理者が利用権限を付与します。継続利用の場合は期限前に再度ご案内します。
        </p>

        <div className="mt-5 rounded border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-950">
          <CreditCard className="mr-1 inline h-4 w-4" />
          すぐに利用を開始したい場合はカード決済が本線です。銀行振込は請求内容確認と入金確認後の手動対応になります。
        </div>

        {params.submitted ? (
          <div className="mt-5 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
            銀行振込でのお申し込みを受け付けました。請求内容の確認後、入金確認をもって利用権限を付与します。
          </div>
        ) : null}
        {params.error ? (
          <div className="mt-5 rounded border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
            {decodeURIComponent(params.error)}
          </div>
        ) : null}

        <form action={createTenderBankTransferRequestAction} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            会社名または屋号
            <input name="company_name" required className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            担当者名
            <input name="contact_name" required className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            メールアドレス
            <input name="email" type="email" required defaultValue={access.email} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            電話番号
            <input name="phone" required className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            請求書宛名
            <input name="invoice_name" required className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            希望開始日
            <input name="desired_start_date" type="date" className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">
            備考
            <textarea name="notes" rows={4} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
          </label>
          <button className="rounded bg-brand-700 px-5 py-3 font-bold text-white focus-ring md:justify-self-start">
            銀行振込で申し込む
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-black text-slate-950">申込み履歴</h2>
        {error ? (
          <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>
        ) : requests.length ? (
          <div className="mt-4 overflow-hidden rounded border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-3 py-3">申込日</th>
                  <th className="px-3 py-3">会社名</th>
                  <th className="px-3 py-3">状態</th>
                  <th className="px-3 py-3">利用期限</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-3 py-3 text-slate-700">{formatDate(request.created_at)}</td>
                    <td className="px-3 py-3 font-semibold text-slate-950">{request.company_name}</td>
                    <td className="px-3 py-3 text-slate-700">{TENDER_BANK_TRANSFER_STATUS_LABELS[request.status]}</td>
                    <td className="px-3 py-3 text-slate-700">{formatDate(request.activated_until)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">銀行振込の申込み履歴はまだありません。</p>
        )}
      </div>
    </div>
  );
}
