import { NextRequest, NextResponse } from "next/server";
import {
  DIAGNOSIS_RESUME_COOKIE,
  mergeDiagnosisResumeCookieValue,
  validateDiagnosisResumeToken
} from "@/lib/construction-diagnosis-v2/resume";
import { DIAGNOSIS_V22_SESSION_COOKIE } from "@/lib/construction-diagnosis-v2/sessions";
import { after } from "next/server";
import { recordDiagnosisEvent } from "@/lib/construction-diagnosis-v2/monitoring";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await validateDiagnosisResumeToken(token);
  const redirectUrl = (path: string) => new URL(path, getRequestOrigin(request));
  if (result.ok) {
    after(() => recordDiagnosisEvent({ eventName: "resume_opened", sessionId: result.sessionId, diagnosisId: result.diagnosisId }));
    const view = request.nextUrl.searchParams.get("view");
    const path = view === "quick" || !result.detailedStarted
      ? `/diagnosis/quick-results/${result.sessionId}`
      : `/diagnosis/details/${result.diagnosisId}?resumed=1`;
    const response = NextResponse.redirect(redirectUrl(path));
    response.cookies.set(DIAGNOSIS_V22_SESSION_COOKIE, result.sessionId, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 14,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
    response.cookies.set(
      DIAGNOSIS_RESUME_COOKIE,
      mergeDiagnosisResumeCookieValue(request.cookies.get(DIAGNOSIS_RESUME_COOKIE)?.value, token),
      {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30,
        path: "/diagnosis",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
      }
    );
    return response;
  }

  return NextResponse.redirect(redirectUrl(`/diagnosis?resume_error=${result.reason}`));
}

function getRequestOrigin(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto")
    ?? (host?.startsWith("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https");
  return host ? `${protocol}://${host}` : request.nextUrl.origin;
}
