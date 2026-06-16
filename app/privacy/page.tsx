import type { Metadata } from "next";
import { BUSINESS_INFO } from "@/lib/legal";

export const metadata: Metadata = {
  title: `プライバシーポリシー | ${BUSINESS_INFO.serviceName}`,
  description: `${BUSINESS_INFO.serviceName}のプライバシーポリシーです。`
};

const sections = [
  {
    title: "1. 取得する情報",
    items: [
      "氏名、メールアドレス、電話番号、会社名、問い合わせ内容など、利用者が入力した情報",
      "ログイン、閲覧、検索、保存、通知設定、問い合わせ等の利用履歴",
      "決済に必要な情報。ただし、クレジットカード番号等は決済代行サービスが管理し、当社はカード番号全体を保存しません。",
      "端末情報、ブラウザ情報、IPアドレス、Cookieその他の識別子、アクセスログ"
    ]
  },
  {
    title: "2. 利用目的",
    items: [
      "会員登録、本人確認、ログイン、サービス提供、料金請求、決済処理のため",
      "物件検索、検討リスト、通知、問い合わせ対応などの機能提供のため",
      "重要なお知らせ、規約変更、障害、メンテナンス、請求に関する連絡のため",
      "サービス改善、不正利用防止、安全管理、利用状況分析のため",
      "法令に基づく対応、紛争対応、権利保全のため"
    ]
  },
  {
    title: "3. 第三者提供",
    items: [
      "当社は、法令に基づく場合、利用者の同意がある場合、生命・身体・財産の保護に必要な場合を除き、個人情報を第三者に提供しません。",
      "決済、認証、データ保管、配信、問い合わせ対応など、サービス運営に必要な範囲で外部委託先に情報を取り扱わせることがあります。"
    ]
  },
  {
    title: "4. 外部サービス利用",
    items: [
      "当サービスでは、ホスティング、データベース、認証、決済、メール配信、アクセス解析等の外部サービスを利用する場合があります。",
      "外部サービスの利用に伴い、必要な範囲で利用者情報が各サービス提供者に送信・保存される場合があります。"
    ]
  },
  {
    title: "5. Cookie等",
    items: [
      "当サービスでは、ログイン状態の維持、セキュリティ、利便性向上、利用状況の把握のためCookie等を使用することがあります。",
      "ブラウザ設定によりCookieを無効化できますが、一部機能が利用できなくなる場合があります。"
    ]
  },
  {
    title: "6. 安全管理",
    items: [
      "当社は、個人情報への不正アクセス、紛失、改ざん、漏えいを防ぐため、必要かつ適切な安全管理措置を講じます。",
      "外部委託先に個人情報を取り扱わせる場合は、必要な監督を行います。"
    ]
  },
  {
    title: "7. 開示・訂正・削除等の請求",
    items: [
      "利用者は、法令に基づき、当社が保有する自己の個人情報について、開示、訂正、追加、削除、利用停止等を請求できます。",
      "請求を受けた場合、本人確認のうえ、法令に従って対応します。"
    ]
  },
  {
    title: "8. 問い合わせ窓口",
    items: [
      `個人情報の取り扱いに関するお問い合わせは、${BUSINESS_INFO.companyName}（電話 ${BUSINESS_INFO.phone}、営業時間 ${BUSINESS_INFO.businessHours}）までご連絡ください。`
    ]
  }
];

export default function PrivacyPage() {
  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-brand-700">{BUSINESS_INFO.serviceName}</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">プライバシーポリシー</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {BUSINESS_INFO.companyName}は、利用者の個人情報を適切に取り扱うため、以下の方針を定めます。
          </p>
          <div className="mt-8 space-y-7">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-black text-slate-950">{section.title}</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
