import { NextResponse } from "next/server";
import { getCurrentDiagnosisAdmin } from "@/lib/diagnosis-admin";
import { getPropertySearchWaitlist } from "@/lib/construction-diagnosis-v2/sessions";
import { getPrimaryTradeLabel } from "@/lib/construction-diagnosis-v2/specialty-questions";
import { getLeadSourceLabel } from "@/lib/construction-diagnosis";

export async function GET() {
  if (!await getCurrentDiagnosisAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const entries = await getPropertySearchWaitlist();
  const rows = [["会社名", "業種", "メールアドレス", "関心度", "知りたい物件", "登録日時", "流入元"], ...entries.map((entry) => [entry.company_name, getPrimaryTradeLabel(entry.primary_trade), entry.email, entry.interest_level === "notify" ? "完成時に案内" : "詳しい内容", entry.interest_topics.join(" / "), entry.created_at, getLeadSourceLabel(entry.source)])];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  return new NextResponse(`\uFEFF${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="property-search-waitlist-${new Date().toISOString().slice(0, 10)}.csv"` } });
}

function csvCell(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
