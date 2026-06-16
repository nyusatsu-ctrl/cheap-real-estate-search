import type { Metadata } from "next";
import { BUSINESS_INFO } from "@/lib/legal";

export const metadata: Metadata = {
  title: `利用規約 | ${BUSINESS_INFO.serviceName}`,
  description: `${BUSINESS_INFO.serviceName}の利用規約です。`
};

const sections = [
  {
    title: "第1条 サービス内容",
    body: [
      `${BUSINESS_INFO.serviceName}は、全国の0円物件、空き家、古家付き土地、山林、300万円以下の格安不動産などの公開情報を検索・確認しやすくする会員制情報サービスです。`,
      "当サービスは、物件情報の整理、検索、検討管理、元サイトURLへの案内を主な機能とします。"
    ]
  },
  {
    title: "第2条 物件情報の性質",
    body: [
      "掲載情報は当サービスが取得した時点の情報であり、最新性、正確性、完全性、有用性、適法性を保証するものではありません。",
      "物件は成約済み、募集終了、価格変更、条件変更、掲載終了となっている場合があります。利用者は必ず掲載元ページ、売主、不動産会社、自治体、裁判所、国税庁その他の関係機関で最新情報を確認してください。"
    ]
  },
  {
    title: "第3条 不動産取引への関与",
    body: [
      "当サービスは不動産売買、賃貸、交換、譲渡その他の取引について、媒介、代理、仲介、あっせん、鑑定、法務・税務・登記の助言を行うものではありません。",
      "物件の詳細確認、問い合わせ、申込、交渉、契約、支払、登記、引き渡しは、利用者と掲載元または関係者との間で行うものとします。"
    ]
  },
  {
    title: "第4条 利用者の責任",
    body: [
      "現地確認、境界確認、登記確認、権利関係の確認、法令上の制限、建築可否、農地法、都市計画、接道、上下水道、土砂災害・洪水等のハザード、残置物、解体・修繕費用、固定資産税その他の費用確認は利用者の責任で行ってください。",
      "購入、入札、申込、契約その他の判断は、必要に応じて宅地建物取引士、司法書士、弁護士、税理士、建築士、自治体等の専門家・関係機関へ確認したうえで行ってください。"
    ]
  },
  {
    title: "第5条 アカウントと料金",
    body: [
      `無料期間は登録日から${BUSINESS_INFO.trialDaysText}です。無料期間終了後も無料登録のみで自動課金は開始されません。継続利用する場合は、利用者自身が有料プランへ申し込む必要があります。`,
      `有料プランの販売価格は${BUSINESS_INFO.monthlyPriceText}です。支払方法は${BUSINESS_INFO.paymentMethod}です。`
    ]
  },
  {
    title: "第6条 解約",
    body: [
      "有料プランの解約は、会員画面またはお問い合わせ窓口から申請できます。",
      "解約手続き完了後は次回更新分から課金を停止します。既に発生した利用料金の日割り返金は、法令上必要な場合を除き行いません。"
    ]
  },
  {
    title: "第7条 禁止事項",
    body: [
      "不正アクセス、過度なアクセス、リバースエンジニアリング、スクレイピング、当サービスの運営を妨げる行為、第三者の権利を侵害する行為、虚偽情報の登録、法令または公序良俗に反する行為を禁止します。",
      "当サービス上の情報を、掲載元や権利者の許可なく転載、販売、再配布する行為を禁止します。"
    ]
  },
  {
    title: "第8条 免責事項",
    body: [
      "当社は、掲載情報の誤り、遅延、欠落、掲載終了、利用者の取引判断、現地・権利・法令・費用確認の不足、掲載元との紛争、損害、逸失利益について、当社に故意または重過失がある場合を除き責任を負いません。",
      "外部サイトの内容、表示、利用条件、問い合わせ結果、取引条件について、当社は責任を負いません。"
    ]
  },
  {
    title: "第9条 サービス停止・変更",
    body: [
      "当社は、保守、障害、外部サービスの停止、法令・掲載元の方針変更、その他運営上必要な場合に、サービスの全部または一部を変更、停止、中断することがあります。",
      "重要な変更がある場合は、当サービス上で告知します。"
    ]
  },
  {
    title: "第10条 準拠法・管轄",
    body: [
      "本規約は日本法に準拠します。",
      "当サービスに関して紛争が生じた場合、当社所在地を管轄する裁判所を第一審の合意管轄裁判所とします。"
    ]
  }
];

export default function TermsPage() {
  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-brand-700">{BUSINESS_INFO.serviceName}</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">利用規約</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            本規約は、{BUSINESS_INFO.companyName}が提供する{BUSINESS_INFO.serviceName}の利用条件を定めるものです。
          </p>
          <div className="mt-8 space-y-7">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-black text-slate-950">{section.title}</h2>
                <div className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
