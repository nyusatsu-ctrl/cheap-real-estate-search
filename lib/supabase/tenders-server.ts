import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

export function createTenderSupabaseServiceRoleClient() {
  const supabaseUrl = getTenderSupabaseUrl();
  const serviceRoleKey = getTenderSupabaseServiceRoleKey();
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

export function getTenderSupabaseConfigStatus() {
  const supabaseUrl = getTenderSupabaseUrl();
  const anonKey = getTenderSupabaseAnonKey();
  const serviceRoleKey = getTenderSupabaseServiceRoleKey();

  return {
    hasUrl: Boolean(supabaseUrl),
    projectRef: supabaseUrl ? parseProjectRef(supabaseUrl) : null,
    hasAnonKey: Boolean(anonKey),
    anonKeyFormat: keyFormat(anonKey),
    hasServiceRoleKey: Boolean(serviceRoleKey),
    serviceRoleKeyFormat: keyFormat(serviceRoleKey)
  };
}

export async function createTenderSupabaseServerClient() {
  const supabaseUrl = getTenderSupabaseUrl();
  const supabaseAnonKey = getTenderSupabaseAnonKey();
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
  });
}

function getTenderSupabaseUrl() {
  return process.env.TENDER_SUPABASE_URL;
}

function getTenderSupabaseAnonKey() {
  return process.env.TENDER_SUPABASE_ANON_KEY;
}

function getTenderSupabaseServiceRoleKey() {
  return process.env.TENDER_SUPABASE_SERVICE_ROLE_KEY;
}

function parseProjectRef(value: string) {
  try {
    return new URL(value).hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

function keyFormat(value: string | undefined) {
  if (!value) return "missing";
  if (value.startsWith("sb_publishable_")) return "sb_publishable";
  if (value.startsWith("sb_secret_")) return "sb_secret";
  if (value.startsWith("eyJ")) return "jwt";
  return "other";
}
