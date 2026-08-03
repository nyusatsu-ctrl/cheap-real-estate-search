import { NextResponse } from "next/server";
import { getMemberAuthErrorMessage } from "@/lib/property-signup";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getSafeNextUrl(origin: string, next: string | null) {
  if (!next || !next.startsWith("/")) return new URL("/dashboard", origin);
  return new URL(next, origin);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next");

  if (errorDescription) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(getMemberAuthErrorMessage(errorDescription))}`, requestUrl.origin));
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = supabase ? await supabase.auth.exchangeCodeForSession(code) : { error: new Error("Supabase is not configured.") };

    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(getMemberAuthErrorMessage(error.message))}`, requestUrl.origin));
    }
  }

  return NextResponse.redirect(getSafeNextUrl(requestUrl.origin, next));
}
