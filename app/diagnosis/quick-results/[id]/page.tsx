import Link from "next/link";
import { notFound } from "next/navigation";
import { getConstructionManagementDiagnosis } from "@/lib/construction-diagnosis-v2/data";
import { QUICK_CATEGORY_LABELS, type QuickDiagnosisCategory } from "@/lib/construction-diagnosis-v2/questions";
import { getPrimaryTradeLabel, getPublicWorksScoringMode } from "@/lib/construction-diagnosis-v2/specialty-questions";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default async function DiagnosisV2QuickResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const diagnosis = await getConstructionManagementDiagnosis(id);
  if (!diagnosis?.quick_completed_at) notFound();

  const scoreEntries = Object.entries(diagnosis.quick_scores) as [QuickDiagnosisCategory, number][];
  const publicScore = diagnosis.quick_scores.public_works ?? 0;
  const publicWorksMode = diagnosis.public_work_intent ? getPublicWorksScoringMode(diagnosis.public_work_intent) : "included";
  const message = publicWorksMode === "excluded"
    ? `詳細診断では、${getPrimaryTradeLabel(diagnosis.primary_trade)}のお金、工事の利益、職人、社内の役割を中心に確認します。公共工事に参加していないことは、総合点の弱点にしません。`
    : publicWorksMode === "reference"
      ? `詳細診断では、${getPrimaryTradeLabel(diagnosis.primary_trade)}の経営課題に加え、公共工事体制を参考情報として確認します。公共工事分野は総合点に含めません。`
      : publicScore >= 60
        ? "御社は公共工事への参加先を広げられる可能性があります。詳細診断では、建設業の許可、公共工事に必要な会社の審査、資格を持つ人、工事の費用、社内の役割を確認します。"
        : "現時点では、公共工事の参加先拡大より先に確認すべき経営・体制上の項目がある可能性があります。詳細診断で優先順位を整理できます。";

  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-brand-700">短縮診断結果</p>
            <span className="rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-800">テスト版</span>
          </div>
          <h1 className="mt-2 text-3xl font-black text-slate-950">{diagnosis.company_name}様の現在地</h1>
          <p className="mt-4 max-w-3xl leading-8 text-slate-700">{message}</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {scoreEntries.map(([category, score]) => (
            <section key={category} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-500">{QUICK_CATEGORY_LABELS[category]}</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{score.toFixed(1)}<span className="ml-1 text-sm text-slate-500">点</span></p>
              <div className="mt-3 h-2 overflow-hidden rounded bg-slate-100">
                <div className="h-full rounded bg-brand-700" style={{ width: `${Math.min(100, score)}%` }} />
              </div>
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-lg border border-brand-200 bg-white p-6 shadow-sm">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-brand-700" />
            <div>
              <h2 className="text-xl font-black text-slate-950">詳細診断で確認すること</h2>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                8分野と工事業種ごとの質問から、総合点、強み、先に直すこと、毎月確認する数字、公共工事の準備、90日間に行うことを整理します。回答時間の目安は10～15分です。
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link href={`/diagnosis/details/${diagnosis.id}`} className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 font-black text-white focus-ring">
              詳細診断へ進む
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/construction-sales-diagnosis" className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 focus-ring">
              詳細診断を行わず終了する
            </Link>
          </div>
        </section>

        <p className="mt-6 text-xs font-semibold leading-6 text-slate-500">
          短縮診断は入力内容から今の傾向を整理するものです。売上が増えることや、公共工事に参加・受注できることを保証するものではありません。
        </p>
      </div>
    </div>
  );
}
