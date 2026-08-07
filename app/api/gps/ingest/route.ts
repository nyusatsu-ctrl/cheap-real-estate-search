import { NextRequest } from "next/server";
import { ingestRawDeviceLog, DatabaseOperationError } from "@/lib/gps/ingest";
import {
  GPS_INGEST_MAX_BODY_BYTES,
  reserveGpsIngestNonce,
  verifyGpsIngestSignature
} from "@/lib/gps/ingest-security";
import {
  createGpsAdminServiceRoleClient,
  GpsAdminClientConfigurationError
} from "@/lib/gps/server-admin-client";
import { JT808_MAX_FRAME_BYTES } from "@/server/mv930g/parser.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isHttpsRequest(request)) return safeError(400, "https_required");
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") return safeError(415, "content_type_invalid");

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > GPS_INGEST_MAX_BODY_BYTES) {
    return safeError(413, "body_too_large");
  }

  const body = await readRequestBody(request, GPS_INGEST_MAX_BODY_BYTES);
  if (body === null) return safeError(413, "body_too_large");
  const security = verifyGpsIngestSignature({
    body,
    headers: request.headers,
    secret: process.env.MV930G_INGEST_HMAC_SECRET
  });
  if (!security.ok) {
    const status = security.reason === "configuration_invalid" ? 503 : security.reason === "body_too_large" ? 413 : 401;
    return safeError(status, security.reason);
  }

  const input = parseIngestBody(body);
  if (!input) return safeError(400, "request_invalid");

  let supabase;
  try {
    supabase = createGpsAdminServiceRoleClient();
  } catch (error) {
    if (error instanceof GpsAdminClientConfigurationError) return safeError(503, "database_unavailable");
    throw error;
  }

  const nonceReservation = await reserveGpsIngestNonce(supabase, security.nonceHash);
  if (nonceReservation !== "accepted") {
    if (nonceReservation === "replayed") return safeError(409, "nonce_replayed");
    logIngestError("nonce_store_failed");
    return safeError(503, "database_unavailable");
  }

  try {
    const result = await ingestRawDeviceLog(supabase, input);
    return Response.json({
      accepted: true,
      ackBase64: result.ack?.toString("base64") ?? null,
      bindConnection: result.bindConnection,
      connectionAuthenticated: result.connectionAuthenticated,
      closeConnection: result.closeConnection
    });
  } catch (error) {
    if (error instanceof DatabaseOperationError) {
      logIngestError(error.code);
      return safeError(503, "database_unavailable");
    }
    logIngestError("unexpected_ingest_failure");
    return safeError(500, "ingest_failed");
  }
}

function parseIngestBody(body: string) {
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (input.version !== 1 || input.transport !== "tcp" || typeof input.frameBase64 !== "string") return null;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(input.frameBase64)) return null;
  const raw = Buffer.from(input.frameBase64, "base64");
  if (raw.length < 2 || raw.length > JT808_MAX_FRAME_BYTES || raw.toString("base64") !== input.frameBase64) return null;
  const remoteAddress = optionalText(input.remoteAddress, 64);
  const remotePort = optionalPort(input.remotePort);
  const localPort = optionalPort(input.localPort);
  const connectionTerminalId = input.connectionTerminalId == null
    ? null
    : typeof input.connectionTerminalId === "string" && /^\d{12}$/.test(input.connectionTerminalId)
      ? input.connectionTerminalId
      : undefined;
  if (remoteAddress === undefined || remotePort === undefined || localPort === undefined || connectionTerminalId === undefined) {
    return null;
  }
  return {
    transport: "tcp" as const,
    raw,
    remoteAddress,
    remotePort,
    localPort,
    connectionTerminalId,
    connectionAuthenticated: input.connectionAuthenticated === true
  };
}

function optionalText(value: unknown, maximum: number) {
  if (value == null) return null;
  if (typeof value !== "string" || value.length > maximum) return undefined;
  return value;
}

function optionalPort(value: unknown) {
  if (value == null) return null;
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 65535 ? Number(value) : undefined;
}

function safeError(status: number, code: string) {
  return Response.json({ accepted: false, code }, { status });
}

async function readRequestBody(request: Request, maximumBytes: number) {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}

function isHttpsRequest(request: Request) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim().toLowerCase();
  if (forwardedProtocol) return forwardedProtocol === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

function logIngestError(event: string, error?: { code?: string | null }) {
  console.error("[mv930g-ingest]", event, { code: String(error?.code || "unknown") });
}
