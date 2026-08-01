"use client";

import { useActionState, useState } from "react";
import { ClipboardCopy, Link2 } from "lucide-react";
import {
  reissueDiagnosisResumeAction,
  type DiagnosisResumeAdminState
} from "@/app/admin/diagnoses/actions";
import { copyTextToClipboard } from "@/lib/construction-diagnosis-v2/client-copy";

const INITIAL_STATE: DiagnosisResumeAdminState = {};

export function DiagnosisResumeAdminAction({ diagnosisId }: { diagnosisId: string }) {
  const [state, action, pending] = useActionState(reissueDiagnosisResumeAction, INITIAL_STATE);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">安全な再開リンク</p>
      <p className="mt-1 text-xs font-semibold leading-6 text-slate-600">平文リンクは必要時だけ発行され、DBやCSVには保存されません。</p>
      <form action={action} className="mt-3">
        <input type="hidden" name="id" value={diagnosisId} />
        <button disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded bg-slate-900 px-3 py-2 text-sm font-black text-white focus-ring disabled:cursor-wait disabled:bg-slate-500">
          <Link2 className="h-4 w-4" />{pending ? "発行中です" : "再開リンクを発行・再発行"}
        </button>
      </form>
      {state.error ? <p className="mt-2 text-xs font-bold text-red-700" role="alert">{state.error}</p> : null}
      {state.path ? (
        <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-3">
          <p className="break-all text-xs font-semibold text-emerald-950">{state.path}</p>
          <button type="button" onClick={async () => {
            try {
              await copyTextToClipboard(`${window.location.origin}${state.path}`);
              setCopied(true);
              setCopyError(false);
            } catch {
              setCopyError(true);
            }
          }} className="mt-2 inline-flex items-center gap-2 text-xs font-black text-emerald-800 underline focus-ring">
            <ClipboardCopy className="h-3.5 w-3.5" />{copied ? "コピーしました" : "URLをコピー"}
          </button>
          {copyError ? <p className="mt-2 text-xs font-bold text-red-700" role="alert">コピーできませんでした。上のURLを選択してコピーしてください。</p> : null}
          {state.expiresAt ? <p className="mt-2 text-xs font-semibold text-emerald-800">有効期限: {formatDate(state.expiresAt)}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
