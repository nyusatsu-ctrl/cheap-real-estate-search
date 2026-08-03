import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeNextUrl(origin: string, next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/admin")) {
    return new URL("/dashboard", origin);
  }
  return new URL(next, origin);
}

function getInvalidLinkUrl(origin: string, next: string | null) {
  const path = next === "/reset-password" ? "/forgot-password" : "/login";
  return new URL(`${path}?error=auth_link_invalid`, origin);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next");

  if (errorDescription) {
    return NextResponse.redirect(getInvalidLinkUrl(requestUrl.origin, next));
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = supabase ? await supabase.auth.exchangeCodeForSession(code) : { error: new Error("Supabase is not configured.") };

    if (error) {
      return NextResponse.redirect(getInvalidLinkUrl(requestUrl.origin, next));
    }
  }

  return NextResponse.redirect(getSafeNextUrl(requestUrl.origin, next));
}
