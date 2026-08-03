import { redirect } from "next/navigation";
import {
  evaluatePropertyAccess,
  propertyAccessRedirectReason,
  type PropertyAccessDecision
} from "@/lib/property-access";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export type CurrentMember = {
  id: string;
  email: string;
  role: string;
  subscriptionStatus: string;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  isTrialExpired: boolean;
  access: PropertyAccessDecision;
};

export async function getCurrentMember(): Promise<CurrentMember | null> {
  const startedAt = Date.now();
  if (!hasSupabaseEnv()) {
    return getDemoMember();
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const authStartedAt = Date.now();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const authDurationMs = Date.now() - authStartedAt;

  if (!user) {
    logMemberPerformance(startedAt, authDurationMs, 0, 1, "anonymous");
    return null;
  }

  const profileStartedAt = Date.now();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "role, email, subscription_status, trial_started_at, trial_ends_at, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id"
    )
    .eq("id", user.id)
    .single();
  const profileDurationMs = Date.now() - profileStartedAt;

  const subscriptionStatus = profile?.subscription_status ?? "unknown";
  const trialStartedAt = profile?.trial_started_at ?? null;
  const trialEndsAt = profile?.trial_ends_at ?? null;
  const currentPeriodEnd = profile?.current_period_end ?? null;
  const cancelAtPeriodEnd = Boolean(profile?.cancel_at_period_end);
  const access = evaluatePropertyAccess({
    role: profile?.role ?? "viewer",
    subscriptionStatus,
    trialStartedAt,
    trialEndsAt,
    currentPeriodEnd,
    cancelAtPeriodEnd
  });

  const member = {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    role: profile?.role ?? "viewer",
    subscriptionStatus,
    trialStartedAt,
    trialEndsAt,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    stripeCustomerId: profile?.stripe_customer_id ?? null,
    stripeSubscriptionId: profile?.stripe_subscription_id ?? null,
    isTrialExpired: access.reason === "trial_expired",
    access
  };
  logMemberPerformance(startedAt, authDurationMs, profileDurationMs, 2, "authenticated");
  return member;
}

export async function requireMember() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  return member;
}

export async function requireActiveMember() {
  const member = await requireMember();
  if (!member.access.allowed) {
    redirect(`/billing?access=${propertyAccessRedirectReason(member.access)}`);
  }
  return member;
}

function getDemoMember(): CurrentMember | null {
  const state = process.env.PROPERTY_DEMO_STATE ?? "trial";
  if (state === "anonymous") return null;

  const now = Date.now();
  const day = 86_400_000;
  const trialStartTime = state === "expired"
    ? now - 15 * day
    : state === "last-day"
      ? now - 13.5 * day
      : state === "warning"
        ? now - 11 * day
        : now;
  const trialEndTime = state === "expired"
    ? now - day
    : state === "last-day"
      ? now + 0.5 * day
      : state === "warning"
        ? now + 3 * day
        : now + 14 * day;
  const trialStartedAt = new Date(trialStartTime).toISOString();
  const trialEndsAt = new Date(trialEndTime).toISOString();
  const subscriptionStatus = state.startsWith("active") ? "active" : state === "past_due" ? "past_due" : "trialing";
  const currentPeriodEnd = state.startsWith("active") ? new Date(now + 30 * 86_400_000).toISOString() : null;
  const input = {
    role: state === "admin" ? "admin" : "viewer",
    subscriptionStatus,
    trialStartedAt,
    trialEndsAt,
    currentPeriodEnd,
    cancelAtPeriodEnd: state === "active-canceling"
  };
  const access = evaluatePropertyAccess(input);

  return {
    id: "demo-user",
    email: "demo@example.com",
    role: input.role,
    subscriptionStatus,
    trialStartedAt,
    trialEndsAt,
    currentPeriodEnd,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    stripeCustomerId: state.startsWith("active") ? "demo-customer" : null,
    stripeSubscriptionId: state.startsWith("active") ? "demo-subscription" : null,
    isTrialExpired: access.reason === "trial_expired",
    access
  };
}

function logMemberPerformance(
  startedAt: number,
  authDurationMs: number,
  profileDurationMs: number,
  queryCount: number,
  outcome: "anonymous" | "authenticated"
) {
  console.info("[property-performance] member lookup completed", {
    durationMs: Date.now() - startedAt,
    authDurationMs,
    profileDurationMs,
    queryCount,
    outcome
  });
}
