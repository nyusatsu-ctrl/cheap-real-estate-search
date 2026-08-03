import type { Metadata } from "next";
import Link from "next/link";
import { DIAGNOSIS_APP_NAME, DIAGNOSIS_OPERATOR } from "@/lib/diagnosis-brand";

export const metadata: Metadata = { title: `プライバシーポリシー｜${DIAGNOSIS_APP_NAME}`, description: `${DIAGNOSIS_APP_NAME}のプライバシーポリシーです。` };

const sections = [
  ["取得する情報", "診断回答、会社名、氏名、メールアドレス、電話番号、相談内容、端末・ブラウザ区分、利用履歴を、利用者が入力または利用した範囲で取得します。"],
  ["利用目的", "診断結果の提供・保存・途中再開、利用者への連絡、個別相談への対応、サービス改善、不正利用防止のために利用します。"],
  ["利用状況の計測", "Cookie等を用いて、診断の開始・完了、質問への到達、印刷、相談等の利用状況を計測する場合があります。利用状況イベントには回答本文、会社名、氏名、メールアドレス、電話番号を保存しません。"],
  ["第三者提供", "本人の同意なく個人情報を第三者へ販売しません。法令上必要な場合その他法令で認められる場合を除き、本人の同意なく第三者へ提供しません。サービス運営に必要な範囲で委託先へ取り扱わせる場合があります。"],
  ["安全管理", "不正アクセス、紛失、改ざん、漏えいを防ぐため、必要かつ適切な安全管理措置を講じます。"],
  ["開示等の請求", "法令に基づく開示、訂正、削除、利用停止等の請求には、本人確認のうえ対応します。"]
];

export default function DiagnosisPrivacyPage() { return <LegalPage title="プライバシーポリシー" sections={sections} />; }

function LegalPage({ title, sections: items }: { title: string; sections: string[][] }) {
  return <main className="bg-slate-50"><div className="mx-auto max-w-4xl px-4 py-8"><article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold text-brand-700">{DIAGNOSIS_APP_NAME}</p><h1 className="mt-2 text-3xl font-black text-slate-950">{title}</h1><div className="mt-8 space-y-7">{items.map(([heading, body]) => <section key={heading}><h2 className="text-lg font-black text-slate-950">{heading}</h2><p className="mt-2 text-sm leading-7 text-slate-700">{body}</p></section>)}</div><Contact /><p className="mt-8 text-xs text-slate-500">制定日: 2026年8月3日</p><Link href="/diagnosis" className="mt-6 inline-flex font-bold text-brand-700">診断へ戻る</Link></article></div></main>;
}

function Contact() { return <section className="mt-7"><h2 className="text-lg font-black text-slate-950">問い合わせ先</h2><p className="mt-2 text-sm leading-7 text-slate-700">{DIAGNOSIS_OPERATOR.companyName}<br />代表者: {DIAGNOSIS_OPERATOR.representative}<br />{DIAGNOSIS_OPERATOR.address}<br />電話: {DIAGNOSIS_OPERATOR.phone}（{DIAGNOSIS_OPERATOR.businessHours}）</p></section>; }
