import { redirect } from "next/navigation";
import { createSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export async function getCurrentAdmin() {
  if (!hasSupabaseEnv()) return null;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase.from("profiles").select("role, email").eq("id", user.id).single();
  if (data?.role !== "admin") return null;

  return { id: user.id, email: data.email ?? user.email ?? "" };
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
