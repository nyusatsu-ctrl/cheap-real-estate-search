import { NextRequest } from "next/server";
import { assertSupportedCompany, readLoanFormConfig, writeLoanFormConfig } from "@/lib/loan-forms/config";
import { getLoanFormMachinePrintingPolicy } from "@/lib/loan-forms/policy";
import type { LoanFormCompany, LoanFormConfig } from "@/lib/loan-forms/types";

function machinePrintingDisabledResponse(company: LoanFormCompany) {
  const policy = getLoanFormMachinePrintingPolicy(company);
  return Response.json({ message: policy.message }, { status: 403 });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ company: string }> }) {
  const { company } = await params;
  assertSupportedCompany(company);
  if (!getLoanFormMachinePrintingPolicy(company).allowed) {
    return machinePrintingDisabledResponse(company);
  }
  const config = await readLoanFormConfig(company);
  return Response.json(config);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ company: string }> }) {
  const { company } = await params;
  assertSupportedCompany(company);
  if (!getLoanFormMachinePrintingPolicy(company).allowed) {
    return machinePrintingDisabledResponse(company);
  }
  const config = (await request.json()) as LoanFormConfig;

  if (config.company !== company) {
    return Response.json({ message: "会社コードが一致しません。" }, { status: 400 });
  }

  await writeLoanFormConfig(company, config);
  return Response.json({ message: "座標設定を保存しました。", config });
}
