export const PROPERTY_TRIAL_DAYS = 14;
export const PROPERTY_MONTHLY_PRICE_YEN = 4980;
export const PROPERTY_SERVICE_CODE = "cheap_real_estate_search";
export const PROPERTY_PLAN_CODE = "monthly_4980";

export type PropertySubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | "unknown";

export type PropertyAccessInput = {
  role: string;
  subscriptionStatus: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type PropertyAccessDecision = {
  allowed: boolean;
  reason:
    | "admin"
    | "trial"
    | "active"
    | "not_authenticated"
    | "trial_expired"
    | "invalid_trial_period"
    | "paid_period_ended"
    | "payment_required"
    | "inactive_subscription";
  status: PropertySubscriptionStatus;
  remainingTrialDays: number | null;
  showTrialEndingWarning: boolean;
};

export function evaluatePropertyAccess(
  input: PropertyAccessInput | null,
  now = new Date()
): PropertyAccessDecision {
  if (!input) {
    return denied("not_authenticated", "unknown");
  }

  if (input.role === "admin") {
    return {
      allowed: true,
      reason: "admin",
      status: normalizePropertySubscriptionStatus(input.subscriptionStatus),
      remainingTrialDays: null,
      showTrialEndingWarning: false
    };
  }

  const status = normalizePropertySubscriptionStatus(input.subscriptionStatus);
  const nowTime = now.getTime();

  if (status === "trialing") {
    const startTime = validTimestamp(input.trialStartedAt);
    const endTime = validTimestamp(input.trialEndsAt);
    if (startTime === null || endTime === null || startTime > nowTime || endTime <= startTime) {
      return denied("invalid_trial_period", status);
    }
    if (endTime <= nowTime) {
      return denied("trial_expired", status);
    }

    const remainingTrialDays = Math.max(1, Math.ceil((endTime - nowTime) / 86_400_000));
    return {
      allowed: true,
      reason: "trial",
      status,
      remainingTrialDays,
      showTrialEndingWarning: remainingTrialDays <= 3
    };
  }

  if (status === "active") {
    const currentPeriodEnd = validTimestamp(input.currentPeriodEnd);
    if (currentPeriodEnd === null || currentPeriodEnd <= nowTime) {
      return denied("paid_period_ended", status);
    }
    return {
      allowed: true,
      reason: "active",
      status,
      remainingTrialDays: null,
      showTrialEndingWarning: false
    };
  }

  if (status === "past_due" || status === "unpaid" || status === "incomplete") {
    return denied("payment_required", status);
  }

  return denied("inactive_subscription", status);
}

export function normalizePropertySubscriptionStatus(value: string | null): PropertySubscriptionStatus {
  switch (value) {
    case "trialing":
    case "active":
    case "past_due":
    case "unpaid":
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return value;
    default:
      return "unknown";
  }
}

export function formatPropertyDateJst(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

export function propertyAccessRedirectReason(decision: PropertyAccessDecision) {
  if (decision.reason === "trial_expired") return "trial_expired";
  if (decision.reason === "payment_required") return "payment_required";
  if (decision.reason === "paid_period_ended") return "period_ended";
  return "inactive";
}

function denied(
  reason: Extract<PropertyAccessDecision["reason"], "not_authenticated" | "trial_expired" | "invalid_trial_period" | "paid_period_ended" | "payment_required" | "inactive_subscription">,
  status: PropertySubscriptionStatus
): PropertyAccessDecision {
  return {
    allowed: false,
    reason,
    status,
    remainingTrialDays: null,
    showTrialEndingWarning: false
  };
}

function validTimestamp(value: string | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}
