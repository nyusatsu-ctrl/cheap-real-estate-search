import Link from "next/link";
import type { Metadata } from "next";
import { updatePasswordAction } from "@/app/auth/actions";
import { getMemberAuthPageMessage } from "@/lib/property-signup";
import { propertyMetadata } from "@/lib/property-metadata";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = propertyMetadata(
  "新しいパスワードを設定｜格安不動産サーチ",
  "格安不動産サーチの新しいパスワード設定画面です。"
);

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const errorMessage = getMemberAuthPageMessage(params.error);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">再設定リンクをご確認ください</h1>
          <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
            {errorMessage || getMemberAuthPageMessage("reset_link_required")}
          </p>
          <Link href="/forgot-password" className="mt-5 inline-flex rounded bg-brand-700 px-4 py-3 font-bold text-white focus-ring">
            パスワード再設定メールを再申請する
          </Link>
          <p className="mt-4 text-sm text-slate-600">
            <Link href="/login" className="font-bold text-brand-700">会員ログインへ戻る</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">新しいパスワードを設定</h1>
        <p className="mt-2 text-sm text-slate-600">8文字以上の新しいパスワードを入力してください。</p>
        {errorMessage ? (
          <p className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{errorMessage}</p>
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
        <p className="mt-4 text-sm text-slate-600">
          <Link href="/login" className="font-bold text-brand-700">会員ログインへ戻る</Link>
        </p>
      </div>
    </div>
  );
}
