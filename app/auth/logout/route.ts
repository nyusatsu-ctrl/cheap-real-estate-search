import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PRIVATE_NO_STORE = "private, no-cache, no-store, max-age=0, must-revalidate";

export async function POST(request: Request) {
  const startedAt = Date.now();
  let destination = "/properties?message=logged_out";

  try {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error && !isAlreadySignedOut(error)) {
        console.error("[property-auth] sign out failed", {
          durationMs: Date.now() - startedAt,
          code: error.code ?? "unknown"
        });
        destination = "/properties?notice=logout_failed";
      }
    }

    console.info("[property-auth] sign out completed", {
      durationMs: Date.now() - startedAt,
      outcome: destination.includes("message=logged_out") ? "success" : "error"
    });
  } catch {
    console.error("[property-auth] sign out failed", {
      durationMs: Date.now() - startedAt,
      code: "unexpected_error"
    });
    destination = "/properties?notice=logout_failed";
  }

  const responseHeaders = {
    "Cache-Control": PRIVATE_NO_STORE,
    "Server-Timing": `logout;dur=${Date.now() - startedAt}`
  };
  if (request.headers.get("accept")?.includes("application/json")) {
    return NextResponse.json({ redirectTo: destination }, { headers: responseHeaders });
  }

  return new NextResponse(null, {
    status: 303,
    headers: { ...responseHeaders, Location: destination }
  });
}

function isAlreadySignedOut(error: { code?: string; name?: string }) {
  return error.code === "session_not_found" || error.name === "AuthSessionMissingError";
}
