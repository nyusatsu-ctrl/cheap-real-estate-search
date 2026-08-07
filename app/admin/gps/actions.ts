"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import {
  beginGpsAdminAudit,
  completeGpsAdminAudit,
  failGpsAdminAudit,
  GpsAuditUnavailableError,
  type GpsAdminAuditAction,
  type GpsAdminAuditEntity
} from "@/lib/gps/audit";
import { isGpsDemoModeEnabled } from "@/lib/gps/runtime";
import {
  createGpsAdminServiceRoleClient,
  GpsAdminClientConfigurationError
} from "@/lib/gps/server-admin-client";
import {
  getGpsDeviceDuplicateError,
  validateGpsCustomerInput,
  validateGpsDeviceInput,
  validateGpsRecordId,
  validateGpsVehicleInput
} from "@/lib/gps/validation";

export type GpsFormState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

export async function saveGpsCustomerAction(
  _previousState: GpsFormState,
  formData: FormData
): Promise<GpsFormState> {
  const context = await getGpsMutationContext("/admin/gps/customers");
  if (!context.ok) return context.state;

  const idResult = optionalRecordId(formData.get("id"));
  if (!idResult.ok) return idResult.state;

  const validation = validateGpsCustomerInput(Object.fromEntries(formData.entries()));
  if (!validation.ok) return invalidState(validation.message, validation.errors);

  const recordId = idResult.id ?? crypto.randomUUID();
  const auditId = await beginAudit(context, "customer", idResult.id ? "update" : "create", recordId);
  if (!auditId) return invalidState("変更履歴を開始できないため保存を中止しました。");
  const payload = { ...validation.data, updated_at: new Date().toISOString() };
  const query = idResult.id
    ? context.supabase.from("gps_customers").update(payload).eq("id", recordId)
    : context.supabase.from("gps_customers").insert({ id: recordId, ...payload });
  const { data, error } = await query.select("id").single();

  if (error) {
    await failGpsAdminAudit(context.supabase, auditId);
    logGpsMutationError("customer_save_failed", error);
    return databaseErrorState(error);
  }

  await completeGpsAdminAudit(context.supabase, auditId);
  revalidateGpsPaths();
  redirect(`/admin/gps/customers/${data.id}`);
}

export async function saveGpsVehicleAction(
  _previousState: GpsFormState,
  formData: FormData
): Promise<GpsFormState> {
  const context = await getGpsMutationContext("/admin/gps/vehicles");
  if (!context.ok) return context.state;

  const idResult = optionalRecordId(formData.get("id"));
  if (!idResult.ok) return idResult.state;

  const validation = validateGpsVehicleInput(Object.fromEntries(formData.entries()));
  if (!validation.ok) return invalidState(validation.message, validation.errors);

  const recordId = idResult.id ?? crypto.randomUUID();
  const auditId = await beginAudit(context, "vehicle", idResult.id ? "update" : "create", recordId);
  if (!auditId) return invalidState("変更履歴を開始できないため保存を中止しました。");
  const payload = { ...validation.data, updated_at: new Date().toISOString() };
  const query = idResult.id
    ? context.supabase.from("gps_vehicles").update(payload).eq("id", recordId)
    : context.supabase.from("gps_vehicles").insert({ id: recordId, ...payload });
  const { data, error } = await query.select("id").single();

  if (error) {
    await failGpsAdminAudit(context.supabase, auditId);
    logGpsMutationError("vehicle_save_failed", error);
    return databaseErrorState(error);
  }

  await completeGpsAdminAudit(context.supabase, auditId);
  revalidateGpsPaths();
  redirect(`/admin/gps/vehicles/${data.id}`);
}

export async function saveGpsDeviceAction(
  _previousState: GpsFormState,
  formData: FormData
): Promise<GpsFormState> {
  const context = await getGpsMutationContext("/admin/gps/devices");
  if (!context.ok) return context.state;

  const idResult = optionalRecordId(formData.get("id"));
  if (!idResult.ok) return idResult.state;

  const validation = validateGpsDeviceInput(Object.fromEntries(formData.entries()));
  if (!validation.ok) return invalidState(validation.message, validation.errors);

  const duplicateState = await findDeviceDuplicate(
    context.supabase,
    validation.data.device_identifier,
    validation.data.imei,
    idResult.id
  );
  if (duplicateState) return duplicateState;

  const recordId = idResult.id ?? crypto.randomUUID();
  const auditId = await beginAudit(context, "device", idResult.id ? "update" : "create", recordId);
  if (!auditId) return invalidState("変更履歴を開始できないため保存を中止しました。");
  const payload = { ...validation.data, updated_at: new Date().toISOString() };
  const query = idResult.id
    ? context.supabase.from("gps_devices").update(payload).eq("id", recordId)
    : context.supabase.from("gps_devices").insert({ id: recordId, ...payload });
  const { data, error } = await query.select("id").single();

  if (error) {
    await failGpsAdminAudit(context.supabase, auditId);
    logGpsMutationError("device_save_failed", error);
    return databaseErrorState(error, "端末IDまたはIMEIが既に登録されていないか確認してください。");
  }

  await completeGpsAdminAudit(context.supabase, auditId);
  revalidateGpsPaths();
  redirect(`/admin/gps/devices/${data.id}`);
}

export async function deactivateGpsCustomerAction(formData: FormData) {
  const context = await getGpsMutationContext("/admin/gps/customers");
  if (!context.ok) redirect("/admin/gps/customers?error=database-unavailable");

  const id = validateGpsRecordId(formData.get("id"));
  if (!id) redirect("/admin/gps/customers?error=invalid-id");

  const auditId = await beginAudit(context, "customer", "deactivate", id);
  if (!auditId) redirect(`/admin/gps/customers/${id}?error=audit-unavailable`);
  const { error } = await context.supabase
    .from("gps_customers")
    .update({ contract_status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    await failGpsAdminAudit(context.supabase, auditId);
    logGpsMutationError("customer_deactivate_failed", error);
    redirect(`/admin/gps/customers/${id}?error=deactivate-failed`);
  }

  await completeGpsAdminAudit(context.supabase, auditId);
  revalidateGpsPaths();
  redirect(`/admin/gps/customers/${id}`);
}

export async function deactivateGpsVehicleAction(formData: FormData) {
  const context = await getGpsMutationContext("/admin/gps/vehicles");
  if (!context.ok) redirect("/admin/gps/vehicles?error=database-unavailable");

  const id = validateGpsRecordId(formData.get("id"));
  if (!id) redirect("/admin/gps/vehicles?error=invalid-id");

  const auditId = await beginAudit(context, "vehicle", "deactivate", id);
  if (!auditId) redirect(`/admin/gps/vehicles/${id}?error=audit-unavailable`);
  const { error } = await context.supabase
    .from("gps_vehicles")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    await failGpsAdminAudit(context.supabase, auditId);
    logGpsMutationError("vehicle_deactivate_failed", error);
    redirect(`/admin/gps/vehicles/${id}?error=deactivate-failed`);
  }

  await completeGpsAdminAudit(context.supabase, auditId);
  revalidateGpsPaths();
  redirect(`/admin/gps/vehicles/${id}`);
}

export async function deactivateGpsDeviceAction(formData: FormData) {
  const context = await getGpsMutationContext("/admin/gps/devices");
  if (!context.ok) redirect("/admin/gps/devices?error=database-unavailable");

  const id = validateGpsRecordId(formData.get("id"));
  if (!id) redirect("/admin/gps/devices?error=invalid-id");

  const auditId = await beginAudit(context, "device", "deactivate", id);
  if (!auditId) redirect(`/admin/gps/devices/${id}?error=audit-unavailable`);
  const { error } = await context.supabase
    .from("gps_devices")
    .update({
      connection_status: "offline",
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);
  if (error) {
    await failGpsAdminAudit(context.supabase, auditId);
    logGpsMutationError("device_deactivate_failed", error);
    redirect(`/admin/gps/devices/${id}?error=deactivate-failed`);
  }

  await completeGpsAdminAudit(context.supabase, auditId);
  revalidateGpsPaths();
  redirect(`/admin/gps/devices/${id}`);
}

export async function pairGpsProtocolTerminalAction(formData: FormData) {
  const context = await getGpsMutationContext("/admin/gps/raw-logs");
  if (!context.ok) redirect("/admin/gps/raw-logs?error=database-unavailable");

  const rawLogId = validateGpsRecordId(formData.get("raw_log_id"));
  const deviceId = validateGpsRecordId(formData.get("device_id"));
  if (!rawLogId || !deviceId) redirect("/admin/gps/raw-logs?error=invalid-pairing");

  const [rawResult, deviceResult] = await Promise.all([
    context.supabase.from("raw_device_logs").select("protocol_terminal_id").eq("id", rawLogId).maybeSingle(),
    context.supabase
      .from("gps_devices")
      .select("id,protocol_terminal_id,is_active")
      .eq("id", deviceId)
      .maybeSingle()
  ]);
  if (rawResult.error || deviceResult.error) {
    logGpsMutationError("terminal_pairing_lookup_failed", rawResult.error ?? deviceResult.error);
    redirect("/admin/gps/raw-logs?error=pairing-lookup-failed");
  }
  const protocolTerminalId = rawResult.data?.protocol_terminal_id;
  if (!/^\d{12}$/.test(String(protocolTerminalId ?? "")) || !deviceResult.data?.is_active) {
    redirect("/admin/gps/raw-logs?error=invalid-pairing");
  }
  if (deviceResult.data.protocol_terminal_id) {
    redirect("/admin/gps/raw-logs?error=device-already-paired");
  }

  const duplicateResult = await context.supabase
    .from("gps_devices")
    .select("id")
    .eq("protocol_terminal_id", protocolTerminalId)
    .neq("id", deviceId)
    .limit(1)
    .maybeSingle();
  if (duplicateResult.error) {
    logGpsMutationError("terminal_pairing_duplicate_check_failed", duplicateResult.error);
    redirect("/admin/gps/raw-logs?error=pairing-lookup-failed");
  }
  if (duplicateResult.data) redirect("/admin/gps/raw-logs?error=terminal-already-paired");

  const auditId = await beginAudit(context, "device", "update", deviceId);
  if (!auditId) redirect("/admin/gps/raw-logs?error=audit-unavailable");
  const updateResult = await context.supabase
    .from("gps_devices")
    .update({
      protocol_terminal_id: protocolTerminalId,
      jt808_auth_token_hash: null,
      jt808_auth_issued_at: null,
      jt808_registered_at: null,
      last_authenticated_at: null,
      connection_status: "offline",
      updated_at: new Date().toISOString()
    })
    .eq("id", deviceId)
    .select("id")
    .maybeSingle();
  if (updateResult.error || !updateResult.data) {
    await failGpsAdminAudit(context.supabase, auditId);
    if (updateResult.error) logGpsMutationError("terminal_pairing_update_failed", updateResult.error);
    redirect("/admin/gps/raw-logs?error=pairing-update-failed");
  }
  await completeGpsAdminAudit(context.supabase, auditId);
  revalidateGpsPaths();
  revalidatePath("/admin/gps/raw-logs");
  redirect("/admin/gps/raw-logs?paired=1");
}

async function getGpsMutationContext(nextPath: string) {
  const admin = await requireAdmin(nextPath);
  if (isGpsDemoModeEnabled()) {
    return {
      ok: false as const,
      state: invalidState("デモモードではデータを変更できません。")
    };
  }

  try {
    return { ok: true as const, admin, supabase: createGpsAdminServiceRoleClient() };
  } catch (error) {
    if (!(error instanceof GpsAdminClientConfigurationError)) throw error;
    return {
      ok: false as const,
      state: invalidState("GPSデータベースへ接続できません。")
    };
  }
}

async function findDeviceDuplicate(
  supabase: ReturnType<typeof createGpsAdminServiceRoleClient>,
  deviceIdentifier: string,
  imei: string,
  currentId: string | null
) {
  let identifierQuery = supabase.from("gps_devices").select("id").eq("device_identifier", deviceIdentifier);
  let imeiQuery = supabase.from("gps_devices").select("id").eq("imei", imei);
  if (currentId) {
    identifierQuery = identifierQuery.neq("id", currentId);
    imeiQuery = imeiQuery.neq("id", currentId);
  }

  const [identifierResult, imeiResult] = await Promise.all([
    identifierQuery.limit(1).maybeSingle(),
    imeiQuery.limit(1).maybeSingle()
  ]);
  if (identifierResult.error || imeiResult.error) {
    logGpsMutationError("device_duplicate_check_failed", identifierResult.error ?? imeiResult.error);
    return invalidState("端末ID・IMEIの重複確認に失敗しました。");
  }
  const duplicateError = getGpsDeviceDuplicateError(Boolean(identifierResult.data), Boolean(imeiResult.data));
  return duplicateError ? invalidState(duplicateError.message, duplicateError.fieldErrors) : null;
}

function optionalRecordId(value: FormDataEntryValue | null):
  | { ok: true; id: string | null }
  | { ok: false; state: GpsFormState } {
  const candidate = String(value ?? "").trim();
  if (!candidate) return { ok: true, id: null };
  const id = validateGpsRecordId(candidate);
  if (!id) return { ok: false, state: invalidState("編集対象のIDが不正です。") };
  return { ok: true, id };
}

function invalidState(message: string, fieldErrors?: Record<string, string>): GpsFormState {
  return { ok: false, message, fieldErrors };
}

function databaseErrorState(error: { code?: string | null }, fallback = "保存できませんでした。入力内容を確認してください。") {
  if (error.code === "23505") return invalidState(fallback);
  if (error.code === "23503") return invalidState("選択した関連データが存在しません。");
  return invalidState("GPSデータを保存できませんでした。しばらくしてから再試行してください。");
}

function logGpsMutationError(event: string, error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code || "unknown")
      : "unknown";
  console.error("[gps-mutation]", event, { code });
}

function revalidateGpsPaths() {
  revalidatePath("/admin/gps");
  revalidatePath("/admin/gps/customers");
  revalidatePath("/admin/gps/vehicles");
  revalidatePath("/admin/gps/devices");
}

async function beginAudit(
  context: Extract<Awaited<ReturnType<typeof getGpsMutationContext>>, { ok: true }>,
  entity: GpsAdminAuditEntity,
  action: GpsAdminAuditAction,
  recordId: string
) {
  try {
    return await beginGpsAdminAudit(context.supabase, {
      actorProfileId: context.admin.id,
      entity,
      action,
      recordId
    });
  } catch (error) {
    if (error instanceof GpsAuditUnavailableError) return null;
    throw error;
  }
}
