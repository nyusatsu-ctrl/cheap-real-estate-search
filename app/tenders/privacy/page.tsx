import type { Metadata } from "next";
import { tenderMetadata } from "@/lib/tender-metadata";
import { TENDER_LEGAL_INFO } from "@/lib/tender-legal";

export const metadata: Metadata = tenderMetadata(
  `プライバシーポリシー｜${TENDER_LEGAL_INFO.serviceName}`,
  `${TENDER_LEGAL_INFO.serviceName}のプライバシーポリシーです。`
);

const sections = [
  {
    title: "取得する情報",
    body: "会員登録情報、ログイン情報、通知条件、お気に入り、閲覧・操作ログ、決済処理に必要な識別子を取得します。Stripeのカード情報を当社サーバーで保持しません。"
  },
  {
    title: "利用目的",
    body: "本人確認、サービス提供、利用期限管理、通知条件との照合、料金請求、問い合わせ対応、品質改善、不正利用防止のために利用します。"
  },
  {
    title: "第三者提供",
    body: "法令に基づく場合を除き、本人の同意なく第三者へ提供しません。決済処理はStripe等の決済事業者を利用します。"
  },
  {
    title: "安全管理",
    body: "認証、RLS、server-onlyのservice role利用、Webhook署名検証などにより、他ユーザーの通知条件や契約情報を取得できないよう管理します。"
  },
  {
    title: "お問い合わせ",
    body: `個人情報の取扱いに関するお問い合わせは、${TENDER_LEGAL_INFO.companyName}までご連絡ください。`
  }
];

export default function TenderPrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-bold text-brand-700">{TENDER_LEGAL_INFO.serviceName}</p>
      <h1 className="mt-2 text-3xl font-black text-slate-950">プライバシーポリシー</h1>
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
