import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseServiceRoleClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { getAdminLoginPath } from "@/lib/admin-redirect";

const ADMIN_AUTH_DEBUG = process.env.ADMIN_AUTH_DEBUG === "1" || process.env.NODE_ENV === "development";

function logAdminAuthDebug(message: string, details: Record<string, unknown> = {}) {
  if (!ADMIN_AUTH_DEBUG) return;
  console.info("[admin-auth]", message, details);
}

export type AdminIdentity = {
  id: string;
  email: string;
};

export type AdminAuthState =
  | { status: "authorized"; admin: AdminIdentity }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "unavailable" };

export async function getAdminAuthState(): Promise<AdminAuthState> {
  if (!hasSupabaseEnv()) {
    logAdminAuthDebug("missing_supabase_env");
    return { status: "unavailable" };
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    logAdminAuthDebug("missing_supabase_client");
    return { status: "unavailable" };
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  logAdminAuthDebug("get_user", {
    authenticated: Boolean(user),
    errorCode: getSafeErrorCode(userError)
  });

  if (!user) return { status: "unauthenticated" };
  if (userError) return { status: "unavailable" };

  const profileClient = createSupabaseServiceRoleClient() ?? supabase;
  const { data, error: profileError } = await profileClient.from("profiles").select("role, email").eq("id", user.id).maybeSingle();
  logAdminAuthDebug("profile_lookup", {
    found: Boolean(data),
    isAdmin: data?.role === "admin",
    errorCode: getSafeErrorCode(profileError)
  });

  if (profileError) return { status: "unavailable" };
  if (data?.role !== "admin") return { status: "forbidden" };

  return {
    status: "authorized",
    admin: { id: user.id, email: data.email ?? user.email ?? "" }
  };
}

export async function getCurrentAdmin() {
  const state = await getAdminAuthState();
  return state.status === "authorized" ? state.admin : null;
}

export async function requireAdmin(nextPath?: string) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(getAdminLoginPath(nextPath));
  return admin;
}

function getSafeErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  if ("code" in error && error.code) return String(error.code);
  if ("status" in error && error.status) return String(error.status);
  return "unknown";
}
