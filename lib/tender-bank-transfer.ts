import "server-only";
import { createTenderSupabaseServerClient, createTenderSupabaseServiceRoleClient } from "@/lib/supabase/tenders-server";
import { TENDER_PRODUCT_CODE } from "@/lib/tender-billing";

export type TenderBankTransferStatus = "pending" | "invoiced" | "paid" | "activated" | "canceled";

export type TenderBankTransferRequest = {
  id: string;
  user_id: string;
  product_code: string;
  email: string;
  company_name: string;
  contact_name: string;
  phone: string;
  invoice_name: string;
  desired_start_date: string | null;
  notes: string | null;
  status: TenderBankTransferStatus;
  admin_note: string | null;
  activated_at: string | null;
  activated_until: string | null;
  created_at: string;
  updated_at: string;
};

export const TENDER_BANK_TRANSFER_STATUS_LABELS: Record<TenderBankTransferStatus, string> = {
  pending: "申込み受付",
  invoiced: "請求書送付済み",
  paid: "入金確認済み",
  activated: "利用権限付与済み",
  canceled: "キャンセル"
};

export function isTenderBankTransferStatus(value: string): value is TenderBankTransferStatus {
  return ["pending", "invoiced", "paid", "activated", "canceled"].includes(value);
}

export async function getCurrentTenderBankTransferRequests(userId: string) {
  const supabase = await createTenderSupabaseServerClient();
  if (!supabase) return { requests: [] as TenderBankTransferRequest[], error: "TENDER_SUPABASE_URL または ANON KEY が未設定です。" };

  const { data, error } = await supabase
    .from("tender_bank_transfer_requests")
    .select("*")
    .eq("product_code", TENDER_PRODUCT_CODE)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return { requests: [] as TenderBankTransferRequest[], error: error.message };
  return { requests: (data ?? []) as TenderBankTransferRequest[], error: null };
}

export async function getTenderBankTransferAdminSummary() {
  const supabase = createTenderSupabaseServiceRoleClient();
  if (!supabase) return emptyBankTransferSummary("TENDER_SUPABASE_SERVICE_ROLE_KEY が未設定です。");

  const statuses: TenderBankTransferStatus[] = ["pending", "invoiced", "paid", "activated", "canceled"];
  const [totalResult, latestResult, ...statusResults] = await Promise.all([
    supabase.from("tender_bank_transfer_requests").select("id", { count: "exact", head: true }).eq("product_code", TENDER_PRODUCT_CODE),
    supabase
      .from("tender_bank_transfer_requests")
      .select("*")
      .eq("product_code", TENDER_PRODUCT_CODE)
      .order("created_at", { ascending: false })
      .limit(8),
    ...statuses.map((status) =>
      supabase
        .from("tender_bank_transfer_requests")
        .select("id", { count: "exact", head: true })
        .eq("product_code", TENDER_PRODUCT_CODE)
        .eq("status", status)
    )
  ]);

  const firstError = [totalResult, latestResult, ...statusResults].find((result) => result.error)?.error;
  if (firstError) return emptyBankTransferSummary(firstError.message);

  return {
    total: totalResult.count ?? 0,
    pending: statusResults[0].count ?? 0,
    invoiced: statusResults[1].count ?? 0,
    paid: statusResults[2].count ?? 0,
    activated: statusResults[3].count ?? 0,
    canceled: statusResults[4].count ?? 0,
    latest: (latestResult.data ?? []) as TenderBankTransferRequest[],
    error: null as string | null
  };
}

function emptyBankTransferSummary(error: string) {
  return {
    total: null,
    pending: null,
    invoiced: null,
    paid: null,
    activated: null,
    canceled: null,
    latest: [] as TenderBankTransferRequest[],
    error
  };
}
