import type { Metadata } from "next";
import Link from "next/link";
import { DIAGNOSIS_APP_NAME, DIAGNOSIS_OPERATOR } from "@/lib/diagnosis-brand";

export const metadata: Metadata = { title: `利用規約｜${DIAGNOSIS_APP_NAME}`, description: `${DIAGNOSIS_APP_NAME}の利用規約です。` };

const sections = [
  ["サービス内容", "本サービスは、入力された回答を基に、建設会社の経営課題、強み、公共工事への準備状況、今後の行動案を自動的に整理する診断サービスです。"],
  ["診断結果の性質", "診断結果は一般的な参考情報です。回答内容によって結果は変わり、経営改善、売上・利益の増加、入札参加、落札、受注その他の成果を保証しません。"],
  ["専門判断との関係", "本サービスは税務、法務、会計、労務、許認可、行政手続等の専門判断を代替しません。また、行政書士等の独占業務に該当する申請書の作成や代理申請を行うサービスではありません。必要に応じて専門家または関係機関へ確認してください。"],
  ["禁止事項", "虚偽情報の登録、不正アクセス、第三者の権利侵害、サービス運営を妨げる行為を禁止します。"],
  ["変更・停止", "保守、障害、法令対応等により、本サービスの内容を変更または一時停止する場合があります。"],
  ["責任の範囲", "株式会社エコループは、故意または重過失がある場合を除き、利用者が診断結果を基に行った判断によって生じた損害について、法令で認められる範囲で責任を負いません。"]
];

export default function DiagnosisTermsPage() {
  return <main className="bg-slate-50"><div className="mx-auto max-w-4xl px-4 py-8"><article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold text-brand-700">{DIAGNOSIS_APP_NAME}</p><h1 className="mt-2 text-3xl font-black text-slate-950">利用規約</h1><div className="mt-8 space-y-7">{sections.map(([heading, body]) => <section key={heading}><h2 className="text-lg font-black text-slate-950">{heading}</h2><p className="mt-2 text-sm leading-7 text-slate-700">{body}</p></section>)}</div><section className="mt-7"><h2 className="text-lg font-black text-slate-950">運営者・問い合わせ先</h2><p className="mt-2 text-sm leading-7 text-slate-700">{DIAGNOSIS_OPERATOR.companyName}<br />代表者: {DIAGNOSIS_OPERATOR.representative}<br />{DIAGNOSIS_OPERATOR.address}<br />電話: {DIAGNOSIS_OPERATOR.phone}（{DIAGNOSIS_OPERATOR.businessHours}）</p></section><p className="mt-8 text-xs text-slate-500">制定日: 2026年8月3日</p><Link href="/diagnosis" className="mt-6 inline-flex font-bold text-brand-700">診断へ戻る</Link></article></div></main>;
}
