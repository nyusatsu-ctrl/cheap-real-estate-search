import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  beginGpsAdminAudit,
  completeGpsAdminAudit,
  failGpsAdminAudit,
  GpsAuditUnavailableError,
  type GpsAdminAuditAction,
  type GpsAdminAuditEntity
} from "@/lib/gps/audit";
import { authorizeGpsApiRequest } from "@/lib/gps/api-auth";
import { parseGpsJsonObject, validateGpsApiMutationRequest } from "@/lib/gps/api-security";
import {
  getGpsDeactivationPayload,
  resolveGpsResource,
  validateGpsMutableResourcePayload
} from "@/lib/gps/resources";
import { getGpsAdminAccessForPrincipal } from "@/lib/gps/server-auth";
import { validateGpsRecordId } from "@/lib/gps/validation";

type RouteContext = { params: Promise<{ resource: string; id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const authorization = await authorizeGpsApiRequest();
  if (!authorization.ok) return authorization.response;

  const { resource, id: rawId } = await params;
  const config = resolveGpsResource(resource);
  if (!config) return Response.json({ message: "未対応のGPS APIリソースです。" }, { status: 404 });
  const id = validateGpsRecordId(rawId);
  if (!id) return Response.json({ message: "GPSデータIDが不正です。" }, { status: 400 });

  const access = getGpsAdminAccessForPrincipal(authorization.principal);
  if (access.status !== "authorized") return databaseUnavailableResponse();
  if (access.mode === "demo") {
    const row = config.sampleRows.find((sample) => sample.id === id) ?? null;
    return Response.json({ data: row, demo: true }, { status: row ? 200 : 404 });
  }

  const { data, error } = await access.client.from(config.table).select(config.selectColumns).eq("id", id).maybeSingle();
  if (error) {
    logGpsApiError("resource_read_failed", error);
    return Response.json({ message: "GPSデータを取得できませんでした。" }, { status: 500 });
  }
  if (!data) return Response.json({ message: "GPSデータが見つかりません。" }, { status: 404 });
  return Response.json({ data, demo: false });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const authorization = await authorizeGpsApiRequest();
  if (!authorization.ok) return authorization.response;

  const requestError = validateGpsApiMutationRequest(request);
  if (requestError) {
    return Response.json({ message: requestError.message }, { status: requestError.status });
  }

  const { resource, id: rawId } = await params;
  const config = resolveGpsResource(resource);
  if (!config) return Response.json({ message: "未対応のGPS APIリソースです。" }, { status: 404 });
  const id = validateGpsRecordId(rawId);
  if (!id) return Response.json({ message: "GPSデータIDが不正です。" }, { status: 400 });

  const parsedBody = await parseGpsJsonObject(request);
  if (!parsedBody.ok) {
    return Response.json({ message: parsedBody.error.message }, { status: parsedBody.error.status });
  }

  const validation = validateGpsMutableResourcePayload(config, parsedBody.data);
  if (!validation) return Response.json({ message: "このリソースは管理画面から変更できません。" }, { status: 405 });
  if (!validation.ok) return Response.json({ message: validation.message, errors: validation.errors }, { status: 400 });

  const access = getGpsAdminAccessForPrincipal(authorization.principal);
  if (access.status !== "authorized") return databaseUnavailableResponse();
  if (access.mode === "demo") return demoMutationDeniedResponse();

  const audit = await beginAudit(access.client, authorization.principal.admin.id, config.table, "update", id);
  if (!audit.ok) return audit.response;

  const { data, error } = await access.client
    .from(config.table)
    .update({ ...validation.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(config.selectColumns)
    .maybeSingle();

  if (error || !data) {
    await failGpsAdminAudit(access.client, audit.id);
    if (error) logGpsApiError("resource_update_failed", error);
    if (!data && !error) return Response.json({ message: "GPSデータが見つかりません。" }, { status: 404 });
    return gpsMutationErrorResponse(error!, "更新");
  }

  await completeGpsAdminAudit(access.client, audit.id);
  return Response.json({ data });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const authorization = await authorizeGpsApiRequest();
  if (!authorization.ok) return authorization.response;

  const requestError = validateGpsApiMutationRequest(request);
  if (requestError) {
    return Response.json({ message: requestError.message }, { status: requestError.status });
  }

  const { resource, id: rawId } = await params;
  const config = resolveGpsResource(resource);
  if (!config) return Response.json({ message: "未対応のGPS APIリソースです。" }, { status: 404 });
  const id = validateGpsRecordId(rawId);
  if (!id) return Response.json({ message: "GPSデータIDが不正です。" }, { status: 400 });

  const deactivationPayload = getGpsDeactivationPayload(config);
  if (!deactivationPayload) {
    return Response.json({ message: "このリソースは削除・無効化できません。" }, { status: 405 });
  }

  const access = getGpsAdminAccessForPrincipal(authorization.principal);
  if (access.status !== "authorized") return databaseUnavailableResponse();
  if (access.mode === "demo") return demoMutationDeniedResponse();

  const audit = await beginAudit(access.client, authorization.principal.admin.id, config.table, "deactivate", id);
  if (!audit.ok) return audit.response;

  const { data, error } = await access.client
    .from(config.table)
    .update(deactivationPayload)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    await failGpsAdminAudit(access.client, audit.id);
    if (error) logGpsApiError("resource_deactivate_failed", error);
    if (!data && !error) return Response.json({ message: "GPSデータが見つかりません。" }, { status: 404 });
    return gpsMutationErrorResponse(error!, "無効化");
  }

  await completeGpsAdminAudit(access.client, audit.id);
  return Response.json({ message: "関連履歴を残したまま無効化しました。" });
}

async function beginAudit(
  supabase: SupabaseClient,
  actorProfileId: string,
  table: string,
  action: GpsAdminAuditAction,
  recordId: string
) {
  const entity = getAuditEntity(table);
  if (!entity) {
    return {
      ok: false as const,
      response: Response.json({ message: "このリソースは管理画面から変更できません。" }, { status: 405 })
    };
  }
  try {
    const id = await beginGpsAdminAudit(supabase, { actorProfileId, entity, action, recordId });
    return { ok: true as const, id };
  } catch (error) {
    if (!(error instanceof GpsAuditUnavailableError)) throw error;
    return {
      ok: false as const,
      response: Response.json({ message: "変更履歴を開始できないため操作を中止しました。" }, { status: 500 })
    };
  }
}

function getAuditEntity(table: string): GpsAdminAuditEntity | null {
  if (table === "gps_customers") return "customer";
  if (table === "gps_vehicles") return "vehicle";
  if (table === "gps_devices") return "device";
  return null;
}

function gpsMutationErrorResponse(error: { code?: string | null }, action: string) {
  if (error.code === "23505") {
    return Response.json({ message: "重複する端末IDまたはIMEIが登録されています。" }, { status: 409 });
  }
  if (error.code === "23503") {
    return Response.json({ message: "選択した関連データが存在しません。" }, { status: 400 });
  }
  return Response.json({ message: `GPSデータを${action}できませんでした。` }, { status: 500 });
}

function databaseUnavailableResponse() {
  return Response.json({ message: "GPSデータベースへ接続できません。" }, { status: 500 });
}

function demoMutationDeniedResponse() {
  return Response.json({ message: "デモモードではデータを変更できません。" }, { status: 403 });
}

function logGpsApiError(event: string, error: { code?: string | null }) {
  console.error("[gps-api]", event, { code: String(error.code || "unknown") });
}
