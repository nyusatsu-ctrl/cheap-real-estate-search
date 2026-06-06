import { updatePasswordAction } from "@/app/auth/actions";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">新しいパスワードを設定</h1>
        <p className="mt-2 text-sm text-slate-600">8文字以上の新しいパスワードを入力してください。</p>
        {params.error ? (
          <p className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{params.error}</p>
        ) : null}
        <form action={updatePasswordAction} className="mt-5 grid gap-4">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            新しいパスワード
            <input name="password" type="password" minLength={8} required className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            新しいパスワード（確認）
            <input
              name="password_confirmation"
              type="password"
              minLength={8}
              required
              className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring"
            />
          </label>
          <button className="rounded bg-brand-700 px-4 py-3 font-bold text-white focus-ring">パスワードを変更する</button>
        </form>
      </div>
    </div>
  );
}
