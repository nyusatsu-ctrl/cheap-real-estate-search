import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { normalizeLeadSource } from "@/lib/construction-diagnosis";
import { CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION } from "@/lib/construction-diagnosis-v2/questions";
import {
  DIAGNOSIS_V22_EMPLOYEE_OPTIONS,
  DIAGNOSIS_V22_SALES_OPTIONS,
  validateDiagnosisV2BasicStep
} from "@/lib/construction-diagnosis-v2/start-form";
import {
  DIAGNOSIS_V22_ORDER_MODEL_OPTIONS,
  PRIMARY_TRADE_OPTIONS,
  PUBLIC_WORK_INTENT_OPTIONS
} from "@/lib/construction-diagnosis-v2/specialty-questions";
import {
  hasDiagnosisV22Session,
  setDiagnosisV22SessionCookie
} from "@/lib/construction-diagnosis-v2/sessions";
import { classifyDiagnosisClient } from "@/lib/construction-diagnosis-v2/client-info";
import { createDiagnosisSupabaseServiceRoleClient } from "@/lib/supabase/diagnosis-server";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "送信内容を確認できませんでした。もう一度押してください。" }, { status: 400 });
  }

  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "通信できませんでした。入力内容は消えていません。もう一度押してください。" }, { status: 503 });
  }

  if (body.action === "start") {
    const values = sanitizeStringRecord(body.values);
    const errors = validateDiagnosisV2BasicStep(values);
    if (!PRIMARY_TRADE_OPTIONS.some((option) => option.value === values.primary_trade)) errors.primary_trade = "会社の主な業種を選んでください";
    if (!DIAGNOSIS_V22_ORDER_MODEL_OPTIONS.some((option) => option.value === values.order_model)) errors.order_model = "主な仕事の受け方を選んでください";
    if (!DIAGNOSIS_V22_EMPLOYEE_OPTIONS.includes(values.employee_range ?? "")) errors.employee_range = "従業員数を選んでください";
    if (!DIAGNOSIS_V22_SALES_OPTIONS.includes(values.sales_range ?? "")) errors.sales_range = "年商区分を選んでください";
    if (!PUBLIC_WORK_INTENT_OPTIONS.some((option) => option.value === values.public_work_intent)) errors.public_work_intent = "公共工事への考えを選んでください";
    if (Object.keys(errors).length > 0) return NextResponse.json({ errors }, { status: 400 });

    const requestedId = stringValue(body.sessionId);
    const canReuse = Boolean(requestedId && await hasDiagnosisV22Session(requestedId));
    const id = canReuse ? requestedId : randomUUID();
    const now = new Date().toISOString();
    const client = classifyDiagnosisClient(request.headers.get("user-agent") ?? "");
    const payload = {
      id,
      diagnosis_version: CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION,
      lead_source: normalizeLeadSource(stringValue(body.leadSource)),
      source_campaign: stringValue(body.campaign) || null,
      primary_trade: values.primary_trade,
      order_model: values.order_model,
      employee_range: values.employee_range,
      sales_range: values.sales_range,
      public_work_intent: values.public_work_intent,
      short_started_at: now,
      short_last_step: 0,
      abandoned_stage: "short",
      abandoned_question_id: "C01",
      device_type: client.deviceType,
      browser_family: client.browserFamily,
      updated_at: now
    };
    let error = null;
    if (canReuse) {
      const updated = await supabase
        .from("construction_diagnosis_sessions")
        .update(payload)
        .eq("id", id)
        .select("id")
        .maybeSingle();
      error = updated.error;
      if (!error && !updated.data) {
        const inserted = await supabase.from("construction_diagnosis_sessions").insert(payload);
        error = inserted.error;
      }
    } else {
      const inserted = await supabase.from("construction_diagnosis_sessions").insert(payload);
      error = inserted.error;
    }
    if (error) {
      console.error("[diagnosis-v2.2] session_start_failed", safeSupabaseError(error));
      return NextResponse.json({ error: "通信できませんでした。入力内容は消えていません。もう一度押してください。" }, { status: 500 });
    }
    await setDiagnosisV22SessionCookie(id);
    return NextResponse.json({ id });
  }

  if (body.action === "progress") {
    const id = stringValue(body.sessionId);
    if (!id || !await hasDiagnosisV22Session(id)) {
      return NextResponse.json({ error: "保存した診断を確認できません。最初の画面からもう一度進んでください。" }, { status: 401 });
    }
    const stage = body.stage === "detailed" ? "detailed" : "short";
    const step = Math.max(0, Math.min(100, Number(body.step) || 0));
    const answers = sanitizeAnswers(body.answers);
    const questionId = stringValue(body.questionId) || null;
    const update = stage === "short"
      ? { short_last_step: step, short_answers: answers, abandoned_stage: "short", abandoned_question_id: questionId }
      : { detailed_last_step: step, detailed_answers: answers, abandoned_stage: "detailed", abandoned_question_id: questionId };
    const { data: savedSession, error } = await supabase
      .from("construction_diagnosis_sessions")
      .update(update)
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("[diagnosis-v2.2] progress_save_failed", safeSupabaseError(error));
      return NextResponse.json({ error: "途中の回答を保存できませんでした。入力内容はこの画面に残っています。もう一度押してください。" }, { status: 500 });
    }
    if (!savedSession) {
      return NextResponse.json({ error: "保存した診断を確認できません。最初の画面へ戻り、もう一度進んでください。" }, { status: 409 });
    }
    if (stage === "detailed") {
      const { error: diagnosisError } = await supabase
        .from("construction_diagnoses")
        .update({ detailed_last_step: step, abandoned_stage: "detailed", abandoned_question_id: questionId })
        .eq("id", id);
      if (diagnosisError) console.error("[diagnosis-v2.2] diagnosis_progress_save_failed", safeSupabaseError(diagnosisError));
    }
    return NextResponse.json({ saved: true });
  }

  return NextResponse.json({ error: "操作を確認できませんでした。" }, { status: 400 });
}

function sanitizeStringRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, string>;
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => typeof item === "string" ? [[key, item.trim()]] : []));
}

function sanitizeAnswers(value: unknown) {
  const input = sanitizeStringRecord(value);
  return Object.fromEntries(Object.entries(input).filter(([key, answer]) => /^[A-Z]{1,3}\d{2}$/.test(key) && /^[0-4]$/.test(answer)));
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeSupabaseError(error: { code?: string; message?: string; details?: string; hint?: string }) {
  return { code: error.code, message: error.message, details: error.details, hint: error.hint };
}
