"use server";

import { redirect } from "next/navigation";
import { normalizeLeadSource } from "@/lib/construction-diagnosis";
import { removeDiagnosisResumeTokenFromDevice } from "@/lib/construction-diagnosis-v2/resume";
import { isDiagnosisResumeToken } from "@/lib/construction-diagnosis-v2/resume-token";

export async function restartDiagnosisAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const source = normalizeLeadSource(String(formData.get("source") ?? ""));
  if (isDiagnosisResumeToken(token)) await removeDiagnosisResumeTokenFromDevice(token);
  redirect(`/diagnosis?source=${source}&restart=1`);
}
