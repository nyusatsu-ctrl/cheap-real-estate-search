import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { normalizeEcontractCandidatePayload } from "@/lib/econtracts/candidate";
import { isEcontractFeatureEnabled } from "@/lib/econtracts/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type CandidateRpcResult = { contract_id?: unknown; created?: unknown };

export async function POST(request: NextRequest) {
  if (!isEcontractFeatureEnabled()) {
    return Response.json({ message: "Not found" }, { status: 404, headers: noStoreHeaders() });
  }

  const configuredSecret = process.env.LOAN_REVIEW_API_SECRET ?? "";
  const requestSecret = request.headers.get("x-loan-review-secret") ?? "";
  if (!secureStringEqual(configuredSecret, requestSecret)) {
    return Response.json({ message: "Unauthorized" }, { status: 401, headers: noStoreHeaders() });
  }

  const payload = normalizeEcontractCandidatePayload(await parseRequestBody(request));
  if (!payload) {
    return Response.json({ message: "電子契約の対象条件または連携情報を確認してください。" }, { status: 400, headers: noStoreHeaders() });
  }

  const supabase = createSupabaseServiceRoleClient();
  if (!supabase) {
    return Response.json({ message: "契約管理データベースが設定されていません。" }, { status: 503, headers: noStoreHeaders() });
  }

  const result = await supabase.rpc("upsert_sales_econtract_candidate", { p_payload: payload });
  if (result.error) {
    console.error("econtract candidate sync failed", { code: result.error.code });
    return Response.json({ message: "電子契約候補を連携できませんでした。" }, { status: 500, headers: noStoreHeaders() });
  }
  const data = (result.data ?? {}) as CandidateRpcResult;
  const contractId = String(data.contract_id ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(contractId)) {
    return Response.json({ message: "電子契約候補を確認できませんでした。" }, { status: 500, headers: noStoreHeaders() });
  }

  return Response.json({
    contract_id: contractId,
    created: data.created === true,
    url: `/admin/sales-contracts/${contractId}#econtracts`
  }, { headers: noStoreHeaders() });
}

async function parseRequestBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function secureStringEqual(left: string, right: string) {
  if (!left || !right) return false;
  const leftHash = createHash("sha256").update(left, "utf8").digest();
  const rightHash = createHash("sha256").update(right, "utf8").digest();
  return timingSafeEqual(leftHash, rightHash);
}

function noStoreHeaders() {
  return { "Cache-Control": "no-store" };
}
