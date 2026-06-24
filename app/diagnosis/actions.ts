"use server";

import { redirect } from "next/navigation";
import {
  DIAGNOSIS_QUESTIONS,
  SUPPLEMENTAL_ANSWER_FIELDS,
  type DiagnosisAnswerMap,
  getDiagnosisClient,
  getAnswerString,
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

function getAllowedQuestionValues(question: (typeof DIAGNOSIS_QUESTIONS)[number]) {
  return new Set(question.options?.map((option) => option.value) ?? []);
}

function answerHasTriggerValue(value: DiagnosisAnswerMap[string], triggerValues: string[] | undefined) {
  if (!triggerValues || triggerValues.length === 0) return false;
  const values = Array.isArray(value) ? value : [value];
  return values.some((candidate) => triggerValues.includes(String(candidate ?? "")));
}

export async function submitConstructionDiagnosisAction(_previousState: DiagnosisFormState, formData: FormData): Promise<DiagnosisFormState> {
  const fieldErrors: Record<string, string> = {};
  const answers: DiagnosisAnswerMap = {};

  for (const question of DIAGNOSIS_QUESTIONS) {
    const allowedValues = getAllowedQuestionValues(question);

    if (question.type === "checkbox") {
      const values = Array.from(new Set(
        formData
          .getAll(question.key)
          .map((value) => String(value ?? "").trim())
          .filter((value) => value && allowedValues.has(value))
      ));
      if (values.length === 0) fieldErrors[question.key] = `${question.label}を1つ以上選択してください`;
      answers[question.key] = values;
      continue;
    }

    const value = getString(formData, question.key);
    if (!value || (allowedValues.size > 0 && !allowedValues.has(value))) {
      fieldErrors[question.key] = `${question.label}を選択してください`;
    }
    answers[question.key] = value;
  }

  for (const field of SUPPLEMENTAL_ANSWER_FIELDS) {
    const value = getString(formData, field.key);
    const isTriggered = Boolean(
      field.triggerQuestion
      && answerHasTriggerValue(answers[field.triggerQuestion], field.triggerValues)
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
    console.error("Construction diagnosis submit failed: Supabase client is not configured.");
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
      business_type: getAnswerString(answers.business_type),
      monthly_sales: getAnswerString(answers.monthly_sales),
      wants_consultation: getAnswerString(answers.wants_consultation),
      lead_source: leadSource,
      source_campaign: sourceCampaign,
      seminar_interest: seminarInterest,
      preferred_contact_time: preferredContactTime
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Construction diagnosis insert failed.", {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint
    });
    return {
      formError: "診断結果を保存できませんでした。時間をおいて再度お試しください。",
      fieldErrors: {}
    };
  }

  redirect(`/diagnosis/results/${data.id}`);
}
