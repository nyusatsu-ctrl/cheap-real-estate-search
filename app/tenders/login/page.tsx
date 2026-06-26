import Link from "next/link";
import type { Metadata } from "next";
import { signInTenderMemberAction } from "@/app/tenders/auth/actions";
import { tenderMetadata } from "@/lib/tender-metadata";

export const metadata: Metadata = tenderMetadata("ログイン｜官公庁案件サーチ", "官公庁案件サーチの会員ログインページです。");

export default async function TenderLoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/tenders";

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-brand-700">官公庁案件サーチ</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">会員ログイン</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">案件一覧、詳細、お気に入り、通知機能を利用するにはログインが必要です。</p>
        {params.error ? (
          <p className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{decodeURIComponent(params.error)}</p>
        ) : null}
        <form action={signInTenderMemberAction} className="mt-5 grid gap-4">
          <input type="hidden" name="next" value={next} />
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            メールアドレス
            <input name="email" type="email" required className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            パスワード
            <input name="password" type="password" required className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
          </label>
          <button className="rounded bg-brand-700 px-4 py-3 font-bold text-white focus-ring">ログイン</button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          初めての方は{" "}
          <Link href={`/tenders/signup?next=${encodeURIComponent(next)}`} className="font-bold text-brand-700">
            14日間無料で始める
          </Link>
        </p>
      </div>
    </div>
  );
}
