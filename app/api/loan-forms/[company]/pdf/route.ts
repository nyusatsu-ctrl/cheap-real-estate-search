import { NextRequest } from "next/server";
import { assertSupportedCompany, readLoanFormConfig } from "@/lib/loan-forms/config";
import { createLoanFormPdf } from "@/lib/loan-forms/pdf";
import type { LoanFormInput } from "@/lib/loan-forms/types";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ company: string }> }) {
  const { company } = await params;
  assertSupportedCompany(company);

  const body = (await request.json()) as Partial<LoanFormInput>;
  const config = await readLoanFormConfig(company);
  const pdfBytes = await createLoanFormPdf(config, body);

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${company}-application.pdf"`,
      "Cache-Control": "no-store"
    }
  });
}
