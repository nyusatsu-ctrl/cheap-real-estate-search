import { NextRequest } from "next/server";
import { assertSupportedCompany, readLoanFormConfig, writeLoanFormConfig } from "@/lib/loan-forms/config";
import type { LoanFormConfig } from "@/lib/loan-forms/types";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ company: string }> }) {
  const { company } = await params;
  assertSupportedCompany(company);
  const config = await readLoanFormConfig(company);
  return Response.json(config);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ company: string }> }) {
  const { company } = await params;
  assertSupportedCompany(company);
  const config = (await request.json()) as LoanFormConfig;

  if (config.company !== company) {
    return Response.json({ message: "会社コードが一致しません。" }, { status: 400 });
  }

  await writeLoanFormConfig(company, config);
  return Response.json({ message: "座標設定を保存しました。", config });
}
