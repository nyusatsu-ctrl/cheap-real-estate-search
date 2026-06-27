"use server";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createTenderSupabaseServiceRoleClient } from "@/lib/supabase/tenders-server";
import { emailHash } from "@/lib/tender-access";
import { isTenderBankTransferStatus } from "@/lib/tender-bank-transfer";
import { TENDER_PRODUCT_CODE } from "@/lib/tender-billing";

const execFileAsync = promisify(execFile);

export async function runDefenseDiscoveryAction(formData: FormData) {
  await requireAdmin();
  const group = String(formData.get("group") ?? "all");
  await runDefenseScript("discover", group);
  revalidatePath("/admin/defense-crawl");
  redirect("/admin/defense-crawl");
}

export async function runDefenseCrawlAction(formData: FormData) {
  await requireAdmin();
  const group = String(formData.get("group") ?? "all");
  await runDefenseScript("crawl", group);
  revalidatePath("/admin/defense-crawl");
  revalidatePath("/admin/tender-candidates");
  redirect("/admin/defense-crawl");
}

export async function runPortalTenderCrawlAction() {
  await requireAdmin();
  await execFileAsync("node", ["scripts/crawl-tenders.mjs", "--limit=300"], {
    cwd: process.cwd(),
    timeout: 180000,
    maxBuffer: 1024 * 1024 * 10
  });
  revalidatePath("/tenders");
  revalidatePath("/admin/defense-crawl");
  revalidatePath("/admin/tenders");
  redirect("/admin/defense-crawl");
}

export async function runDailyTenderCrawlAction() {
  await requireAdmin();
  await execFileAsync("node", ["scripts/crawl-tenders.mjs", "--limit=300"], {
    cwd: process.cwd(),
    timeout: 180000,
    maxBuffer: 1024 * 1024 * 10
  });
  await runDefenseScript("discover", "all");
  await runDefenseScript("crawl", "all");
  revalidatePath("/tenders");
  revalidatePath("/admin/defense-crawl");
  revalidatePath("/admin/tenders");
  revalidatePath("/admin/tender-candidates");
  redirect("/admin/defense-crawl");
}

export async function updateTenderBankTransferRequestAction(formData: FormData) {
  await requireAdmin();
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) redirect("/admin/defense-crawl?bankTransferError=setup");

  const id = requiredFormValue(formData, "id");
  const status = requiredFormValue(formData, "status");
  if (!isTenderBankTransferStatus(status)) redirect("/admin/defense-crawl?bankTransferError=status");

  const { error } = await supabase
    .from("tender_bank_transfer_requests")
    .update({
      status,
      admin_note: nullableFormValue(formData, "admin_note")
    })
    .eq("id", id)
    .eq("product_code", TENDER_PRODUCT_CODE);

  if (error) redirect(`/admin/defense-crawl?bankTransferError=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/defense-crawl");
  redirect("/admin/defense-crawl?bankTransferUpdated=1");
}

export async function activateTenderBankTransferRequestAction(formData: FormData) {
  await requireAdmin();
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) redirect("/admin/defense-crawl?bankTransferError=setup");

  const id = requiredFormValue(formData, "id");
  const { data: request, error: requestError } = await supabase
    .from("tender_bank_transfer_requests")
    .select("*")
    .eq("id", id)
    .eq("product_code", TENDER_PRODUCT_CODE)
    .maybeSingle();

  if (requestError || !request) redirect(`/admin/defense-crawl?bankTransferError=${encodeURIComponent(requestError?.message ?? "request_not_found")}`);

  const now = new Date();
  const currentPeriodEnd = new Date(now.getTime() + 30 * 86_400_000).toISOString();
  const accessPayload = {
    user_id: request.user_id,
    email: request.email,
    email_hash: emailHash(request.email),
    product_code: TENDER_PRODUCT_CODE,
    subscription_status: "active",
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: false,
    billing_source: "manual_bank_transfer",
    manual_access_note: `銀行振込入金確認: ${request.company_name}`
  };

  const existing = await supabase
    .from("tender_user_access")
    .select("id")
    .eq("user_id", request.user_id)
    .eq("product_code", TENDER_PRODUCT_CODE)
    .maybeSingle();

  const accessResult = existing.data?.id
    ? await supabase.from("tender_user_access").update(accessPayload).eq("id", existing.data.id)
    : await supabase.from("tender_user_access").insert(accessPayload);

  if (accessResult.error) redirect(`/admin/defense-crawl?bankTransferError=${encodeURIComponent(accessResult.error.message)}`);

  const { error: updateError } = await supabase
    .from("tender_bank_transfer_requests")
    .update({
      status: "activated",
      activated_at: now.toISOString(),
      activated_until: currentPeriodEnd,
      admin_note: nullableFormValue(formData, "admin_note") ?? request.admin_note
    })
    .eq("id", id);

  if (updateError) redirect(`/admin/defense-crawl?bankTransferError=${encodeURIComponent(updateError.message)}`);

  revalidatePath("/admin/defense-crawl");
  redirect("/admin/defense-crawl?bankTransferActivated=1");
}

async function runDefenseScript(command: string, group: string) {
  const args = ["scripts/defense-crawler.mjs", command, `--group=${group}`];
  if (command === "crawl") args.push("--max-sources=25");
  if (command === "discover") args.push("--max-sources=25");
  await execFileAsync("node", args, {
    cwd: process.cwd(),
    timeout: command === "crawl" ? 480000 : 180000,
    maxBuffer: 1024 * 1024 * 10
  });
}

function requiredFormValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function nullableFormValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}
