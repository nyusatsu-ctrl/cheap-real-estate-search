"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { issueDiagnosisPrintToken } from "@/lib/construction-diagnosis-v2/print";
import { recordDiagnosisEvent } from "@/lib/construction-diagnosis-v2/monitoring";

export async function openDiagnosisPrintPageAction(formData: FormData) {
  const diagnosisId = String(formData.get("diagnosis_id") ?? "").trim();
  let path: string;
  try {
    const result = await issueDiagnosisPrintToken(diagnosisId);
    path = result.path;
    after(() => recordDiagnosisEvent({ eventName: "print_opened", diagnosisId }));
  } catch {
    redirect(`/diagnosis/results/${encodeURIComponent(diagnosisId)}?print_error=1`);
  }
  redirect(path);
}
