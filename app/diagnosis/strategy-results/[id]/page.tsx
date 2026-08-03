import { notFound } from "next/navigation";
import { DiagnosisV23StrategyResultView } from "@/components/diagnoses/v2/DiagnosisV23StrategyResultView";
import { getDiagnosisV22Session } from "@/lib/construction-diagnosis-v2/sessions";
import { CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION } from "@/lib/construction-diagnosis-v2/questions";

export default async function GrowthStrategyResultPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ consultation?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const session = await getDiagnosisV22Session(id);
  if (!session || session.diagnosis_version !== CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION || !session.strategy_completed_at || !session.strategy_result) notFound();
  return <DiagnosisV23StrategyResultView id={id} result={session.strategy_result} axisScores={session.short_axis_scores} saved={Boolean(session.diagnosis_id)} consultationComplete={query.consultation === "complete"} />;
}
