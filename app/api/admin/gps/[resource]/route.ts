import { NextRequest } from "next/server";
import {
  beginGpsAdminAudit,
  completeGpsAdminAudit,
  failGpsAdminAudit,
  GpsAuditUnavailableError,
  type GpsAdminAuditEntity
} from "@/lib/gps/audit";
import { authorizeGpsApiRequest } from "@/lib/gps/api-auth";
import { parseGpsJsonObject, validateGpsApiMutationRequest } from "@/lib/gps/api-security";
import { resolveGpsResource, validateGpsMutableResourcePayload } from "@/lib/gps/resources";
import { getGpsAdminAccessForPrincipal } from "@/lib/gps/server-auth";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const authorization = await authorizeGpsApiRequest();
  if (!authorization.ok) return authorization.response;

  const { resource } = await params;
  const config = resolveGpsResource(resource);
  if (!config) return Response.json({ message: "未対応のGPS APIリソースです。" }, { status: 404 });

  const access = getGpsAdminAccessForPrincipal(authorization.principal);
  if (access.status !== "authorized") return databaseUnavailableResponse();
  if (access.mode === "demo") return Response.json({ data: config.sampleRows, demo: true });

  const { data, error } = await access.client
    .from(config.table)
    .select(config.selectColumns)
    .order(config.orderColumn, { ascending: false })
    .limit(500);

  if (error) {
    logGpsApiError("resource_list_failed", error);
    return Response.json({ message: "GPSデータを取得できませんでした。" }, { status: 500 });
  }
  return Response.json({ data: data ?? [], demo: false });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const authorization = await authorizeGpsApiRequest();
  if (!authorization.ok) return authorization.response;

  const requestError = validateGpsApiMutationRequest(request);
  if (requestError) {
    return Response.json({ message: requestError.message }, { status: requestError.status });
  }

  const { resource } = await params;
  const config = resolveGpsResource(resource);
  if (!config) return Response.json({ message: "未対応のGPS APIリソースです。" }, { status: 404 });

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

  const entity = getAuditEntity(config.table);
  if (!entity) return Response.json({ message: "このリソースは管理画面から変更できません。" }, { status: 405 });

  const recordId = crypto.randomUUID();
  let auditId: string;
  try {
    auditId = await beginGpsAdminAudit(access.client, {
      actorProfileId: authorization.principal.admin.id,
      entity,
      action: "create",
      recordId
    });
  } catch (error) {
    if (error instanceof GpsAuditUnavailableError) return auditUnavailableResponse();
    throw error;
  }

  const { data, error } = await access.client
    .from(config.table)
    .insert({ id: recordId, ...validation.data, updated_at: new Date().toISOString() })
    .select(config.selectColumns)
    .single();

  if (error) {
    await failGpsAdminAudit(access.client, auditId);
    logGpsApiError("resource_create_failed", error);
    return gpsMutationErrorResponse(error, "登録");
  }

  await completeGpsAdminAudit(access.client, auditId);
  return Response.json({ data }, { status: 201 });
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

function auditUnavailableResponse() {
  return Response.json({ message: "変更履歴を開始できないため操作を中止しました。" }, { status: 500 });
}

function demoMutationDeniedResponse() {
  return Response.json({ message: "デモモードではデータを変更できません。" }, { status: 403 });
}

function logGpsApiError(event: string, error: { code?: string | null }) {
  console.error("[gps-api]", event, { code: String(error.code || "unknown") });
}
