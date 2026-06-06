import Link from "next/link";
import { sendPasswordResetAction } from "@/app/auth/actions";

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">パスワード再設定</h1>
        <p className="mt-2 text-sm text-slate-600">登録済みのメールアドレスに、再設定用リンクを送信します。</p>
        {params.error ? (
          <p className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{params.error}</p>
        ) : null}
        {params.message ? (
          <p className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{params.message}</p>
        ) : null}
        <form action={sendPasswordResetAction} className="mt-5 grid gap-4">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            メールアドレス
            <input name="email" type="email" required className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
          </label>
          <button className="rounded bg-brand-700 px-4 py-3 font-bold text-white focus-ring">再設定メールを送る</button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          <Link href="/admin/login" className="font-bold text-brand-700">
            運営者ログインへ戻る
          </Link>
        </p>
      </div>
    </div>
  );
}
