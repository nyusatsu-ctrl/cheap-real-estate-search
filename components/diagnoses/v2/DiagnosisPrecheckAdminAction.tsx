"use client";

import { useActionState } from "react";
import { issueDiagnosisPrecheckAction, type DiagnosisPrecheckAdminState } from "@/app/admin/diagnoses/actions";

const INITIAL: DiagnosisPrecheckAdminState = {};

export function DiagnosisPrecheckAdminAction({ diagnosisId }: { diagnosisId: string }) {
  const [state, action, pending] = useActionState(issueDiagnosisPrecheckAction, INITIAL);
  const url = state.path && typeof window !== "undefined" ? `${window.location.origin}${state.path}` : state.path;
  return <div className="rounded border border-slate-200 bg-slate-50 p-3"><p className="text-sm font-black text-slate-950">個別相談前の詳しい事前確認</p><p className="mt-1 text-xs leading-5 text-slate-600">現在の27問を、相談や正式提案の前に必要な会社だけへ案内します。</p><form action={action} className="mt-3"><input type="hidden" name="id" value={diagnosisId} /><button disabled={pending} className="rounded bg-slate-900 px-3 py-2 text-xs font-black text-white disabled:bg-slate-400">{pending ? "発行中です…" : "安全な専用URLを発行"}</button></form>{url ? <p className="mt-3 select-all break-all rounded bg-white p-2 text-xs font-semibold text-slate-700">{url}</p> : null}{state.error ? <p className="mt-2 text-xs font-bold text-red-700">{state.error}</p> : null}</div>;
}
