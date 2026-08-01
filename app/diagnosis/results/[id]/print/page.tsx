import { notFound } from "next/navigation";
import { DiagnosisV2ResultView } from "@/components/diagnoses/v2/DiagnosisV2ResultView";
import { getConstructionManagementDiagnosis } from "@/lib/construction-diagnosis-v2/data";
import { CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION } from "@/lib/construction-diagnosis-v2/questions";
import { canAccessDiagnosisV22 } from "@/lib/construction-diagnosis-v2/resume";

export default async function DiagnosisV2PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const diagnosis = await getConstructionManagementDiagnosis(id);
  if (!diagnosis) notFound();
  if (diagnosis.diagnosis_version === CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION && !await canAccessDiagnosisV22(id)) notFound();
  return <DiagnosisV2ResultView diagnosis={diagnosis} printMode />;
}
