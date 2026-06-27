import type { Metadata } from "next";
import { tenderMetadata } from "@/lib/tender-metadata";
import { TENDER_LEGAL_INFO } from "@/lib/tender-legal";

export const metadata: Metadata = tenderMetadata(
  `特定商取引法に基づく表記｜${TENDER_LEGAL_INFO.serviceName}`,
  `${TENDER_LEGAL_INFO.serviceName}の特定商取引法に基づく表記です。`
);

const rows = [
  ["販売事業者", TENDER_LEGAL_INFO.companyName],
  ["代表者", TENDER_LEGAL_INFO.representative],
  ["所在地", TENDER_LEGAL_INFO.address],
  ["電話番号", TENDER_LEGAL_INFO.phone],
  ["営業時間", TENDER_LEGAL_INFO.businessHours],
  ["休業日", TENDER_LEGAL_INFO.holidays],
  ["サービス名", TENDER_LEGAL_INFO.serviceName],
  ["販売価格", TENDER_LEGAL_INFO.monthlyPriceText],
  ["無料期間", `${TENDER_LEGAL_INFO.trialDaysText}。${TENDER_LEGAL_INFO.trialBillingNote}`],
  ["支払方法", TENDER_LEGAL_INFO.paymentMethod],
  ["支払時期", TENDER_LEGAL_INFO.paymentTiming],
  ["サービス提供時期", TENDER_LEGAL_INFO.serviceAvailability],
  ["解約方法", TENDER_LEGAL_INFO.cancellationMethod],
  ["返金方針", TENDER_LEGAL_INFO.refundPolicy],
  ["追加料金", "サービス利用料以外の追加料金はありません。ただし、通信料、インターネット接続料、公告元への問い合わせや入札参加に伴う費用は利用者負担です。"]
];

export default function TenderLegalPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-bold text-brand-700">{TENDER_LEGAL_INFO.serviceName}</p>
      <h1 className="mt-2 text-3xl font-black text-slate-950">特定商取引法に基づく表記</h1>
      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <dl className="divide-y divide-slate-200">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-2 p-4 md:grid-cols-[180px_1fr]">
              <dt className="text-sm font-bold text-slate-500">{label}</dt>
              <dd className="text-sm leading-6 text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
