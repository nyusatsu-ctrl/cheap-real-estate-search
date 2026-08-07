import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export class GpsAdminClientConfigurationError extends Error {
  constructor() {
    super("GPS database configuration is unavailable.");
    this.name = "GpsAdminClientConfigurationError";
  }
}

export function createGpsAdminServiceRoleClient(
  env: Record<string, string | undefined> = process.env
): SupabaseClient {
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new GpsAdminClientConfigurationError();
  }

  try {
    const parsedUrl = new URL(supabaseUrl);
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new GpsAdminClientConfigurationError();
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}
