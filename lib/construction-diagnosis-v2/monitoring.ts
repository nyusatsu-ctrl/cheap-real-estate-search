import "server-only";

import { createHash } from "crypto";
import { getDiagnosisAbsoluteUrl } from "@/lib/diagnosis-brand";
import { normalizeLeadSource } from "@/lib/diagnosis-lead-source";
import { createDiagnosisSupabaseServiceRoleClient } from "@/lib/supabase/diagnosis-server";

export type DiagnosisUsageEventName =
  | "diagnosis_opened"
  | "diagnosis_started"
  | "basic_info_completed"
  | "short_question_answered"
  | "short_diagnosis_completed"
  | "detailed_diagnosis_started"
  | "detailed_question_answered"
  | "detailed_diagnosis_completed"
  | "company_info_submitted"
  | "print_opened"
  | "consultation_requested"
  | "feedback_submitted"
  | "resume_opened";

type NotificationEventName = Extract<DiagnosisUsageEventName,
  | "short_diagnosis_completed"
  | "detailed_diagnosis_started"
  | "detailed_diagnosis_completed"
  | "company_info_submitted"
  | "consultation_requested"
  | "feedback_submitted"
>;

type EventInput = {
  eventName: DiagnosisUsageEventName;
  eventKey?: string;
  anonymousId?: string | null;
  sessionId?: string | null;
  diagnosisId?: string | null;
  questionCode?: string | null;
  stepNumber?: number | null;
  totalSteps?: number | null;
  source?: string | null;
  deviceType?: string | null;
  browserType?: string | null;
  notify?: boolean;
};

const NOTIFICATION_EVENTS = new Set<DiagnosisUsageEventName>([
  "short_diagnosis_completed",
  "detailed_diagnosis_started",
  "detailed_diagnosis_completed",
  "company_info_submitted",
  "consultation_requested",
  "feedback_submitted"
]);

export async function recordDiagnosisEvent(input: EventInput) {
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) return;
  const context = !input.source && (input.sessionId || input.diagnosisId)
    ? await loadNotificationSnapshot(input.sessionId, input.diagnosisId)
    : null;
  const eventKey = input.eventKey ?? makeEventKey(input);
  const { error } = await supabase.from("diagnosis_usage_events").insert({
    event_key: eventKey,
    anonymous_id: cleanAnonymousId(input.anonymousId),
    session_id: input.sessionId || null,
    diagnosis_id: input.diagnosisId || null,
    event_name: input.eventName,
    question_code: cleanQuestionCode(input.questionCode),
    step_number: safeCount(input.stepNumber),
    total_steps: safeCount(input.totalSteps),
    source: normalizeLeadSource(input.source ?? context?.source),
    device_type: cleanLabel(input.deviceType ?? undefined),
    browser_type: cleanLabel(input.browserType ?? undefined)
  });
  if (error && error.code !== "23505" && error.code !== "PGRST205") {
    console.error("[diagnosis-monitoring] event_save_failed", { eventName: input.eventName, code: error.code });
  }
  if (input.notify && NOTIFICATION_EVENTS.has(input.eventName)) {
    await sendDiagnosisNotification({ ...input, eventKey, eventName: input.eventName as NotificationEventName });
  }
}

async function sendDiagnosisNotification(input: EventInput & { eventKey: string; eventName: NotificationEventName }) {
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) return;
  const snapshot = await loadNotificationSnapshot(input.sessionId, input.diagnosisId);
  const payload = buildNotificationPayload(input.eventName, snapshot);
  const { data: event, error } = await supabase
    .from("diagnosis_notification_events")
    .insert({
      event_key: input.eventKey,
      event_name: input.eventName,
      session_id: input.sessionId || snapshot.sessionId || null,
      diagnosis_id: input.diagnosisId || snapshot.diagnosisId || null,
      payload
    })
    .select("id")
    .maybeSingle();
  if (error?.code === "23505" || error?.code === "PGRST205") return;
  if (error || !event) {
    console.error("[diagnosis-notification] history_save_failed", { eventName: input.eventName, code: error?.code });
    return;
  }

  const recipient = process.env.DIAGNOSIS_NOTIFICATION_TO?.trim();
  const sender = process.env.DIAGNOSIS_NOTIFICATION_FROM?.trim();
  const apiKey = process.env.DIAGNOSIS_RESEND_API_KEY?.trim();
  if (!recipient || !sender || !apiKey) return;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: sender, to: [recipient], subject: payload.subject, text: payload.text }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) {
      await markNotification(event.id, "failed", `http_${response.status}`);
      return;
    }
    const result = await response.json() as { id?: string };
    await supabase.from("diagnosis_notification_events").update({
      status: "sent",
      attempts: 1,
      sent_at: new Date().toISOString(),
      provider_message_id: result.id ?? null,
      last_error_code: null
    }).eq("id", event.id);
  } catch (error) {
    const code = error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "request_failed";
    await markNotification(event.id, "failed", code);
  }
}

async function markNotification(id: string, status: "failed", code: string) {
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) return;
  await supabase.from("diagnosis_notification_events").update({ status, attempts: 1, last_error_code: code }).eq("id", id);
}

async function loadNotificationSnapshot(sessionId?: string | null, diagnosisId?: string | null) {
  const supabase = createDiagnosisSupabaseServiceRoleClient();
  if (!supabase) return emptySnapshot();
  const [sessionResult, diagnosisResult] = await Promise.all([
    sessionId
      ? supabase.from("construction_diagnosis_sessions").select("id, diagnosis_id, lead_source, primary_trade, employee_range, sales_range, public_work_intent, diagnosis_status, short_total_score").eq("id", sessionId).maybeSingle()
      : Promise.resolve({ data: null }),
    diagnosisId
      ? supabase.from("construction_diagnoses").select("id, anonymous_session_id, company_name, lead_source, primary_trade, employee_range, sales_range, public_work_intent, diagnosis_status, total_score").eq("id", diagnosisId).maybeSingle()
      : Promise.resolve({ data: null })
  ]);
  const session = sessionResult.data as Record<string, unknown> | null;
  let diagnosis = diagnosisResult.data as Record<string, unknown> | null;
  if (!diagnosis && session?.diagnosis_id) {
    const result = await supabase.from("construction_diagnoses").select("id, anonymous_session_id, company_name, lead_source, primary_trade, employee_range, sales_range, public_work_intent, diagnosis_status, total_score").eq("id", String(session.diagnosis_id)).maybeSingle();
    diagnosis = result.data as Record<string, unknown> | null;
  }
  return {
    sessionId: String(session?.id ?? diagnosis?.anonymous_session_id ?? "") || null,
    diagnosisId: String(diagnosis?.id ?? session?.diagnosis_id ?? "") || null,
    companyName: String(diagnosis?.company_name ?? ""),
    primaryTrade: String(diagnosis?.primary_trade ?? session?.primary_trade ?? ""),
    employeeRange: String(diagnosis?.employee_range ?? session?.employee_range ?? ""),
    salesRange: String(diagnosis?.sales_range ?? session?.sales_range ?? ""),
    publicWorkIntent: String(diagnosis?.public_work_intent ?? session?.public_work_intent ?? ""),
    stage: String(diagnosis?.diagnosis_status ?? session?.diagnosis_status ?? ""),
    totalScore: diagnosis?.total_score ?? session?.short_total_score ?? null,
    source: String(diagnosis?.lead_source ?? session?.lead_source ?? "direct")
  };
}

function buildNotificationPayload(eventName: NotificationEventName, snapshot: ReturnType<typeof emptySnapshot>) {
  const occurredAt = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Tokyo" }).format(new Date());
  const labels: Record<NotificationEventName, string> = {
    short_diagnosis_completed: "3分診断が完了しました",
    detailed_diagnosis_started: "追加診断が開始されました",
    detailed_diagnosis_completed: "追加診断が完了しました",
    company_info_submitted: "会社情報が入力されました",
    consultation_requested: "個別相談が申し込まれました",
    feedback_submitted: "フィードバックが送信されました"
  };
  const adminUrl = snapshot.diagnosisId ? getDiagnosisAbsoluteUrl(`/admin/diagnoses/${snapshot.diagnosisId}`) : getDiagnosisAbsoluteUrl("/admin/diagnoses");
  const text = [
    labels[eventName],
    `発生日時: ${occurredAt}`,
    `診断ID: ${snapshot.diagnosisId ?? "未作成"}`,
    `会社名: ${snapshot.companyName || "未入力"}`,
    `業種: ${snapshot.primaryTrade || "未入力"}`,
    `従業員数: ${snapshot.employeeRange || "未入力"}`,
    `売上規模: ${snapshot.salesRange || "未入力"}`,
    `公共工事への意向: ${snapshot.publicWorkIntent || "未入力"}`,
    `現在の段階: ${snapshot.stage || "不明"}`,
    `総合点: ${snapshot.totalScore ?? "未算出"}`,
    `source: ${snapshot.source}`,
    `管理画面: ${adminUrl}`
  ].join("\n");
  return { subject: `【建設会社向け経営診断】${labels[eventName]}`, text };
}

function makeEventKey(input: EventInput) {
  const identity = input.sessionId || input.diagnosisId || input.anonymousId || "anonymous";
  const suffix = input.questionCode || "event";
  return createHash("sha256").update(`${identity}:${input.eventName}:${suffix}`).digest("hex");
}

function emptySnapshot() {
  return { sessionId: null as string | null, diagnosisId: null as string | null, companyName: "", primaryTrade: "", employeeRange: "", salesRange: "", publicWorkIntent: "", stage: "", totalScore: null as unknown, source: "direct" };
}

function cleanAnonymousId(value?: string | null) { return value && /^[a-zA-Z0-9_-]{8,80}$/.test(value) ? value : null; }
function cleanQuestionCode(value?: string | null) { return value && /^[A-Z]{1,4}\d{2}$/.test(value) ? value : null; }
function safeCount(value?: number | null) { return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null; }
function cleanLabel(value?: string | null) { return value?.trim().slice(0, 80) || "不明"; }
