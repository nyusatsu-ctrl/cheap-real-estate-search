import { createHmac, randomBytes } from "node:crypto";
import { parseJt808Frame } from "./parser.mjs";

export const INGEST_TIMESTAMP_HEADER = "x-mv930g-timestamp";
export const INGEST_NONCE_HEADER = "x-mv930g-nonce";
export const INGEST_SIGNATURE_HEADER = "x-mv930g-signature";
export const INGEST_MAX_RESPONSE_BYTES = 64 * 1024;

export function createSignedIngestRequest({ body, secret, now = Date.now(), nonce }) {
  assertSecret(secret);
  const timestamp = String(now);
  const safeNonce = nonce ?? randomBytes(24).toString("base64url");
  if (!/^[A-Za-z0-9_-]{24,128}$/.test(safeNonce)) throw new TypeError("Invalid ingest nonce.");
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${safeNonce}.${body}`)
    .digest("hex");
  return {
    [INGEST_TIMESTAMP_HEADER]: timestamp,
    [INGEST_NONCE_HEADER]: safeNonce,
    [INGEST_SIGNATURE_HEADER]: signature
  };
}

export async function forwardIngest(payload, options) {
  const endpoint = validateEndpoint(options.endpoint);
  const body = JSON.stringify(payload);
  const signedHeaders = createSignedIngestRequest({ body, secret: options.secret });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);

  try {
    const response = await (options.fetchImpl ?? fetch)(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        ...signedHeaders
      },
      body,
      signal: controller.signal,
      redirect: "error"
    });
    const responseText = await response.text();
    if (Buffer.byteLength(responseText) > INGEST_MAX_RESPONSE_BYTES) {
      throw new Error("ingest_response_too_large");
    }
    if (!response.ok) throw new Error(`ingest_http_${response.status}`);

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      throw new Error("ingest_response_invalid_json");
    }
    if (!parsed || parsed.accepted !== true) throw new Error("ingest_response_not_accepted");
    const ack = parsed.ackBase64 == null ? null : decodeAck(parsed.ackBase64, payload.frameBase64);
    return {
      ack,
      bindConnection: parsed.bindConnection === true,
      connectionAuthenticated: parsed.connectionAuthenticated === true,
      closeConnection: parsed.closeConnection === true
    };
  } finally {
    clearTimeout(timeout);
  }
}

function decodeAck(value, requestFrameBase64) {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error("ingest_ack_invalid");
  }
  const ack = Buffer.from(value, "base64");
  if (ack.length === 0 || ack.length > 4 * 1024 || ack.toString("base64") !== value) {
    throw new Error("ingest_ack_invalid");
  }
  const requestFrame = Buffer.from(String(requestFrameBase64 ?? ""), "base64");
  validateIngestAck(ack, requestFrame);
  return ack;
}

export function validateIngestAck(ack, requestFrame) {
  let response;
  let request;
  try {
    response = parseJt808Frame(ack);
    request = parseJt808Frame(requestFrame);
  } catch {
    throw new Error("ingest_ack_invalid");
  }
  if (response.terminalId !== request.terminalId) throw new Error("ingest_ack_terminal_mismatch");
  const body = response.body;
  if (request.messageId === 0x0100) {
    if (response.messageId !== 0x8100 || body.length < 3 || body.readUInt16BE(0) !== request.serialNumber) {
      throw new Error("ingest_ack_invalid");
    }
    return true;
  }
  if (
    response.messageId !== 0x8001
    || body.length !== 5
    || body.readUInt16BE(0) !== request.serialNumber
    || body.readUInt16BE(2) !== request.messageId
  ) {
    throw new Error("ingest_ack_invalid");
  }
  return true;
}

function validateEndpoint(value) {
  const endpoint = new URL(value);
  if (endpoint.protocol !== "https:") throw new TypeError("MV930G ingest endpoint must use HTTPS.");
  return endpoint;
}

function assertSecret(secret) {
  if (typeof secret !== "string" || Buffer.byteLength(secret) < 32) {
    throw new TypeError("MV930G ingest HMAC secret must be at least 32 bytes.");
  }
}
