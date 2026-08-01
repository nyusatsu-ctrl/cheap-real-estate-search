import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約｜建設会社向け 経営診断・再成長戦略",
  description: "株式会社エコループが提供する建設会社向け経営診断の利用規約です。"
};

const sections = [
  ["1. サービス内容", "本サービスは、入力された回答をもとに、建設会社の経営課題、強み、公共工事への準備状況、今後の行動案を整理する診断サービスです。"],
  ["2. 診断結果の性質", "診断結果は入力内容に基づく参考情報です。売上や利益の増加、融資、許認可、公共工事への参加・受注その他の成果を保証するものではありません。"],
  ["3. 利用者の責任", "利用者は正確な情報を入力し、税務、法務、労務、許認可、公共工事等の重要な判断について必要に応じて専門家や関係機関へ確認するものとします。"],
  ["4. 禁止事項", "虚偽情報の登録、不正アクセス、サービス運営を妨げる行為、第三者の権利を侵害する行為、法令または公序良俗に反する行為を禁止します。"],
  ["5. サービスの変更・停止", "保守、障害、法令変更その他運営上必要な場合、サービスの全部または一部を変更、停止することがあります。"],
  ["6. 準拠法・管轄", "本規約は日本法に準拠し、本サービスに関する紛争は株式会社エコループの所在地を管轄する裁判所を第一審の合意管轄裁判所とします。"]
];

export default function DiagnosisTermsPage() {
  return <LegalPage title="利用規約" sections={sections} />;
}

function LegalPage({ title, sections: items }: { title: string; sections: string[][] }) {
  return <div className="bg-slate-50"><main className="mx-auto max-w-4xl px-4 py-8"><div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold text-brand-700">建設会社向け 経営診断・再成長戦略</p><h1 className="mt-2 text-3xl font-black text-slate-950">{title}</h1><p className="mt-3 text-sm leading-7 text-slate-600">株式会社エコループが提供する診断サービスの利用条件です。</p><div className="mt-8 space-y-7">{items.map(([heading, body]) => <section key={heading}><h2 className="text-lg font-black text-slate-950">{heading}</h2><p className="mt-2 text-sm leading-7 text-slate-700">{body}</p></section>)}</div></div></main></div>;
}
