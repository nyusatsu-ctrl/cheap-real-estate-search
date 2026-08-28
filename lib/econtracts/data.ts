import "server-only";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { ECONTRACT_DISABLED_MESSAGE } from "@/lib/econtracts/rules";
import { isEcontractFeatureEnabled } from "@/lib/econtracts/server";
import type { AdminEcontractSummary, EcontractKind, SalesEcontract } from "@/lib/econtracts/types";

const MISSING_MESSAGE = "電子契約テーブルが未作成です。対象 Supabase を確認して migration を適用してください。";

export async function getAdminEcontracts(contractId: string): Promise<AdminEcontractSummary> {
  if (!isEcontractFeatureEnabled()) {
    return { contracts: [], tableMissing: false, featureDisabled: true, errorMessage: ECONTRACT_DISABLED_MESSAGE };
  }
  const client = createSupabaseServiceRoleClient();
  if (!client) return { contracts: [], tableMissing: true, errorMessage: MISSING_MESSAGE };
  const result = await client
    .from("sales_econtracts")
    .select("*")
    .eq("contract_id", contractId)
    .order("contract_kind", { ascending: true })
    .order("revision", { ascending: false });
  if (result.error) {
    if (isMissingTableError(result.error)) return { contracts: [], tableMissing: true, errorMessage: MISSING_MESSAGE };
    return { contracts: [], tableMissing: false, errorMessage: "電子契約データを読み込めませんでした。" };
  }
  return { contracts: (result.data ?? []) as SalesEcontract[], tableMissing: false };
}

export function getLatestEcontract(contracts: SalesEcontract[], kind: EcontractKind) {
  return contracts.find((contract) => contract.contract_kind === kind) ?? null;
}

export async function getAdminEcontractStatusMap(contractIds: string[]) {
  const statusMap: Record<string, Partial<Record<EcontractKind, SalesEcontract["status"]>>> = {};
  if (!isEcontractFeatureEnabled()) return statusMap;
  if (!contractIds.length) return statusMap;
  const client = createSupabaseServiceRoleClient();
  if (!client) return statusMap;
  const result = await client
    .from("sales_econtracts")
    .select("contract_id,contract_kind,status,revision")
    .in("contract_id", contractIds)
    .order("revision", { ascending: false });
  if (result.error) return statusMap;
  for (const row of result.data ?? []) {
    const contractId = String(row.contract_id);
    const kind = row.contract_kind as EcontractKind;
    statusMap[contractId] ??= {};
    if (!statusMap[contractId][kind]) statusMap[contractId][kind] = row.status as SalesEcontract["status"];
  }
  return statusMap;
}

function isMissingTableError(error: { code?: string; message?: string }) {
  const message = String(error.message ?? "").toLowerCase();
  return error.code === "42P01" || error.code === "PGRST205" || message.includes("does not exist") || message.includes("schema cache");
}
