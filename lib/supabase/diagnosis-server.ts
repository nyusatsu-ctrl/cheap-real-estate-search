import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

export const EXPECTED_DIAGNOSIS_PROJECT_REF = "kfhjnesoyxljqailuhig";

export type DiagnosisKeyFormat = "sb_publishable" | "sb_secret" | "jwt" | "missing" | "other";

export function hasDiagnosisSupabaseEnv() {
  return Boolean(getDiagnosisSupabaseUrl() && getDiagnosisSupabaseAnonKey());
}

export function createDiagnosisSupabaseServiceRoleClient() {
  const supabaseUrl = getDiagnosisSupabaseUrl();
  if (!supabaseUrl || !process.env.DIAGNOSIS_SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(
    supabaseUrl,
    process.env.DIAGNOSIS_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

export async function createDiagnosisSupabaseServerClient() {
  const supabaseUrl = getDiagnosisSupabaseUrl();
  const supabaseAnonKey = getDiagnosisSupabaseAnonKey();
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot write refreshed cookies; Server Actions and Route Handlers can.
          }
        }
      }
    }
  );
}

export function getDiagnosisProjectRef() {
  return extractProjectRef(getDiagnosisSupabaseUrl());
}

export function getDiagnosisAnonKeyFormat(): DiagnosisKeyFormat {
  return getKeyFormat(getDiagnosisSupabaseAnonKey(), "anon");
}

export function getDiagnosisServiceRoleKeyFormat(): DiagnosisKeyFormat {
  return getKeyFormat(process.env.DIAGNOSIS_SUPABASE_SERVICE_ROLE_KEY, "service_role");
}

function getDiagnosisSupabaseUrl() {
  return process.env.DIAGNOSIS_SUPABASE_URL;
}

function getDiagnosisSupabaseAnonKey() {
  return process.env.DIAGNOSIS_SUPABASE_ANON_KEY;
}

function extractProjectRef(value?: string) {
  if (!value) return null;
  try {
    const host = new URL(value).hostname;
    const suffix = ".supabase.co";
    if (!host.endsWith(suffix)) return null;
    const projectRef = host.slice(0, -suffix.length);
    return projectRef || null;
  } catch {
    return null;
  }
}

function getKeyFormat(value: string | undefined, expected: "anon" | "service_role"): DiagnosisKeyFormat {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "missing";
  if (expected === "anon" && normalized.startsWith("sb_publishable_")) return "sb_publishable";
  if (expected === "service_role" && normalized.startsWith("sb_secret_")) return "sb_secret";
  if (normalized.startsWith("eyJ")) return "jwt";
  return "other";
}
