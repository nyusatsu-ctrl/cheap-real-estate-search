"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function optionalString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function numberValue(formData: FormData, key: string, fallback: number) {
  const parsed = Number(formData.get(key));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function submitContractorApplicationAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/partners/register?submitted=1");

  const { error } = await supabase.from("contractor_applications").insert({
    company_name: requiredString(formData, "company_name"),
    contact_name: requiredString(formData, "contact_name"),
    email: requiredString(formData, "email"),
    phone: requiredString(formData, "phone"),
    service_categories: formData.getAll("service_categories").map(String),
    service_areas: optionalString(formData, "service_areas")
      .split(/[,\n、]/)
      .map((area) => area.trim())
      .filter(Boolean),
    license_info: optionalString(formData, "license_info") || null,
    insurance_info: optionalString(formData, "insurance_info") || null,
    requested_commission_rate: numberValue(formData, "requested_commission_rate", 10),
    message: optionalString(formData, "message") || null,
    status: "pending"
  });

  if (error) throw new Error(error.message);
  redirect("/partners/register?submitted=1");
}

export async function submitPartnerQuoteAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/partners/quotes/new?submitted=1");

  const quoteAmount = numberValue(formData, "quote_amount_yen", 0);
  const feeRate = numberValue(formData, "platform_fee_rate", 10);

  const { error } = await supabase.from("estimate_quotes").insert({
    estimate_request_id: requiredString(formData, "estimate_request_id"),
    contractor_display_name: requiredString(formData, "contractor_display_name"),
    work_summary: requiredString(formData, "work_summary"),
    quote_amount_yen: quoteAmount,
    platform_fee_rate: feeRate,
    platform_fee_yen: Math.round((quoteAmount * feeRate) / 100),
    customer_visible_amount_yen: quoteAmount,
    internal_note: optionalString(formData, "internal_note") || null,
    status: "submitted"
  });

  if (error) throw new Error(error.message);
  redirect("/partners/quotes/new?submitted=1");
}
