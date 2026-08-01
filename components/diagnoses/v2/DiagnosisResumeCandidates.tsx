"use client";

import Link from "next/link";
import { useState } from "react";
import { ClipboardCopy, RotateCcw } from "lucide-react";
import { restartDiagnosisAction } from "@/app/diagnosis/resume-actions";
import { copyTextToClipboard } from "@/lib/construction-diagnosis-v2/client-copy";
import type { DiagnosisResumeCandidate } from "@/lib/construction-diagnosis-v2/resume";

export function DiagnosisResumeCandidates({
  candidates,
  source
}: {
  candidates: DiagnosisResumeCandidate[];
  source: string;
}) {
  const [copiedId, setCopiedId] = useState("");
  const [copyErrorId, setCopyErrorId] = useState("");
  if (candidates.length === 0) return null;

  return (
    <section className="border-b border-emerald-200 bg-emerald-50">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h2 className="text-xl font-black text-emerald-950">途中の詳しい診断があります</h2>
        <p className="mt-2 text-sm font-semibold leading-7 text-emerald-900">この端末に保存された安全な再開情報から、未完了の診断を確認しました。</p>
        <div className="mt-4 grid gap-4">
          {candidates.map((candidate) => (
            <article key={candidate.diagnosisId} className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-950">{candidate.companyName}</h3>
                  <p className="mt-1 text-sm font-bold text-slate-700">
                    {candidate.answeredCount}問まで保存・残り{candidate.remainingCount}問
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">最終保存: {formatDate(candidate.lastSavedAt)}</p>
                </div>
                {candidates.length > 1 ? <span className="text-xs font-bold text-slate-500">開始: {formatDate(candidate.startedAt)}</span> : null}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Link href={candidate.continueHref} className="inline-flex items-center justify-center rounded bg-brand-700 px-4 py-3 text-sm font-black text-white focus-ring">
                  続きから再開する
                </Link>
                <Link href={candidate.quickResultHref} className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 focus-ring">
                  3分診断結果を見る
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    const url = `${window.location.origin}${candidate.continueHref}`;
                    try {
                      await copyTextToClipboard(url);
                      setCopiedId(candidate.diagnosisId);
                      setCopyErrorId("");
                    } catch {
                      setCopyErrorId(candidate.diagnosisId);
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 focus-ring"
                >
                  <ClipboardCopy className="h-4 w-4" />
                  {copiedId === candidate.diagnosisId ? "コピーしました" : "再開用リンクをコピー"}
                </button>
                <form
                  action={restartDiagnosisAction}
                  onSubmit={(event) => {
                    if (!window.confirm("途中までの回答があります。本当に最初からやり直しますか。")) event.preventDefault();
                  }}
                >
                  <input type="hidden" name="token" value={candidate.token} />
                  <input type="hidden" name="source" value={source} />
                  <button className="inline-flex w-full items-center justify-center gap-2 px-3 py-3 text-xs font-bold text-slate-500 underline focus-ring">
                    <RotateCcw className="h-3.5 w-3.5" />
                    最初からやり直す
                  </button>
                </form>
              </div>
              {copyErrorId === candidate.diagnosisId ? (
                <p className="mt-3 text-xs font-bold leading-6 text-red-700" role="alert">
                  コピーできませんでした。「続きから再開する」を長押ししてリンクをコピーしてください。
                </p>
              ) : null}
              <p className="mt-3 text-xs font-semibold leading-6 text-slate-500">最初からやり直しても、保存済みの途中回答は削除されません。</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
