import { NextResponse } from "next/server";
import {
  getPropertyAuthCallbackDestination,
  getPropertyAuthCallbackFlow,
  type PropertyAuthCallbackOutcome
} from "@/lib/property-signup";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getCallbackUrl(origin: string, next: string | null, outcome: PropertyAuthCallbackOutcome) {
  const destination = getPropertyAuthCallbackDestination(next, outcome);
  const url = new URL(destination.path, origin);
  if (destination.key && destination.code) {
    url.searchParams.set(destination.key, destination.code);
  }
  return url;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next");
  const flow = getPropertyAuthCallbackFlow(next);

  if (errorDescription) {
    console.warn("[property-auth] callback provider error", { flow });
    return NextResponse.redirect(getCallbackUrl(requestUrl.origin, next, "failure"));
  }

  if (!code) {
    console.warn("[property-auth] callback missing code", { flow });
    return NextResponse.redirect(getCallbackUrl(requestUrl.origin, next, "failure"));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = supabase
    ? await supabase.auth.exchangeCodeForSession(code)
    : { error: new Error("Supabase is not configured.") };

  if (error) {
    console.warn("[property-auth] callback exchange failed", {
      flow,
      errorCode: "code" in error ? String(error.code ?? "unknown") : "unknown"
    });
    return NextResponse.redirect(getCallbackUrl(requestUrl.origin, next, "failure"));
  }

  return NextResponse.redirect(getCallbackUrl(requestUrl.origin, next, "success"));
}
