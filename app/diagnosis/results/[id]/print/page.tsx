import { notFound } from "next/navigation";
import { DiagnosisV2ResultView } from "@/components/diagnoses/v2/DiagnosisV2ResultView";
import { getConstructionManagementDiagnosis } from "@/lib/construction-diagnosis-v2/data";

export default async function DiagnosisV2PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const diagnosis = await getConstructionManagementDiagnosis(id);
  if (!diagnosis) notFound();
  return <DiagnosisV2ResultView diagnosis={diagnosis} printMode />;
}
