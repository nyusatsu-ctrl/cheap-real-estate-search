"use server";

import { redirect } from "next/navigation";
import {
  DIAGNOSIS_QUESTIONS,
  SUPPLEMENTAL_ANSWER_FIELDS,
  getDiagnosisClient,
  normalizeLeadSource,
  normalizeSeminarInterest,
  scoreDiagnosis
} from "@/lib/construction-diagnosis";

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
  for (const field of SUPPLEMENTAL_ANSWER_FIELDS) {
    const value = String(formData.get(field.key) ?? "").trim();
    const isTriggered = Boolean(
      field.triggerQuestion
      && field.triggerValues?.includes(answers[field.triggerQuestion])
    );
    if (isTriggered && field.requiredWhenTriggered && !value) {
      throw new Error(`${field.label} is required`);
    }
    if (value) answers[field.key] = value;
  }

  const name = requiredString(formData, "name");
  const email = requiredString(formData, "email");
  const companyName = String(formData.get("company_name") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const leadSource = normalizeLeadSource(String(formData.get("lead_source") ?? ""));
  const sourceCampaign = String(formData.get("source_campaign") ?? "").trim() || null;
  const seminarInterest = normalizeSeminarInterest(String(formData.get("seminar_interest") ?? ""));
  const preferredContactTime = String(formData.get("preferred_contact_time") ?? "").trim() || null;
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
      wants_consultation: answers.wants_consultation,
      lead_source: leadSource,
      source_campaign: sourceCampaign,
      seminar_interest: seminarInterest,
      preferred_contact_time: preferredContactTime
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "診断結果を保存できませんでした。");

  redirect(`/diagnosis/results/${data.id}`);
}
