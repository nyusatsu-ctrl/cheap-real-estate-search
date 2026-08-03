import { NextRequest, NextResponse } from "next/server";
import { classifyDiagnosisClient } from "@/lib/construction-diagnosis-v2/client-info";
import { recordDiagnosisEvent } from "@/lib/construction-diagnosis-v2/monitoring";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }
  if (body.eventName !== "diagnosis_opened") return NextResponse.json({ received: false }, { status: 400 });
  const client = classifyDiagnosisClient(request.headers.get("user-agent") ?? "");
  await recordDiagnosisEvent({
    eventName: "diagnosis_opened",
    anonymousId: typeof body.anonymousId === "string" ? body.anonymousId : null,
    source: typeof body.source === "string" ? body.source : null,
    deviceType: client.deviceType,
    browserType: client.browserFamily
  });
  return NextResponse.json({ received: true });
}
