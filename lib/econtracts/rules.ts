import type { EcontractKind, EcontractStatus, VehicleConfirmationTerms } from "./types";

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
  purchase_intent: "第1契約：購入手続継続確認",
  vehicle_confirmation: "第2契約：個別車両購入確認"
};

export const ECONTRACT_STATUS_LABELS: Record<EcontractStatus, string> = {
  draft: "送信準備中",
  sent: "送信済",
  opened: "開封済",
  verified: "本人認証済",
  signed: "署名済",
  cancelled: "取消済"
};

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

export function validateVehicleConfirmationTerms(terms: VehicleConfirmationTerms) {
  const errors: string[] = [];
  if (!terms.maker) errors.push("メーカーを入力してください。");
  if (!terms.model) errors.push("車名を入力してください。");
  if (!terms.firstRegistration) errors.push("初度登録／年式を入力してください。");
  if (!Number.isInteger(terms.mileage) || terms.mileage < 0) errors.push("走行距離を0以上の整数で入力してください。");
  if (terms.chassisNumberStatus === "confirmed" && !terms.chassisNumber) errors.push("確定済みの車台番号を入力してください。");
  if (terms.vehiclePrice < 0 || terms.fees < 0 || terms.totalPrice <= 0) errors.push("価格・諸費用・支払総額を正しく入力してください。");
  if (terms.vehiclePrice + terms.fees !== terms.totalPrice) errors.push("車両本体価格と諸費用の合計を支払総額と一致させてください。");
  if (terms.downPayment < 0 || terms.tradeInAmount < 0 || terms.financedAmount < 0) errors.push("頭金・下取充当額・ローン等申込額を正しく入力してください。");
  if (terms.downPayment + terms.tradeInAmount + terms.financedAmount !== terms.totalPrice) errors.push("頭金・下取充当額・ローン等申込額の合計を支払総額と一致させてください。");
  if (!Number.isInteger(terms.installmentCount) || terms.installmentCount <= 0) errors.push("支払回数を1以上で入力してください。");
  if (terms.firstPaymentAmount < 0 || terms.monthlyPayment < 0) errors.push("支払額を0以上で入力してください。");
  if (!terms.deliveryMethod) errors.push("納車方法を入力してください。");
  if (!terms.deliveryEstimate) errors.push("納車予定を入力してください。");
  return Array.from(new Set(errors));
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
