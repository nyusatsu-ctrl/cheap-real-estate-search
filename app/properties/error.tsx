"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";

export default function PropertiesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <section className="rounded-lg border border-rose-200 bg-white p-6 shadow-sm" role="alert">
        <h1 className="text-2xl font-black text-slate-950">物件情報を読み込めませんでした</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          通信状況を確認し、もう一度お試しください。ログイン状態が切れている場合は、会員ログインから再度ログインしてください。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-emerald-700 px-4 py-2 font-bold text-white focus-ring"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            もう一度読み込む
          </button>
          <Link href="/login?next=/properties" className="inline-flex min-h-11 items-center justify-center rounded border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 focus-ring">
            会員ログイン
          </Link>
        </div>
      </section>
    </div>
  );
}
