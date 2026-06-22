import { signInAction } from "@/app/admin/actions";
import { EcoloopAdminBrand } from "@/components/EcoloopAdminBrand";
import { hasSupabaseEnv } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "契約管理システム 管理者ログイン",
  description: "契約台帳、顧客、車両、ローン、リース、満期管理を管理するためのログイン画面です。"
};

type AdminLoginSearchParams = {
  error?: string;
  message?: string;
  next?: string;
  redirectTo?: string;
  continue?: string;
};

function safeLoginRedirectPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/admin/login")) {
    return "/admin/sales-contracts";
  }
  return value;
}

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<AdminLoginSearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const redirectTo = safeLoginRedirectPath(resolvedSearchParams.next ?? resolvedSearchParams.redirectTo ?? resolvedSearchParams.continue);
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <EcoloopAdminBrand showSystemName={false} logoClassName="h-10" textClassName="text-base" priority />
        <p className="mt-4 text-sm font-bold text-brand-700">契約管理システム</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">管理者ログイン</h1>
        <p className="mt-2 text-sm text-slate-600">契約台帳、顧客、車両、ローン、リース、満期管理を管理するアカウントでログインしてください。</p>
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
        {resolvedSearchParams.message ? (
          <p className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
            {resolvedSearchParams.message}
          </p>
        ) : null}
        <form action={signInAction} className="mt-5 grid gap-4">
          <input type="hidden" name="redirect_to" value={redirectTo} />
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            メールアドレス
            <input id="email" name="email" type="email" autoComplete="username" required className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            パスワード
            <input id="password" name="password" type="password" autoComplete="current-password" required className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
          </label>
          <button className="rounded bg-brand-700 px-4 py-3 font-bold text-white focus-ring">ログイン</button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          <Link href="/forgot-password" className="font-bold text-brand-700">
            パスワードを忘れた方
          </Link>
        </p>
      </div>
    </div>
  );
}
