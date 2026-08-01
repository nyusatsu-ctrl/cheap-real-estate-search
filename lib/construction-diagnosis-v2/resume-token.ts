import { createHash, randomBytes } from "node:crypto";

export const DIAGNOSIS_RESUME_TOKEN_DAYS = 30;

export function createDiagnosisResumeToken() {
  return randomBytes(32).toString("base64url");
}

export function hashDiagnosisResumeToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isDiagnosisResumeToken(value: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function getDiagnosisResumeExpiry(now = new Date()) {
  return new Date(now.getTime() + DIAGNOSIS_RESUME_TOKEN_DAYS * 24 * 60 * 60 * 1000);
}

export function isDiagnosisResumeExpired(expiresAt: string | null | undefined, now = new Date()) {
  if (!expiresAt) return true;
  const timestamp = new Date(expiresAt).getTime();
  return Number.isNaN(timestamp) || timestamp <= now.getTime();
}
