import { notFound } from "next/navigation";
import { DiagnosisV2DetailedForm } from "@/components/diagnoses/v2/DiagnosisV2DetailedForm";
import { getConstructionManagementDiagnosis } from "@/lib/construction-diagnosis-v2/data";
import { CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION, isSpecialtyConstructionDiagnosisVersion } from "@/lib/construction-diagnosis-v2/questions";
import { getInheritedDetailedAnswers, getInheritedDetailedQuestionIds } from "@/lib/construction-diagnosis-v2/short-questions";
import { getDiagnosisV22Session, markDiagnosisV22DetailedStarted } from "@/lib/construction-diagnosis-v2/sessions";

export default async function DiagnosisV2DetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const diagnosis = await getConstructionManagementDiagnosis(id);
  if (!diagnosis?.quick_completed_at) notFound();
  const isV22 = diagnosis.diagnosis_version === CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION;
  if (isV22) await markDiagnosisV22DetailedStarted(id);
  const session = isV22 ? await getDiagnosisV22Session(id) : null;
  const inheritedAnswers = getInheritedDetailedAnswers(diagnosis.quick_answers);

  return (
    <div className="bg-slate-50">
      <DiagnosisV2DetailedForm
        diagnosisId={diagnosis.id}
        primaryTrade={diagnosis.primary_trade}
        publicWorkIntent={diagnosis.public_work_intent}
        includeSpecialty={isSpecialtyConstructionDiagnosisVersion(diagnosis.diagnosis_version)}
        initialAnswers={{ ...(session?.detailed_answers ?? {}), ...inheritedAnswers }}
        skippedQuestionIds={getInheritedDetailedQuestionIds(diagnosis.quick_answers)}
        trackProgress={isV22}
      />
    </div>
  );
}
