import { NextRequest } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { SalesContractStatus } from "@/lib/sales-contracts/types";

const MAX_SOURCE_ROW_KEYS = 100;

const STATUS_LABELS: Record<SalesContractStatus, string> = {
  contract_candidate: "契約候補登録済",
  negotiating: "商談中",
  terms_pending: "条件確定待ち",
  contracted: "契約済",
  waiting_delivery: "納車待ち",
  delivered: "納車済",
  repayment: "返済中",
  payment_delay_contacted: "登録済",
  payoff_scheduled: "登録済",
  paid_off: "完済",
  leasing: "リース中",
  lease_ended: "リース終了",
  completed: "完了",
  cancelled: "キャンセル",
  trouble: "トラブル対応中"
};

type LoanReviewStatusRequest = {
  sourceRowKeys?: unknown;
};

type SalesContractStatusRow = {
  id: string;
  source_row_key: string | null;
  status: string | null;
};

export async function POST(request: NextRequest) {
  const secret = process.env.LOAN_REVIEW_API_SECRET;
  const requestSecret = request.headers.get("x-loan-review-secret") ?? "";
  if (!secret || requestSecret !== secret) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await parseRequestBody(request);
  const sourceRowKeys = normalizeSourceRowKeys(body.sourceRowKeys);
  if (sourceRowKeys.length === 0) {
    return Response.json({ items: [] });
  }

  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    return Response.json({ message: "Supabase is not configured." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("sales_contracts")
    .select("id, source_row_key, status")
    .eq("source_system", "gas_loan_review")
    .in("source_row_key", sourceRowKeys)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    return Response.json({ message: error.message }, { status: 500 });
  }

  const seen = new Set<string>();
  const items = ((data ?? []) as SalesContractStatusRow[]).flatMap((contract) => {
    const sourceRowKey = contract.source_row_key;
    if (!sourceRowKey || seen.has(sourceRowKey)) return [];
    seen.add(sourceRowKey);
    const status = normalizeContractStatus(contract.status);
    return [{
      source_row_key: sourceRowKey,
      contract_id: contract.id,
      status,
      label: status ? STATUS_LABELS[status] : "登録済",
      url: `/admin/sales-contracts/${contract.id}`
    }];
  });

  return Response.json({ items });
}

async function parseRequestBody(request: NextRequest): Promise<LoanReviewStatusRequest> {
  try {
    return (await request.json()) as LoanReviewStatusRequest;
  } catch {
    return {};
  }
}

function normalizeSourceRowKeys(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean)
  )).slice(0, MAX_SOURCE_ROW_KEYS);
}

function normalizeContractStatus(value: string | null): SalesContractStatus | null {
  const allowed = Object.keys(STATUS_LABELS) as SalesContractStatus[];
  return allowed.includes(value as SalesContractStatus) ? (value as SalesContractStatus) : null;
}
