"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createTenderSupabaseServerClient } from "@/lib/supabase/tenders-server";
import { requireTenderMemberAccess } from "@/lib/tender-access";
import { TENDER_PRODUCT_CODE } from "@/lib/tender-billing";

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function optionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

export async function createTenderBankTransferRequestAction(formData: FormData) {
  const access = await requireTenderMemberAccess();
  const supabase = await createTenderSupabaseServerClient();
  if (!supabase) redirect("/tenders/billing/bank-transfer?error=setup");

  const payload = {
    user_id: access.userId,
    product_code: TENDER_PRODUCT_CODE,
    email: requiredString(formData, "email"),
    company_name: requiredString(formData, "company_name"),
    contact_name: requiredString(formData, "contact_name"),
    phone: requiredString(formData, "phone"),
    invoice_name: requiredString(formData, "invoice_name"),
    desired_start_date: optionalString(formData, "desired_start_date"),
    notes: optionalString(formData, "notes"),
    status: "pending"
  };

  const { error } = await supabase.from("tender_bank_transfer_requests").insert(payload);
  if (error) {
    console.error("[tender-bank-transfer] failed to create request", {
      code: error.code,
      message: error.message
    });
    redirect(`/tenders/billing/bank-transfer?error=${encodeURIComponent(bankTransferError(error.message))}`);
  }

  revalidatePath("/tenders/billing");
  revalidatePath("/tenders/billing/bank-transfer");
  redirect("/tenders/billing/bank-transfer?submitted=1");
}

function bankTransferError(message: string) {
  if (/schema cache|does not exist|relation/i.test(message)) return "銀行振込申込みのDB設定が未適用です。管理者へお問い合わせください。";
  if (/row-level security|permission|policy/i.test(message)) return "銀行振込申込みの権限設定を確認できませんでした。管理者へお問い合わせください。";
  return "銀行振込申込みを保存できませんでした。時間をおいて再度お試しください。";
}
