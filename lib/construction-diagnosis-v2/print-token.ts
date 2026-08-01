import { createHash, randomBytes } from "node:crypto";

export const DIAGNOSIS_PRINT_TOKEN_DAYS = 30;

export function createDiagnosisPrintToken() {
  return randomBytes(32).toString("base64url");
}

export function hashDiagnosisPrintToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isDiagnosisPrintToken(value: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function getDiagnosisPrintExpiry(now = new Date()) {
  return new Date(now.getTime() + DIAGNOSIS_PRINT_TOKEN_DAYS * 24 * 60 * 60 * 1000);
}

export function isDiagnosisPrintTokenExpired(expiresAt: string | null | undefined, now = new Date()) {
  if (!expiresAt) return true;
  const timestamp = new Date(expiresAt).getTime();
  return Number.isNaN(timestamp) || timestamp <= now.getTime();
}
