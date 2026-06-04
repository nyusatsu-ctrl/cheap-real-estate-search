import Link from "next/link";
import { Calculator, CircleDollarSign } from "lucide-react";
import { submitPartnerQuoteAction } from "@/app/partners/actions";

export default async function PartnerQuotePage({
  searchParams
}: {
  searchParams: Promise<{ submitted?: string; requestId?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/partners/register" className="mb-4 inline-block text-sm font-bold text-brand-700">
        業者登録へ戻る
      </Link>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="inline-flex items-center gap-2 rounded bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
          <Calculator className="h-4 w-4" />
          業者用 見積入力
        </p>
        <h1 className="mt-4 text-2xl font-black text-slate-950">見積もり金額を入力</h1>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          お客様には見積金額と工事概要だけを表示します。手数料と社内メモは運営者管理用です。
        </p>

        {params.submitted ? (
          <div className="mt-5 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            見積もりを受け付けました。運営者が内容を確認します。
          </div>
        ) : null}

        <form action={submitPartnerQuoteAction} className="mt-5 grid gap-4">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            見積依頼ID
            <input name="estimate_request_id" defaultValue={params.requestId ?? "REQ-2026-0001"} required className="rounded border border-slate-300 px-3 py-2 font-normal text-slate-950 focus-ring" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            業者表示名
            <input name="contractor_display_name" placeholder="北日本解体サービス" required className="rounded border border-slate-300 px-3 py-2 font-normal text-slate-950 focus-ring" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            工事概要
            <textarea name="work_summary" rows={4} required placeholder="木造住宅解体、残置物処分、簡易整地" className="rounded border border-slate-300 px-3 py-2 font-normal text-slate-950 focus-ring" />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              見積金額
              <input name="quote_amount_yen" type="number" min={0} required placeholder="1320000" className="rounded border border-slate-300 px-3 py-2 font-normal text-slate-950 focus-ring" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              当サイト手数料率
              <select name="platform_fee_rate" defaultValue="10" className="rounded border border-slate-300 bg-white px-3 py-2 font-normal text-slate-950 focus-ring">
                <option value="5">5%</option>
                <option value="10">10%</option>
                <option value="15">15%</option>
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            社内メモ
            <textarea name="internal_note" rows={3} placeholder="追加工事の可能性、現地確認の必要性など" className="rounded border border-slate-300 px-3 py-2 font-normal text-slate-950 focus-ring" />
          </label>
          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            <CircleDollarSign className="mr-1 inline h-4 w-4 text-brand-700" />
            例: 見積132万円、手数料10%の場合、業者から当サイトへの手数料は13.2万円です。
          </div>
          <div className="flex justify-end">
            <button className="rounded bg-brand-700 px-5 py-3 font-bold text-white focus-ring">見積もりを提出</button>
          </div>
        </form>
      </div>
    </div>
  );
}
