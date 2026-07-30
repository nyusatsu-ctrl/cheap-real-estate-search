import type { Metadata } from "next";
import { BUSINESS_INFO } from "@/lib/legal";

export const metadata: Metadata = {
  title: `特定商取引法に基づく表記 | ${BUSINESS_INFO.serviceName}`,
  description: `${BUSINESS_INFO.serviceName}の特定商取引法に基づく表記です。`
};

const rows = [
  ["事業者名", BUSINESS_INFO.companyName],
  ["代表者", BUSINESS_INFO.representative],
  ["所在地", BUSINESS_INFO.address],
  ["電話番号", BUSINESS_INFO.phone],
  ["営業時間", BUSINESS_INFO.businessHours],
  ["販売価格", BUSINESS_INFO.monthlyPriceText],
  ["無料期間", BUSINESS_INFO.trialDaysText],
  ["支払方法", BUSINESS_INFO.paymentMethod],
  ["サービス提供時期", "登録後14日間はカード登録不要で無料利用できます。有料プランは申込み時に4,980円（税込）が即時決済され、決済完了後に利用できます。以後毎月自動更新されます。"],
  ["解約方法", "会員画面からStripeの契約管理画面を開いて解約できます。解約後も支払済み期間の終了日まで利用でき、次回更新分から課金を停止します。"],
  ["返品・キャンセル", "デジタルサービスの性質上、利用開始後の返品・キャンセル・日割り返金は、法令上必要な場合を除きお受けしていません。"],
  ["動作環境", "インターネット接続環境と、最新版のChrome、Safari、Edge等の主要ブラウザ。"],
  ["追加料金の有無", "サービス利用料以外の追加料金はありません。ただし、通信料、インターネット接続料、掲載元への問い合わせや取引に伴う費用は利用者負担です。"]
];

export default function LegalPage() {
  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-brand-700">{BUSINESS_INFO.serviceName}</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">特定商取引法に基づく表記</h1>
          <div className="mt-8 overflow-hidden rounded border border-slate-200">
            {rows.map(([label, value]) => (
              <div key={label} className="grid border-b border-slate-200 last:border-b-0 md:grid-cols-[14rem_1fr]">
                <dt className="bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">{label}</dt>
                <dd className="px-4 py-3 text-sm leading-7 text-slate-900">{value}</dd>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-slate-500">
            表示内容はサービス公開時点のものです。変更がある場合は本ページで告知します。
          </p>
        </div>
      </div>
    </div>
  );
}
