import { notFound } from "next/navigation";
import { DiagnosisV2DetailedForm } from "@/components/diagnoses/v2/DiagnosisV2DetailedForm";
import { getConstructionManagementDiagnosis } from "@/lib/construction-diagnosis-v2/data";

export default async function DiagnosisV2DetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const diagnosis = await getConstructionManagementDiagnosis(id);
  if (!diagnosis?.quick_completed_at) notFound();

  return (
    <div className="bg-slate-50">
      <DiagnosisV2DetailedForm diagnosisId={diagnosis.id} />
    </div>
  );
}
