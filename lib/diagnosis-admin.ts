import { redirect } from "next/navigation";
import {
  createDiagnosisSupabaseServerClient,
  createDiagnosisSupabaseServiceRoleClient,
  hasDiagnosisSupabaseEnv
} from "@/lib/supabase/diagnosis-server";

const ADMIN_AUTH_DEBUG = process.env.ADMIN_AUTH_DEBUG === "1" || process.env.NODE_ENV === "development";

function logDiagnosisAdminAuthDebug(message: string, details: Record<string, unknown> = {}) {
  if (!ADMIN_AUTH_DEBUG) return;
  console.info("[diagnosis-admin-auth]", message, details);
}

export async function getCurrentDiagnosisAdmin() {
  if (!hasDiagnosisSupabaseEnv()) {
    logDiagnosisAdminAuthDebug("missing_diagnosis_supabase_env");
    return null;
  }

  const supabase = await createDiagnosisSupabaseServerClient();
  if (!supabase) {
    logDiagnosisAdminAuthDebug("missing_diagnosis_supabase_client");
    return null;
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  logDiagnosisAdminAuthDebug("get_user", {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    error: userError?.message ?? null
  });

  if (!user) return null;

  const profileClient = createDiagnosisSupabaseServiceRoleClient() ?? supabase;
  const { data, error: profileError } = await profileClient.from("profiles").select("role, email").eq("id", user.id).single();
  logDiagnosisAdminAuthDebug("profile_lookup", {
    userId: user.id,
    profileEmail: data?.email ?? null,
    role: data?.role ?? null,
    error: profileError?.message ?? null
  });

  if (data?.role !== "admin") return null;

  return { id: user.id, email: data.email ?? user.email ?? "" };
}

function getAdminLoginPath(nextPath?: string) {
  const path = String(nextPath ?? "").trim();
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/admin/login")) {
    return "/admin/login";
  }
  const params = new URLSearchParams({ next: path });
  return `/admin/login?${params.toString()}`;
}

export async function requireDiagnosisAdmin(nextPath?: string) {
  const admin = await getCurrentDiagnosisAdmin();
  if (!admin) redirect(getAdminLoginPath(nextPath));
  return admin;
}
