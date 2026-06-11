import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin";
import {
  CONSULTATION_LABELS,
  DIAGNOSIS_TYPES,
  formatDiagnosisDate,
  getAnswerLabel,
  getConstructionDiagnoses
} from "@/lib/construction-diagnosis";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const diagnoses = await getConstructionDiagnoses();
  const headers = ["氏名", "会社名", "電話番号", "メール", "業種", "月商", "診断タイプ", "サブ課題", "相談意欲", "診断日時"];
  const rows = diagnoses.map((diagnosis) => [
    diagnosis.name,
    diagnosis.company_name ?? "",
    diagnosis.phone ?? "",
    diagnosis.email,
    getAnswerLabel("business_type", diagnosis.business_type),
    getAnswerLabel("monthly_sales", diagnosis.monthly_sales),
    DIAGNOSIS_TYPES[diagnosis.main_type].name,
    DIAGNOSIS_TYPES[diagnosis.sub_type].name,
    CONSULTATION_LABELS[diagnosis.wants_consultation] ?? diagnosis.wants_consultation,
    formatDiagnosisDate(diagnosis.created_at)
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="construction-diagnoses-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}

function csvCell(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}
