import type { EcontractKind, EcontractStatus } from "./types";

export const ECONTRACT_DISABLED_MESSAGE = "電子契約機能は現在無効です";

export const ECONTRACT_REQUIRED_CONFIG_KEYS = [
  "ECONTRACT_BASE_URL",
  "ECONTRACT_RESEND_API_KEY",
  "ECONTRACT_EMAIL_FROM",
  "ECONTRACT_OTP_PEPPER"
] as const;

type EcontractRequiredConfigKey = typeof ECONTRACT_REQUIRED_CONFIG_KEYS[number];
type EcontractFeatureEnvironment = Partial<Record<"ECONTRACT_ENABLED" | EcontractRequiredConfigKey, string>>;

export function evaluateEcontractFeatureGate(environment: EcontractFeatureEnvironment) {
  const explicitlyEnabled = environment.ECONTRACT_ENABLED === "true";
  const missingKeys = ECONTRACT_REQUIRED_CONFIG_KEYS.filter((key) => !environment[key]?.trim());
  return {
    explicitlyEnabled,
    enabled: explicitlyEnabled && missingKeys.length === 0,
    missingKeys
  };
}

export const ECONTRACT_KIND_LABELS: Record<EcontractKind, string> = {
  purchase_intent: "電子契約",
  vehicle_confirmation: "過去の電子契約証跡"
};

export const ECONTRACT_STATUS_LABELS: Record<EcontractStatus, string> = {
  draft: "未送信",
  sent: "送信済み",
  opened: "本人確認／OTP待ち",
  verified: "契約締結待ち",
  signed: "締結済み",
  cancelled: "取消済"
};

type EcontractLoanEligibility = {
  contractType: string | null | undefined;
};

export function canIssueLoanEcontract(input: EcontractLoanEligibility) {
  return input.contractType === "loan";
}

export function getEcontractStatusLabel(status: EcontractStatus, linkExpiresAt?: string | null, now = Date.now()) {
  if (
    linkExpiresAt
    && status !== "draft"
    && status !== "signed"
    && status !== "cancelled"
    && getEcontractAvailability(status, linkExpiresAt, now) === "expired"
  ) {
    return "期限切れ";
  }
  return ECONTRACT_STATUS_LABELS[status];
}

export function isActiveEcontractStatus(status: EcontractStatus) {
  return status === "draft" || status === "sent" || status === "opened" || status === "verified";
}

export function canResendEcontract(status: EcontractStatus) {
  return status === "draft" || status === "sent" || status === "opened" || status === "verified";
}

export type EcontractAvailability = "available" | "expired" | "cancelled" | "signed";

export function getEcontractAvailability(status: EcontractStatus, linkExpiresAt: string, now = Date.now()): EcontractAvailability {
  if (status === "signed") return "signed";
  if (status === "cancelled") return "cancelled";
  if (!Number.isFinite(new Date(linkExpiresAt).getTime()) || new Date(linkExpiresAt).getTime() <= now) return "expired";
  return "available";
}

export type OtpChallengeAvailability = "pending" | "missing" | "invalidated" | "verified" | "expired" | "locked";

export function getOtpChallengeAvailability(
  verification: { invalidated_at: string | null; verified_at: string | null; expires_at: string; attempt_count: number; max_attempts: number } | null,
  now = Date.now()
): OtpChallengeAvailability {
  if (!verification) return "missing";
  if (verification.invalidated_at) return "invalidated";
  if (verification.verified_at) return "verified";
  if (!Number.isFinite(new Date(verification.expires_at).getTime()) || new Date(verification.expires_at).getTime() <= now) return "expired";
  if (verification.attempt_count >= verification.max_attempts) return "locked";
  return "pending";
}

export function validateConsentIds(expectedIds: string[], receivedIds: string[]) {
  if (receivedIds.length !== expectedIds.length) return false;
  const received = new Set(receivedIds);
  return expectedIds.every((id) => received.has(id));
}

export function getEcontractStatusClass(status: EcontractStatus) {
  if (status === "signed") return "bg-emerald-100 text-emerald-900";
  if (status === "verified") return "bg-sky-100 text-sky-900";
  if (status === "opened") return "bg-indigo-100 text-indigo-900";
  if (status === "sent") return "bg-amber-100 text-amber-900";
  if (status === "cancelled") return "bg-slate-200 text-slate-700";
  return "bg-violet-100 text-violet-900";
}
