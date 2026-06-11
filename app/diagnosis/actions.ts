"use server";

import { redirect } from "next/navigation";
import { DIAGNOSIS_QUESTIONS, getDiagnosisClient, scoreDiagnosis } from "@/lib/construction-diagnosis";

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

export async function submitConstructionDiagnosisAction(formData: FormData) {
  const answers: Record<string, string> = {};
  for (const question of DIAGNOSIS_QUESTIONS) {
    answers[question.key] = requiredString(formData, question.key);
  }

  const name = requiredString(formData, "name");
  const email = requiredString(formData, "email");
  const companyName = String(formData.get("company_name") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const { scores, mainType, subType } = scoreDiagnosis(answers);

  const supabase = await getDiagnosisClient();
  if (!supabase) throw new Error("Supabase environment variables are not set.");

  const { data, error } = await supabase
    .from("construction_diagnoses")
    .insert({
      name,
      company_name: companyName,
      phone,
      email,
      answers,
      scores,
      main_type: mainType,
      sub_type: subType,
      business_type: answers.business_type,
      monthly_sales: answers.monthly_sales,
      wants_consultation: answers.wants_consultation
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "診断結果を保存できませんでした。");

  redirect(`/diagnosis/results/${data.id}`);
}
