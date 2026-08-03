import type { Metadata } from "next";
import Link from "next/link";
import { DIAGNOSIS_APP_NAME, DIAGNOSIS_OPERATOR } from "@/lib/diagnosis-brand";

export const metadata: Metadata = { title: `免責事項｜${DIAGNOSIS_APP_NAME}`, description: `${DIAGNOSIS_APP_NAME}の免責事項です。` };

export default function DiagnosisDisclaimerPage() {
  return <main className="bg-slate-50"><div className="mx-auto max-w-4xl px-4 py-8"><article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold text-brand-700">{DIAGNOSIS_APP_NAME}</p><h1 className="mt-2 text-3xl font-black text-slate-950">免責事項</h1><div className="mt-8 space-y-7 text-sm leading-7 text-slate-700"><p>本診断は、入力された回答を基にした自動診断であり、一般的な参考情報を提供するものです。回答内容や会社の個別事情により、実際に必要な対応は異なります。</p><p>経営改善、売上・利益の増加、融資、許認可、入札参加、落札、受注を保証しません。税務、法務、会計、労務、許認可、行政手続等については、税理士、弁護士、社会保険労務士、行政書士その他の専門家または関係機関へ確認してください。</p><p>本サービスは、行政書士等の独占業務に該当する申請書の作成や代理申請を行うものではありません。</p><p>全国約2,000か所以上は、株式会社エコループが、自社の建設会社運営において入札参加資格の取得・管理体制を構築してきた発注機関数の目安です。すべての会社が同じ発注機関へ参加できることや、案件の受注・落札を保証するものではありません。</p></div><section className="mt-7"><h2 className="text-lg font-black text-slate-950">運営者</h2><p className="mt-2 text-sm leading-7 text-slate-700">{DIAGNOSIS_OPERATOR.companyName}<br />代表者: {DIAGNOSIS_OPERATOR.representative}<br />{DIAGNOSIS_OPERATOR.address}<br />電話: {DIAGNOSIS_OPERATOR.phone}</p></section><Link href="/diagnosis" className="mt-6 inline-flex font-bold text-brand-700">診断へ戻る</Link></article></div></main>;
}
