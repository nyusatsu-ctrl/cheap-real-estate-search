import { notFound } from "next/navigation";
import { after } from "next/server";
import { DiagnosisV2DetailedForm } from "@/components/diagnoses/v2/DiagnosisV2DetailedForm";
import { DiagnosisV23StrategyForm } from "@/components/diagnoses/v2/DiagnosisV23StrategyForm";
import { getConstructionManagementDiagnosis } from "@/lib/construction-diagnosis-v2/data";
import { CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION, PREVIOUS_CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION, isSpecialtyConstructionDiagnosisVersion } from "@/lib/construction-diagnosis-v2/questions";
import { getAdditionalDetailedQuestions, getInheritedDetailedAnswers, getInheritedDetailedQuestionIds } from "@/lib/construction-diagnosis-v2/short-questions";
import { getDiagnosisV22Session, markDiagnosisV22DetailedStarted, markGrowthStrategyStarted } from "@/lib/construction-diagnosis-v2/sessions";
import { getStrategyQuestions } from "@/lib/construction-diagnosis-v2/strategy";
import { canAccessDiagnosisV22, getCurrentDiagnosisResumePath } from "@/lib/construction-diagnosis-v2/resume";
import { recordDiagnosisEvent } from "@/lib/construction-diagnosis-v2/monitoring";

export default async function DiagnosisV2DetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentSession = await getDiagnosisV22Session(id);
  if (currentSession?.diagnosis_version === CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION) {
    if (!currentSession.short_completed_at || currentSession.strategy_completed_at) notFound();
    await markGrowthStrategyStarted(id);
    after(() => recordDiagnosisEvent({ eventName: "detailed_diagnosis_started", sessionId: id, source: currentSession.lead_source, notify: true }));
    const questions = getStrategyQuestions(currentSession.strategy_question_ids, {
      primaryTrade: currentSession.primary_trade,
      publicWorkIntent: currentSession.public_work_intent
    });
    if (questions.length < 8 || questions.length > 10) notFound();
    return <div className="bg-slate-50"><DiagnosisV23StrategyForm sessionId={id} questions={questions} initialAnswers={currentSession.strategy_answers} initialSavedAt={currentSession.strategy_last_saved_at} /></div>;
  }
  const diagnosis = await getConstructionManagementDiagnosis(id);
  if (!diagnosis?.quick_completed_at) notFound();
  const isV22 = diagnosis.diagnosis_version === PREVIOUS_CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION;
  if (isV22 && !await canAccessDiagnosisV22(id)) notFound();
  if (isV22) await markDiagnosisV22DetailedStarted(id);
  if (isV22) after(() => recordDiagnosisEvent({ eventName: "detailed_diagnosis_started", sessionId: id, diagnosisId: id, notify: true }));
  const session = isV22 ? currentSession : null;
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
