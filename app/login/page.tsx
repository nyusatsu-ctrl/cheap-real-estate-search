import Link from "next/link";
import type { Metadata } from "next";
import { signInMemberAction } from "@/app/auth/actions";
import { LoginForm } from "@/app/login/LoginForm";
import { propertyMetadata } from "@/lib/property-metadata";
import { getMemberAuthPageMessage } from "@/lib/property-signup";

export const metadata: Metadata = propertyMetadata(
  "会員ログイン｜格安不動産サーチ",
  "格安不動産サーチの会員ログイン画面です。"
);

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; notice?: string; next?: string }> }) {
  const params = await searchParams;
  const successMessage = getMemberAuthPageMessage(params.message);
  const noticeMessage = getMemberAuthPageMessage(params.notice);
  const errorMessage = getMemberAuthPageMessage(params.error);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">会員ログイン</h1>
        <p className="mt-2 text-sm text-slate-600">物件一覧、無料期間、契約状態を確認できます。</p>
        {successMessage ? (
          <p className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{successMessage}</p>
        ) : null}
        {noticeMessage ? (
          <p className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{noticeMessage}</p>
        ) : null}
        {errorMessage ? (
          <p className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{errorMessage}</p>
        ) : null}
        <LoginForm action={signInMemberAction} next={safeNextPath(params.next)} />
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
