import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  INGEST_NONCE_HEADER,
  INGEST_SIGNATURE_HEADER,
  INGEST_TIMESTAMP_HEADER
} from "../../server/mv930g/ingest-client.mjs";

export const GPS_INGEST_MAX_BODY_BYTES = 12 * 1024;
export const GPS_INGEST_MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export type GpsIngestSecurityFailure =
  | "body_too_large"
  | "credentials_missing"
  | "timestamp_invalid"
  | "timestamp_expired"
  | "nonce_invalid"
  | "signature_invalid"
  | "configuration_invalid";

export function verifyGpsIngestSignature(input: {
  body: string;
  headers: Pick<Headers, "get">;
  secret: string | undefined;
  now?: number;
}): { ok: true; nonceHash: string } | { ok: false; reason: GpsIngestSecurityFailure } {
  if (Buffer.byteLength(input.body) > GPS_INGEST_MAX_BODY_BYTES) return { ok: false, reason: "body_too_large" };
  if (!input.secret || Buffer.byteLength(input.secret) < 32) return { ok: false, reason: "configuration_invalid" };

  const timestamp = input.headers.get(INGEST_TIMESTAMP_HEADER);
  const nonce = input.headers.get(INGEST_NONCE_HEADER);
  const signature = input.headers.get(INGEST_SIGNATURE_HEADER);
  if (!timestamp || !nonce || !signature) return { ok: false, reason: "credentials_missing" };
  if (!/^\d{13}$/.test(timestamp)) return { ok: false, reason: "timestamp_invalid" };
  const timestampValue = Number(timestamp);
  if (!Number.isSafeInteger(timestampValue)) return { ok: false, reason: "timestamp_invalid" };
  if (Math.abs((input.now ?? Date.now()) - timestampValue) > GPS_INGEST_MAX_CLOCK_SKEW_MS) {
    return { ok: false, reason: "timestamp_expired" };
  }
  if (!/^[A-Za-z0-9_-]{24,128}$/.test(nonce)) return { ok: false, reason: "nonce_invalid" };
  if (!/^[a-f0-9]{64}$/.test(signature)) return { ok: false, reason: "signature_invalid" };

  const expected = createHmac("sha256", input.secret)
    .update(`${timestamp}.${nonce}.${input.body}`)
    .digest();
  const received = Buffer.from(signature, "hex");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return { ok: false, reason: "signature_invalid" };
  }

  return { ok: true, nonceHash: createHash("sha256").update(nonce).digest("hex") };
}

export async function reserveGpsIngestNonce(
  client: {
    rpc(
      functionName: "mv930g_reserve_ingest_nonce",
      parameters: { p_nonce_hash: string }
    ): PromiseLike<{ data: boolean | null; error: { code?: string | null } | null }>;
  },
  nonceHash: string
): Promise<"accepted" | "replayed" | "unavailable"> {
  const reservation = await client.rpc("mv930g_reserve_ingest_nonce", {
    p_nonce_hash: nonceHash
  });
  if (reservation.error || typeof reservation.data !== "boolean") return "unavailable";
  return reservation.data ? "accepted" : "replayed";
}
