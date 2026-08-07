export const INGEST_TIMESTAMP_HEADER: string;
export const INGEST_NONCE_HEADER: string;
export const INGEST_SIGNATURE_HEADER: string;
export const INGEST_MAX_RESPONSE_BYTES: number;

export function createSignedIngestRequest(input: {
  body: string;
  secret: string;
  now?: number;
  nonce?: string;
}): Record<string, string>;

export function validateIngestAck(ack: Buffer, requestFrame: Buffer): true;

export function forwardIngest(
  payload: Record<string, unknown>,
  options: {
    endpoint: string;
    secret: string;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
  }
): Promise<{
  ack: Buffer | null;
  bindConnection: boolean;
  connectionAuthenticated: boolean;
  closeConnection: boolean;
}>;
