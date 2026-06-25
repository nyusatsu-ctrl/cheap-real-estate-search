"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createDiagnosisSupabaseServerClient, createDiagnosisSupabaseServiceRoleClient } from "@/lib/supabase/diagnosis-server";
import {
  CONSTRUCTION_DIAGNOSIS_RESULT_COOKIE,
  DIAGNOSIS_QUESTIONS,
  SUPPLEMENTAL_ANSWER_FIELDS,
  type ConstructionDiagnosis,
  type DiagnosisAnswerMap,
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
  const diagnosisId = randomUUID();
  const now = new Date().toISOString();

  const serverClient = await createDiagnosisSupabaseServerClient();
  const serviceRoleClient = createDiagnosisSupabaseServiceRoleClient();
  if (!serverClient && !serviceRoleClient) {
    console.error("Construction diagnosis submit failed: Supabase client is not configured.");
    return {
      formError: "診断結果を保存できませんでした。時間をおいて再度お試しください。",
      fieldErrors: {}
    };
  }

  const diagnosisPayload = {
    id: diagnosisId,
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
  };

  const insertDiagnosis = (client: NonNullable<typeof serverClient> | NonNullable<typeof serviceRoleClient>) => client
    .from("construction_diagnoses")
    .insert(diagnosisPayload);

  let insertError = null;
  let insertedBy = "none";

  if (serverClient) {
    const { error } = await insertDiagnosis(serverClient);
    if (!error) {
      insertedBy = "server";
    } else {
      insertError = error;
      console.error("Construction diagnosis insert failed with server client.", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
    }
  }

  if (insertedBy === "none" && serviceRoleClient) {
    const { error } = await insertDiagnosis(serviceRoleClient);
    if (!error) {
      insertedBy = "service_role";
      insertError = null;
    } else {
      insertError = error;
    }
  }

  if (insertError || insertedBy === "none") {
    console.error("Construction diagnosis insert failed.", {
      insertedBy,
      code: insertError?.code,
      message: insertError?.message,
      details: insertError?.details,
      hint: insertError?.hint
    });
    return {
      formError: "診断結果を保存できませんでした。時間をおいて再度お試しください。",
      fieldErrors: {}
    };
  }

  await setResultCookie({
    ...diagnosisPayload,
    scores,
    lead_status: "new",
    admin_memo: null,
    admin_memo_updated_at: null,
    last_contacted_at: null,
    lead_updated_at: now,
    created_at: now
  });

  redirect(`/diagnosis/results/${diagnosisId}`);
}

async function setResultCookie(diagnosis: ConstructionDiagnosis) {
  const cookieStore = await cookies();
  cookieStore.set(
    CONSTRUCTION_DIAGNOSIS_RESULT_COOKIE,
    Buffer.from(JSON.stringify(diagnosis)).toString("base64url"),
    {
      httpOnly: true,
      maxAge: 60 * 30,
      path: `/diagnosis/results/${diagnosis.id}`,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    }
  );
}
