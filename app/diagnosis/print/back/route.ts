import { NextRequest, NextResponse } from "next/server";
import { getDiagnosisForPrint } from "@/lib/construction-diagnosis-v2/print";

export async function GET(request: NextRequest) {
  const diagnosis = await getDiagnosisForPrint();
  const origin = getRequestOrigin(request);
  return NextResponse.redirect(new URL(diagnosis ? `/diagnosis/results/${diagnosis.id}` : "/diagnosis", origin));
}

function getRequestOrigin(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto")
    ?? (host?.startsWith("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https");
  return host ? `${protocol}://${host}` : request.nextUrl.origin;
}
