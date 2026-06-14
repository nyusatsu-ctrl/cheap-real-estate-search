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

export type DiagnosisFormState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
};

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function setRequiredError(fieldErrors: Record<string, string>, key: string, label: string) {
  fieldErrors[key] = `${label}を入力してください`;
}

function requiredString(formData: FormData, key: string, label: string, fieldErrors: Record<string, string>) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) setRequiredError(fieldErrors, key, label);
  return value;
}

export async function submitConstructionDiagnosisAction(_previousState: DiagnosisFormState, formData: FormData): Promise<DiagnosisFormState> {
  const fieldErrors: Record<string, string> = {};
  const answers: Record<string, string> = {};

  for (const question of DIAGNOSIS_QUESTIONS) {
    const value = getString(formData, question.key);
    if (!value) fieldErrors[question.key] = `${question.label}を選択してください`;
    answers[question.key] = value;
  }

  for (const field of SUPPLEMENTAL_ANSWER_FIELDS) {
    const value = getString(formData, field.key);
    const isTriggered = Boolean(
      field.triggerQuestion
      && field.triggerValues?.includes(answers[field.triggerQuestion])
    );
    if (isTriggered && field.requiredWhenTriggered && !value) {
      setRequiredError(fieldErrors, field.key, field.label);
    }
    if (value) answers[field.key] = value;
  }

  const name = requiredString(formData, "name", "氏名", fieldErrors);
  const email = requiredString(formData, "email", "メールアドレス", fieldErrors);
  const companyName = getString(formData, "company_name") || null;
  const phone = getString(formData, "phone") || null;
  const leadSource = normalizeLeadSource(getString(formData, "lead_source"));
  const sourceCampaign = getString(formData, "source_campaign") || null;
  const seminarInterest = normalizeSeminarInterest(getString(formData, "seminar_interest"));
  const preferredContactTime = getString(formData, "preferred_contact_time") || null;

  if (Object.keys(fieldErrors).length > 0) {
    return {
      formError: "未入力の項目があります。赤字の項目を確認してください。",
      fieldErrors
    };
  }

  const { scores, mainType, subType } = scoreDiagnosis(answers);

  const supabase = await getDiagnosisClient();
  if (!supabase) {
    return {
      formError: "診断結果を保存できませんでした。時間をおいて再度お試しください。",
      fieldErrors: {}
    };
  }

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

  if (error || !data) {
    return {
      formError: "診断結果を保存できませんでした。時間をおいて再度お試しください。",
      fieldErrors: {}
    };
  }

  redirect(`/diagnosis/results/${data.id}`);
}
