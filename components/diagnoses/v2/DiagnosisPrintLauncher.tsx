import { Printer } from "lucide-react";
import { openDiagnosisPrintPageAction } from "@/app/diagnosis/print-actions";

export function DiagnosisPrintLauncher({ diagnosisId, className = "" }: { diagnosisId: string; className?: string }) {
  return (
    <form action={openDiagnosisPrintPageAction} className={className}>
      <input type="hidden" name="diagnosis_id" value={diagnosisId} />
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 text-sm font-black text-white focus-ring sm:w-auto"
      >
        <Printer className="h-4 w-4" />
        印刷・PDF保存へ進む
      </button>
    </form>
  );
}
