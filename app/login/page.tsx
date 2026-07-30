import Link from "next/link";
import type { Metadata } from "next";
import { signInMemberAction } from "@/app/auth/actions";
import { propertyMetadata } from "@/lib/property-metadata";

export const metadata: Metadata = propertyMetadata(
  "会員ログイン｜格安不動産サーチ",
  "格安不動産サーチの会員ログイン画面です。"
);

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; next?: string }> }) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">会員ログイン</h1>
        <p className="mt-2 text-sm text-slate-600">物件一覧、無料期間、契約状態を確認できます。</p>
        {params.message ? (
          <p className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{params.message}</p>
        ) : null}
        {params.error ? (
          <p className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{params.error}</p>
        ) : null}
        <form action={signInMemberAction} className="mt-5 grid gap-4">
          <input type="hidden" name="next" value={safeNextPath(params.next)} />
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
          <Link href="/forgot-password" className="font-bold text-brand-700">
            パスワードを忘れた方
          </Link>
        </p>
        <p className="mt-2 text-sm text-slate-600">
          初めての方は{" "}
          <Link href="/signup" className="font-bold text-brand-700">
            無料トライアル登録
          </Link>
        </p>
      </div>
    </div>
  );
}

function safeNextPath(value?: string) {
  if (!value?.startsWith("/") || value.startsWith("//") || value.startsWith("/admin")) {
    return "/dashboard";
  }
  return value;
}
