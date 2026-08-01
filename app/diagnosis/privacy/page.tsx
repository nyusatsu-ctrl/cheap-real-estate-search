import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー｜建設会社向け 経営診断・再成長戦略",
  description: "株式会社エコループが提供する建設会社向け経営診断のプライバシーポリシーです。"
};

const sections = [
  ["1. 取得する情報", "会社名、回答者名、メールアドレス、電話番号、診断回答、相談内容、端末・ブラウザ情報、利用履歴を取得する場合があります。"],
  ["2. 利用目的", "診断結果の保存、途中からの再開、診断内容の確認、相談対応、サービス改善、不正利用防止のために利用します。"],
  ["3. 第三者提供", "法令に基づく場合または本人の同意がある場合を除き、個人情報を第三者へ提供しません。サービス運営に必要な範囲で委託先へ取り扱わせる場合があります。"],
  ["4. 安全管理", "不正アクセス、紛失、改ざん、漏えいを防ぐため、必要かつ適切な安全管理措置を講じます。"],
  ["5. 開示・訂正・削除", "法令に基づく開示、訂正、削除、利用停止等の請求には、本人確認のうえ対応します。"],
  ["6. 問い合わせ窓口", "個人情報の取り扱いに関するお問い合わせは、株式会社エコループまでご連絡ください。"]
];

export default function DiagnosisPrivacyPage() {
  return <div className="bg-slate-50"><main className="mx-auto max-w-4xl px-4 py-8"><div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold text-brand-700">建設会社向け 経営診断・再成長戦略</p><h1 className="mt-2 text-3xl font-black text-slate-950">プライバシーポリシー</h1><p className="mt-3 text-sm leading-7 text-slate-600">株式会社エコループは、診断利用者の個人情報を以下の方針に従って取り扱います。</p><div className="mt-8 space-y-7">{sections.map(([heading, body]) => <section key={heading}><h2 className="text-lg font-black text-slate-950">{heading}</h2><p className="mt-2 text-sm leading-7 text-slate-700">{body}</p></section>)}</div></div></main></div>;
}
