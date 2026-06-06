import { redirect } from "next/navigation";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export type CurrentMember = {
  id: string;
  email: string;
  role: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  isTrialExpired: boolean;
};

export function isTrialExpired(subscriptionStatus: string, trialEndsAt: string | null) {
  if (subscriptionStatus !== "trialing" || !trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() <= Date.now();
}

export async function getCurrentMember(): Promise<CurrentMember | null> {
  if (!hasSupabaseEnv()) {
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    return {
      id: "demo-user",
      email: "demo@example.com",
      role: "viewer",
      subscriptionStatus: "trialing",
      trialEndsAt,
      isTrialExpired: false
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email, subscription_status, trial_ends_at")
    .eq("id", user.id)
    .single();

  const subscriptionStatus = profile?.subscription_status ?? "trialing";
  const trialEndsAt = profile?.trial_ends_at ?? null;

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    role: profile?.role ?? "viewer",
    subscriptionStatus,
    trialEndsAt,
    isTrialExpired: isTrialExpired(subscriptionStatus, trialEndsAt)
  };
}

export async function requireMember() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  return member;
}

export async function requireActiveMember() {
  const member = await requireMember();
  if (member.isTrialExpired) redirect("/billing?trial=expired");
  return member;
}
