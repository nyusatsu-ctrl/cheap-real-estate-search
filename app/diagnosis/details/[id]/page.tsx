import { notFound } from "next/navigation";
import { DiagnosisV2DetailedForm } from "@/components/diagnoses/v2/DiagnosisV2DetailedForm";
import { getConstructionManagementDiagnosis } from "@/lib/construction-diagnosis-v2/data";
import { CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION, isSpecialtyConstructionDiagnosisVersion } from "@/lib/construction-diagnosis-v2/questions";
import { getAdditionalDetailedQuestions, getInheritedDetailedAnswers, getInheritedDetailedQuestionIds } from "@/lib/construction-diagnosis-v2/short-questions";
import { getDiagnosisV22Session, markDiagnosisV22DetailedStarted } from "@/lib/construction-diagnosis-v2/sessions";
import { canAccessDiagnosisV22, getCurrentDiagnosisResumePath } from "@/lib/construction-diagnosis-v2/resume";

export default async function DiagnosisV2DetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const diagnosis = await getConstructionManagementDiagnosis(id);
  if (!diagnosis?.quick_completed_at) notFound();
  const isV22 = diagnosis.diagnosis_version === CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION;
  if (isV22 && !await canAccessDiagnosisV22(id)) notFound();
  if (isV22) await markDiagnosisV22DetailedStarted(id);
  const session = isV22 ? await getDiagnosisV22Session(id) : null;
  if (isV22 && !session) notFound();
  const inheritedAnswers = getInheritedDetailedAnswers(diagnosis.quick_answers);
  const additionalQuestions = getAdditionalDetailedQuestions(diagnosis.quick_answers, {
    primaryTrade: diagnosis.primary_trade,
    publicWorkIntent: diagnosis.public_work_intent,
    includeSpecialty: true
  });
  const answeredCount = additionalQuestions.filter((question) =>
    question.options.some((option) => option.value === session?.detailed_answers?.[question.id])
  ).length;
  const resumePath = isV22 ? await getCurrentDiagnosisResumePath(id) : null;

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
        initialAnsweredCount={answeredCount}
        initialSavedAt={session?.last_saved_at ?? session?.updated_at ?? null}
        resumePath={resumePath}
      />
    </div>
  );
}
