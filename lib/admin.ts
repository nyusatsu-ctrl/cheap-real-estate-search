import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseServiceRoleClient, hasSupabaseEnv } from "@/lib/supabase/server";

const ADMIN_AUTH_DEBUG = process.env.ADMIN_AUTH_DEBUG === "1" || process.env.NODE_ENV === "development";

function logAdminAuthDebug(message: string, details: Record<string, unknown> = {}) {
  if (!ADMIN_AUTH_DEBUG) return;
  console.info("[admin-auth]", message, details);
}

export async function getCurrentAdmin() {
  if (!hasSupabaseEnv()) {
    logAdminAuthDebug("missing_supabase_env");
    return null;
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    logAdminAuthDebug("missing_supabase_client");
    return null;
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  logAdminAuthDebug("get_user", {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    error: userError?.message ?? null
  });

  if (!user) return null;

  const profileClient = createSupabaseServiceRoleClient() ?? supabase;
  const { data, error: profileError } = await profileClient.from("profiles").select("role, email").eq("id", user.id).single();
  logAdminAuthDebug("profile_lookup", {
    userId: user.id,
    profileEmail: data?.email ?? null,
    role: data?.role ?? null,
    error: profileError?.message ?? null
  });

  if (data?.role !== "admin") return null;

  return { id: user.id, email: data.email ?? user.email ?? "" };
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
