import { signInAction } from "@/app/admin/actions";
import { EcoloopAdminBrand } from "@/components/EcoloopAdminBrand";
import { hasDiagnosisSupabaseEnv } from "@/lib/supabase/diagnosis-server";
import { hasSupabaseEnv } from "@/lib/supabase/server";
import { sanitizeAdminRedirectPath } from "@/lib/admin-redirect";
import { getAdminLoginPresentation } from "@/lib/admin-login-presentation";
import type { Metadata } from "next";
import Link from "next/link";

type AdminLoginSearchParams = {
  error?: string;
  message?: string;
  next?: string;
  redirectTo?: string;
  continue?: string;
};

function resolveRedirectTo(searchParams: AdminLoginSearchParams) {
  return sanitizeAdminRedirectPath(
    searchParams.next ?? searchParams.redirectTo ?? searchParams.continue,
    "/admin/diagnoses"
  );
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<AdminLoginSearchParams> }): Promise<Metadata> {
  const presentation = getAdminLoginPresentation(resolveRedirectTo(await searchParams));
  const baseMetadata: Metadata = {
    title: presentation.metadataTitle,
    description: presentation.metadataDescription
  };
  if (presentation.kind !== "contract") return baseMetadata;
  return {
    ...baseMetadata,
    icons: {
      icon: [{ url: "/brand/ecoloop-logo.png", type: "image/png" }],
      apple: [{ url: "/brand/ecoloop-logo.png", type: "image/png" }]
    },
    openGraph: {
      title: presentation.metadataTitle,
      description: presentation.metadataDescription,
      siteName: "株式会社エコループ｜契約管理システム",
      images: [{
        url: "/brand/ecoloop-logo.png",
        width: 134,
        height: 80,
        alt: "株式会社エコループ｜契約管理システム"
      }]
    },
    twitter: {
      card: "summary",
      title: presentation.metadataTitle,
      description: presentation.metadataDescription,
      images: ["/brand/ecoloop-logo.png"]
    }
  };
}

function hasRequiredSupabaseEnv(redirectTo: string) {
  if (redirectTo.startsWith("/admin/diagnoses")) return hasDiagnosisSupabaseEnv();
  if (redirectTo.startsWith("/admin/system-check")) return hasSupabaseEnv() || hasDiagnosisSupabaseEnv();
  return hasSupabaseEnv();
}

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<AdminLoginSearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const redirectTo = resolveRedirectTo(resolvedSearchParams);
  const presentation = getAdminLoginPresentation(redirectTo);
  const isContractLogin = presentation.kind === "contract";
  return (
    <div data-admin-login-system={presentation.kind} className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {isContractLogin ? (
          <EcoloopAdminBrand
            showSystemName
            systemName={presentation.systemName}
            logoSrc="/brand/ecoloop-logo.png"
            logoWidth={134}
            logoHeight={80}
            logoClassName="h-12"
            textClassName="text-sm sm:text-base"
            priority
          />
        ) : (
          <>
            <EcoloopAdminBrand
              showSystemName={false}
              logoSrc="/images/ecoloop-sales-diagnosis-logo.png"
              logoWidth={1914}
              logoHeight={822}
              logoClassName="h-12"
              textClassName="text-base"
              priority
            />
            <p className="mt-4 text-sm font-bold text-brand-700">{presentation.systemName}</p>
          </>
        )}
        <h1 className="mt-1 text-2xl font-black text-slate-950">管理者ログイン</h1>
        <p className="mt-2 text-sm text-slate-600">{presentation.description}</p>
        {!hasRequiredSupabaseEnv(redirectTo) ? (
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
