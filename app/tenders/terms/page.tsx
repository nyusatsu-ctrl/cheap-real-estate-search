import type { Metadata } from "next";
import { tenderMetadata } from "@/lib/tender-metadata";
import { TENDER_LEGAL_INFO } from "@/lib/tender-legal";

export const metadata: Metadata = tenderMetadata(
  `利用規約｜${TENDER_LEGAL_INFO.serviceName}`,
  `${TENDER_LEGAL_INFO.serviceName}の利用規約です。`
);

const sections = [
  {
    title: "第1条 適用",
    body: `${TENDER_LEGAL_INFO.serviceName}は、官公庁案件の検索、期限確認、お気に入り、通知条件管理を支援する情報提供サービスです。`
  },
  {
    title: "第2条 掲載情報",
    body: "掲載情報は公式公告・仕様書等を確認するための候補情報です。入札参加前に必ず公式公告、仕様書、参加条件、締切を利用者自身で確認してください。"
  },
  {
    title: "第3条 無料体験",
    body: `${TENDER_LEGAL_INFO.trialDaysText}の無料体験を利用できます。無料期間中はカード登録不要で、無料期間終了後に自動課金されることはありません。`
  },
  {
    title: "第4条 料金と課金",
    body: `有料プランは${TENDER_LEGAL_INFO.monthlyPriceText}です。支払方法は${TENDER_LEGAL_INFO.paymentMethod}です。無料体験中に有料プランへ申し込んだ場合も、無料期間終了後から月額課金が始まり、解約するまで毎月自動更新されます。銀行振込は入金確認後に手動で利用権限を付与します。`
  },
  {
    title: "第5条 利用停止",
    body: "無料期間終了後、有料申込みをしない場合は会員機能の利用を停止します。支払い失敗、解約、利用規約違反がある場合も利用を制限することがあります。"
  },
  {
    title: "第6条 解約",
    body: `${TENDER_LEGAL_INFO.cancellationMethod}解約後は現在の契約期間終了後に有料機能の利用が停止します。`
  },
  {
    title: "第7条 返金",
    body: TENDER_LEGAL_INFO.refundPolicy
  },
  {
    title: "第8条 禁止事項",
    body: "不正アクセス、他ユーザー情報の取得、サービスの複製、過度な自動アクセス、公式公告元への迷惑行為、法令違反を禁止します。"
  },
  {
    title: "第9条 免責",
    body: "当社は案件情報の完全性、正確性、落札可能性、売上増加を保証しません。入札参加、契約、履行に関する判断と責任は利用者に帰属します。"
  }
];

export default function TenderTermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-bold text-brand-700">{TENDER_LEGAL_INFO.serviceName}</p>
      <h1 className="mt-2 text-3xl font-black text-slate-950">利用規約</h1>
      <div className="mt-6 grid gap-4">
        {sections.map((section) => (
          <section key={section.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-black text-slate-950">{section.title}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-700">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
