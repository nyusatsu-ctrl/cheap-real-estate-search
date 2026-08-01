import { NextRequest, NextResponse } from "next/server";
import {
  DIAGNOSIS_PRINT_COOKIE,
  DIAGNOSIS_V2_RESULT_SESSION_COOKIE,
  getPrintCookieOptions,
  validateDiagnosisPrintToken
} from "@/lib/construction-diagnosis-v2/print";
import { DIAGNOSIS_V22_SESSION_COOKIE } from "@/lib/construction-diagnosis-v2/sessions";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await validateDiagnosisPrintToken(token, true);
  const origin = getRequestOrigin(request);
  if (!result.ok) {
    return NextResponse.redirect(new URL(`/diagnosis?print_error=${result.reason}`, origin));
  }

  const response = NextResponse.redirect(new URL("/diagnosis/print", origin));
  response.cookies.set(DIAGNOSIS_PRINT_COOKIE, token, getPrintCookieOptions());
  response.cookies.set(DIAGNOSIS_V22_SESSION_COOKIE, result.diagnosis.id, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 14,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  response.cookies.set(DIAGNOSIS_V2_RESULT_SESSION_COOKIE, result.diagnosis.id, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 14,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  return response;
}

function getRequestOrigin(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto")
    ?? (host?.startsWith("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https");
  return host ? `${protocol}://${host}` : request.nextUrl.origin;
}
