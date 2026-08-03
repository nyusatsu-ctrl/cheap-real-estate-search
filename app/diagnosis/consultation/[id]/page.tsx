import Link from "next/link";
import { notFound } from "next/navigation";
import { DiagnosisV2ConsultationForm } from "@/components/diagnoses/v2/DiagnosisV2ConsultationForm";
import { getConstructionManagementDiagnosis } from "@/lib/construction-diagnosis-v2/data";
import { CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION, PREVIOUS_CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION } from "@/lib/construction-diagnosis-v2/questions";
import { canAccessDiagnosisV22 } from "@/lib/construction-diagnosis-v2/resume";

export default async function DiagnosisV2ConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const diagnosis = await getConstructionManagementDiagnosis(id);
  if (!diagnosis?.detailed_completed_at) notFound();
  if ([CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION, PREVIOUS_CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION].includes(diagnosis.diagnosis_version) && !await canAccessDiagnosisV22(id)) notFound();

  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href={`/diagnosis/results/${diagnosis.id}`} className="text-sm font-bold text-brand-700">診断結果へ戻る</Link>
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-brand-700">株式会社エコループ</p>
            <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-800">テスト版</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-950">個別相談申込み</h1>
          <p className="mt-3 text-sm leading-7 text-slate-700">診断結果を基に、現在の課題、公共工事参入の可能性、必要な準備、今後90日間の進め方を代表が確認します。</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Info label="会社名" value={diagnosis.company_name} />
            <Info label="回答者" value={diagnosis.respondent_name} />
            <Info label="電話番号" value={diagnosis.phone} />
            <Info label="メールアドレス" value={diagnosis.email} />
          </dl>
        </div>
        <div className="mt-5">
          {diagnosis.consultation_requested ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
              <h2 className="text-lg font-black text-emerald-950">個別相談は申込み済みです</h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-emerald-900">株式会社エコループからの日程確認連絡をお待ちください。</p>
            </div>
          ) : (
            <DiagnosisV2ConsultationForm diagnosisId={diagnosis.id} />
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="mt-1 font-semibold text-slate-950">{value}</dd></div>;
}
