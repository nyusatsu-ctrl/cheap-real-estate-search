import "server-only";
import { isIP } from "node:net";
import { cookies, headers } from "next/headers";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { isValidOpaqueToken, sha256 } from "@/lib/econtracts/crypto";
import { ECONTRACT_DISABLED_MESSAGE, evaluateEcontractFeatureGate } from "@/lib/econtracts/rules";
import type {
  EcontractActorKind,
  RequestEvidence,
  SalesEcontract,
  SalesEcontractAccessSession,
  SalesEcontractEvent,
  SalesEcontractVerification
} from "@/lib/econtracts/types";

export const ECONTRACT_ACCESS_COOKIE = "ecoloop_econtract_access";

export async function getEcontractRequestTime() {
  return new Date();
}

export function getEcontractFeatureStatus() {
  return evaluateEcontractFeatureGate({
    ECONTRACT_ENABLED: process.env.ECONTRACT_ENABLED,
    ECONTRACT_BASE_URL: process.env.ECONTRACT_BASE_URL,
    ECONTRACT_RESEND_API_KEY: process.env.ECONTRACT_RESEND_API_KEY,
    ECONTRACT_EMAIL_FROM: process.env.ECONTRACT_EMAIL_FROM,
    ECONTRACT_OTP_PEPPER: process.env.ECONTRACT_OTP_PEPPER
  });
}

export function isEcontractFeatureEnabled() {
  return getEcontractFeatureStatus().enabled;
}

export function requireEcontractFeatureEnabled() {
  if (!isEcontractFeatureEnabled()) throw new Error(ECONTRACT_DISABLED_MESSAGE);
}

export function requireEcontractServiceClient() {
  requireEcontractFeatureEnabled();
  const client = createSupabaseServiceRoleClient();
  if (!client) throw new Error("電子契約データベース設定が未完了です。");
  return client;
}

export async function findEcontractByToken(token: string) {
  if (!isEcontractFeatureEnabled()) return null;
  if (!isValidOpaqueToken(token)) return null;
  const client = requireEcontractServiceClient();
  const result = await client
    .from("sales_econtracts")
    .select("*")
    .eq("link_token_hash", sha256(token))
    .maybeSingle();
  if (result.error) throw result.error;
  return (result.data as SalesEcontract | null) ?? null;
}

export async function getValidAccessSession(econtractId: string, deliveryRevision: number) {
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(ECONTRACT_ACCESS_COOKIE)?.value ?? "";
  if (!isValidOpaqueToken(rawSession)) return null;
  const now = new Date().toISOString();
  const client = requireEcontractServiceClient();
  const result = await client
    .from("sales_econtract_access_sessions")
    .select("id,econtract_id,delivery_revision,expires_at,identity_confirmed_at,revoked_at")
    .eq("econtract_id", econtractId)
    .eq("delivery_revision", deliveryRevision)
    .eq("session_token_hash", sha256(rawSession))
    .is("revoked_at", null)
    .gt("expires_at", now)
    .maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) return null;
  await client.from("sales_econtract_access_sessions").update({ last_seen_at: now }).eq("id", result.data.id);
  return result.data as SalesEcontractAccessSession;
}

export async function hasValidAccessSession(econtractId: string, deliveryRevision: number) {
  return Boolean(await getValidAccessSession(econtractId, deliveryRevision));
}

export async function getLatestVerification(
  econtractId: string,
  deliveryRevision: number,
  options: { accessSessionId?: string; includeInvalidated?: boolean } = {}
) {
  const client = requireEcontractServiceClient();
  let query = client
    .from("sales_econtract_verifications")
    .select("*")
    .eq("econtract_id", econtractId)
    .eq("delivery_revision", deliveryRevision)
    .order("created_at", { ascending: false })
    .limit(1);
  if (options.accessSessionId) query = query.eq("access_session_id", options.accessSessionId);
  if (!options.includeInvalidated) query = query.is("invalidated_at", null);
  const result = await query.maybeSingle();
  if (result.error) throw result.error;
  return (result.data as SalesEcontractVerification | null) ?? null;
}

export async function insertEcontractEvent(input: {
  econtractId: string;
  eventType: string;
  actorKind: EcontractActorKind;
  actorProfileId?: string | null;
  evidence?: RequestEvidence;
  metadata?: Record<string, unknown>;
}) {
  const client = requireEcontractServiceClient();
  const result = await client.from("sales_econtract_events").insert({
    econtract_id: input.econtractId,
    event_type: input.eventType,
    actor_kind: input.actorKind,
    actor_profile_id: input.actorProfileId ?? null,
    ip_address: input.evidence?.ipAddress ?? null,
    user_agent: input.evidence?.userAgent ?? null,
    device_json: input.evidence?.device ?? null,
    metadata: input.metadata ?? {}
  });
  if (result.error) throw result.error;
}

export async function getRequestEvidence(): Promise<RequestEvidence> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const direct = requestHeaders.get("x-real-ip")?.trim() ?? "";
  return {
    ipAddress: validIp(forwarded) ? forwarded : validIp(direct) ? direct : null,
    userAgent: truncate(requestHeaders.get("user-agent"), 1000),
    device: {
      platform: truncate(requestHeaders.get("sec-ch-ua-platform"), 120) ?? "unknown",
      mobile: truncate(requestHeaders.get("sec-ch-ua-mobile"), 20) ?? "unknown",
      brands: truncate(requestHeaders.get("sec-ch-ua"), 500) ?? "unknown",
      language: truncate(requestHeaders.get("accept-language"), 200) ?? "unknown"
    }
  };
}

export async function getAdminEcontractDetail(id: string) {
  const client = requireEcontractServiceClient();
  const [contractResult, eventsResult, verificationsResult] = await Promise.all([
    client.from("sales_econtracts").select("*").eq("id", id).maybeSingle(),
    client.from("sales_econtract_events").select("*").eq("econtract_id", id).order("created_at", { ascending: true }),
    client.from("sales_econtract_verifications").select("id,econtract_id,method,destination_masked,expires_at,attempt_count,max_attempts,sent_at,resend_available_at,rate_window_started_at,resend_count,verified_at,invalidated_at,created_at,updated_at").eq("econtract_id", id).order("created_at", { ascending: false })
  ]);
  const error = contractResult.error || eventsResult.error || verificationsResult.error;
  if (error) throw error;
  return {
    contract: (contractResult.data as SalesEcontract | null) ?? null,
    events: (eventsResult.data ?? []) as SalesEcontractEvent[],
    verifications: verificationsResult.data ?? []
  };
}

function validIp(value: string) {
  return value.length <= 45 && isIP(value) !== 0;
}

function truncate(value: string | null, max: number) {
  if (!value) return null;
  return value.slice(0, max);
}
