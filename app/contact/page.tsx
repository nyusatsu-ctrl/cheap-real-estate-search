import type { Metadata } from "next";
import { BUSINESS_INFO } from "@/lib/legal";

export const metadata: Metadata = {
  title: `お問い合わせ | ${BUSINESS_INFO.serviceName}`,
  description: `${BUSINESS_INFO.serviceName}へのお問い合わせ窓口です。`
};

export default function ContactPage() {
  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-brand-700">{BUSINESS_INFO.serviceName}</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">お問い合わせ</h1>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            サービス内容、登録、料金、解約、物件情報の表示に関するお問い合わせは、下記窓口までご連絡ください。
          </p>

          <dl className="mt-6 overflow-hidden rounded border border-slate-200">
            <div className="grid border-b border-slate-200 md:grid-cols-[10rem_1fr]">
              <dt className="bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">事業者</dt>
              <dd className="px-4 py-3 text-sm text-slate-900">{BUSINESS_INFO.companyName}</dd>
            </div>
            <div className="grid border-b border-slate-200 md:grid-cols-[10rem_1fr]">
              <dt className="bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">電話番号</dt>
              <dd className="px-4 py-3 text-sm text-slate-900">{BUSINESS_INFO.phone}</dd>
            </div>
            <div className="grid md:grid-cols-[10rem_1fr]">
              <dt className="bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">受付時間</dt>
              <dd className="px-4 py-3 text-sm text-slate-900">{BUSINESS_INFO.businessHours}</dd>
            </div>
          </dl>

          <div className="mt-6 rounded border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
            物件の申込、購入、価格交渉、現地確認、契約条件については、当サービスでは回答できません。必ず掲載元ページから掲載元へ直接お問い合わせください。
          </div>
        </div>
      </div>
    </div>
  );
}
