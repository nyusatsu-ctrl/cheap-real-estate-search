import { signInAction } from "@/app/admin/actions";
import { hasSupabaseEnv } from "@/lib/supabase/server";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const resolvedSearchParams = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">運営者ログイン</h1>
        <p className="mt-2 text-sm text-slate-600">Supabase Auth に登録した管理者アカウントでログインしてください。</p>
        {!hasSupabaseEnv() ? (
          <p className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
            Supabase 環境変数が未設定です。.env.local を設定するとログインできます。
          </p>
        ) : null}
        {resolvedSearchParams.error ? (
          <p className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
            {resolvedSearchParams.error}
          </p>
        ) : null}
        <form action={signInAction} className="mt-5 grid gap-4">
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
      </div>
    </div>
  );
}
