import { notFound } from "next/navigation";
import { DiagnosisV2DetailedForm } from "@/components/diagnoses/v2/DiagnosisV2DetailedForm";
import { getConstructionManagementDiagnosis } from "@/lib/construction-diagnosis-v2/data";
import { canAccessDiagnosisPrecheck } from "@/lib/construction-diagnosis-v2/precheck";
import { CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION } from "@/lib/construction-diagnosis-v2/questions";
import { getInheritedDetailedQuestionIds } from "@/lib/construction-diagnosis-v2/short-questions";

export default async function DiagnosisPrecheckFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const diagnosis = await getConstructionManagementDiagnosis(id);
  if (!diagnosis || diagnosis.diagnosis_version !== CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION || !await canAccessDiagnosisPrecheck(id)) notFound();
  return <div className="bg-slate-50"><DiagnosisV2DetailedForm diagnosisId={diagnosis.id} primaryTrade={diagnosis.primary_trade} publicWorkIntent={diagnosis.public_work_intent} includeSpecialty initialAnswers={diagnosis.precheck_answers} skippedQuestionIds={getInheritedDetailedQuestionIds(diagnosis.quick_answers)} trackProgress initialAnsweredCount={Object.keys(diagnosis.precheck_answers).length} initialSavedAt={diagnosis.last_saved_at} mode="precheck" /></div>;
}
