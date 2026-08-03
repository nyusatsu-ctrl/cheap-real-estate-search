"use client";

import Link from "next/link";

export default function SignupError() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <section className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-black text-slate-950">登録画面を更新してください</h1>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          画面が更新されました。再読み込みしてもう一度お試しください。登録済みの場合は、再登録せず会員ログインをお試しください。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => window.location.reload()} className="rounded bg-brand-700 px-4 py-3 text-sm font-bold text-white focus-ring">
            再読み込み
          </button>
          <Link href="/login" className="rounded border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 focus-ring">
            会員ログイン
          </Link>
        </div>
      </section>
    </div>
  );
}
