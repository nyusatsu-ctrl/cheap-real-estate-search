import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DiagnosisPrintControls } from "@/components/diagnoses/v2/DiagnosisPrintControls";
import { DiagnosisV2ResultView } from "@/components/diagnoses/v2/DiagnosisV2ResultView";
import { DiagnosisV23StrategyResultView } from "@/components/diagnoses/v2/DiagnosisV23StrategyResultView";
import { getDiagnosisForPrint } from "@/lib/construction-diagnosis-v2/print";
import { CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION } from "@/lib/construction-diagnosis-v2/questions";
import { DIAGNOSIS_APP_NAME } from "@/lib/diagnosis-brand";

export const metadata: Metadata = {
  title: `診断結果 印刷・PDF保存｜${DIAGNOSIS_APP_NAME}`,
  robots: { index: false, follow: false }
};

export default async function DiagnosisPrintPage() {
  const diagnosis = await getDiagnosisForPrint();
  if (!diagnosis) notFound();
  if (diagnosis.diagnosis_version === CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION) {
    if (!diagnosis.strategy_result) notFound();
    return <div className="diagnosis-print-only-page"><DiagnosisPrintControls /><DiagnosisV23StrategyResultView id={diagnosis.id} result={diagnosis.strategy_result} axisScores={diagnosis.axis_scores} companyName={diagnosis.company_name} email={diagnosis.email} saved printMode /></div>;
  }
  return (
    <div className="diagnosis-print-only-page">
      <DiagnosisPrintControls />
      <DiagnosisV2ResultView diagnosis={diagnosis} printMode />
    </div>
  );
}
