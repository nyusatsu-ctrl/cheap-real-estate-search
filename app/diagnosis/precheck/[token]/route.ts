import { NextRequest, NextResponse } from "next/server";
import { DIAGNOSIS_PRECHECK_COOKIE, validateDiagnosisPrecheckToken } from "@/lib/construction-diagnosis-v2/precheck";
import { DIAGNOSIS_V22_SESSION_COOKIE } from "@/lib/construction-diagnosis-v2/sessions";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await validateDiagnosisPrecheckToken(token);
  if (!result) return NextResponse.redirect(new URL("/diagnosis?precheck=invalid", request.url));
  const response = NextResponse.redirect(new URL(`/diagnosis/precheck-form/${result.diagnosisId}`, request.url));
  const options = {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production"
  };
  response.cookies.set(DIAGNOSIS_V22_SESSION_COOKIE, result.sessionId, options);
  response.cookies.set(DIAGNOSIS_PRECHECK_COOKIE, result.diagnosisId, options);
  return response;
}
