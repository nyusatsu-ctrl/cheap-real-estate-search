import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DiagnosisPrintControls } from "@/components/diagnoses/v2/DiagnosisPrintControls";
import { DiagnosisV2ResultView } from "@/components/diagnoses/v2/DiagnosisV2ResultView";
import { getDiagnosisForPrint } from "@/lib/construction-diagnosis-v2/print";

export const metadata: Metadata = {
  title: "診断結果 印刷・PDF保存｜株式会社エコループ",
  robots: { index: false, follow: false }
};

export default async function DiagnosisPrintPage() {
  const diagnosis = await getDiagnosisForPrint();
  if (!diagnosis) notFound();
  return (
    <div className="diagnosis-print-only-page">
      <DiagnosisPrintControls />
      <DiagnosisV2ResultView diagnosis={diagnosis} printMode />
    </div>
  );
}
