import { redirect } from "next/navigation";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export type CurrentMember = {
  id: string;
  email: string;
  role: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
};

export async function getCurrentMember(): Promise<CurrentMember | null> {
  if (!hasSupabaseEnv()) {
    return {
      id: "demo-user",
      email: "demo@example.com",
      role: "viewer",
      subscriptionStatus: "trialing",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
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

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    role: profile?.role ?? "viewer",
    subscriptionStatus: profile?.subscription_status ?? "trialing",
    trialEndsAt: profile?.trial_ends_at ?? null
  };
}

export async function requireMember() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  return member;
}
