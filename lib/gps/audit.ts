import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type GpsAdminAuditEntity = "customer" | "vehicle" | "device";
export type GpsAdminAuditAction = "create" | "update" | "deactivate";
export type GpsAdminAuditOperation = `${GpsAdminAuditEntity}_${GpsAdminAuditAction}`;

export class GpsAuditUnavailableError extends Error {
  constructor() {
    super("GPS audit log is unavailable.");
    this.name = "GpsAuditUnavailableError";
  }
}

export async function beginGpsAdminAudit(
  supabase: SupabaseClient,
  input: {
    actorProfileId: string;
    entity: GpsAdminAuditEntity;
    action: GpsAdminAuditAction;
    recordId: string;
  }
) {
  const operationType: GpsAdminAuditOperation = `${input.entity}_${input.action}`;
  const { data, error } = await supabase
    .from("operation_logs")
    .insert({
      actor_profile_id: input.actorProfileId,
      device_id: null,
      vehicle_id: null,
      operation_type: operationType,
      confirmation_text: "認証済みGPS管理者による管理データ変更",
      reason: "GPS管理画面またはGPS管理APIからの変更",
      request_payload: {
        entity: input.entity,
        action: input.action,
        record_id: input.recordId
      },
      result_status: "queued",
      result_message: "GPS管理データ変更の監査を開始しました。",
      executed_at: null
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    logGpsAuditError("audit_begin_failed", error);
    throw new GpsAuditUnavailableError();
  }
  return String(data.id);
}

export async function completeGpsAdminAudit(supabase: SupabaseClient, auditId: string) {
  const { error } = await supabase
    .from("operation_logs")
    .update({
      result_status: "acknowledged",
      result_message: "GPS管理データ変更が完了しました。",
      executed_at: new Date().toISOString()
    })
    .eq("id", auditId);
  if (error) logGpsAuditError("audit_complete_failed", error);
}

export async function failGpsAdminAudit(supabase: SupabaseClient, auditId: string) {
  const { error } = await supabase
    .from("operation_logs")
    .update({
      result_status: "failed",
      result_message: "GPS管理データ変更は完了しませんでした。",
      executed_at: null
    })
    .eq("id", auditId);
  if (error) logGpsAuditError("audit_fail_failed", error);
}

function logGpsAuditError(event: string, error: unknown) {
  console.error("[gps-audit]", event, { code: getSafeDatabaseErrorCode(error) });
}

function getSafeDatabaseErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return "unknown";
  return String(error.code || "unknown");
}
