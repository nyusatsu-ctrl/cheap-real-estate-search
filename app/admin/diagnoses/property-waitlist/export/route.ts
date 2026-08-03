import { NextResponse } from "next/server";
import { getCurrentDiagnosisAdmin } from "@/lib/diagnosis-admin";
import { getPropertySearchWaitlist } from "@/lib/construction-diagnosis-v2/sessions";
import { PRIMARY_TRADE_OPTIONS, getPrimaryTradeLabel, type PrimaryTrade } from "@/lib/construction-diagnosis-v2/specialty-questions";
import { LEAD_SOURCE_LABELS, getLeadSourceLabel, type LeadSource } from "@/lib/construction-diagnosis";

export async function GET(request: Request) {
  if (!await getCurrentDiagnosisAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const interestLevel = params.get("waitlist_interest");
  const primaryTrade = params.get("waitlist_trade");
  const source = params.get("waitlist_source");
  const entries = await getPropertySearchWaitlist({
    interestLevel: interestLevel === "notify" || interestLevel === "details" ? interestLevel : undefined,
    primaryTrade: PRIMARY_TRADE_OPTIONS.some((option) => option.value === primaryTrade) ? primaryTrade as PrimaryTrade : undefined,
    source: source && source in LEAD_SOURCE_LABELS ? source as LeadSource : undefined
  });
  const rows = [["会社名", "業種", "メールアドレス", "関心度", "知りたい物件", "登録日時", "流入元"], ...entries.map((entry) => [entry.company_name, getPrimaryTradeLabel(entry.primary_trade), entry.email, entry.interest_level === "notify" ? "完成時に案内" : "詳しい内容", entry.interest_topics.join(" / "), entry.created_at, getLeadSourceLabel(entry.source)])];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  return new NextResponse(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="property-search-waitlist-${new Date().toISOString().slice(0, 10)}.csv"` } });
}

function csvCell(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
