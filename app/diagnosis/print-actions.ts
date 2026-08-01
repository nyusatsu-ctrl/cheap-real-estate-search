"use server";

import { redirect } from "next/navigation";
import { issueDiagnosisPrintToken } from "@/lib/construction-diagnosis-v2/print";

export async function openDiagnosisPrintPageAction(formData: FormData) {
  const diagnosisId = String(formData.get("diagnosis_id") ?? "").trim();
  let path: string;
  try {
    const result = await issueDiagnosisPrintToken(diagnosisId);
    path = result.path;
  } catch {
    redirect(`/diagnosis/results/${encodeURIComponent(diagnosisId)}?print_error=1`);
  }
  redirect(path);
}
