"use server";

import { redirect } from "next/navigation";
import { createTenderSupabaseServerClient, createTenderSupabaseServiceRoleClient } from "@/lib/supabase/tenders-server";
import { ensureTenderTrialForCurrentUser, ensureTenderTrialForUser } from "@/lib/tender-access";
import { TENDER_PRODUCT_CODE } from "@/lib/tender-billing";

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function safeNext(formData: FormData) {
  const value = String(formData.get("next") ?? "/tenders").trim();
  return value.startsWith("/tenders") || value.startsWith("/favorites") || value.startsWith("/notifications") ? value : "/tenders";
}

function authErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "メールアドレスまたはパスワードが違います。";
  if (normalized.includes("already registered") || normalized.includes("already exists")) return "このメールアドレスはすでに登録されています。ログインをお試しください。";
  if (normalized.includes("email not confirmed")) return "メール確認が完了していません。メール内の確認リンクを開くか、管理者へお問い合わせください。";
  if (normalized.includes("password")) return "パスワードは8文字以上で入力してください。";
  return "認証処理に失敗しました。時間をおいて再度お試しください。";
}

export async function signUpTenderMemberAction(formData: FormData) {
  const supabase = await createTenderSupabaseServerClient();
  if (!supabase) redirect("/tenders/signup?error=setup");

  const email = requiredString(formData, "email");
  const password = requiredString(formData, "password");
  const next = safeNext(formData);

  const { data, error } = await createTenderAuthUser(email, password);
  if (error) redirect(`/tenders/signup?error=${encodeURIComponent(authErrorMessage(error.message))}`);

  if (data.user?.id) {
    await ensureTenderTrialForUser(data.user.id, data.user.email ?? email);
  } else {
    await ensureTenderTrialForCurrentUser();
  }

  const signInResult = await supabase.auth.signInWithPassword({ email, password });
  if (signInResult.error) redirect(`/tenders/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(authErrorMessage(signInResult.error.message))}`);

  redirect(next);
}

export async function signInTenderMemberAction(formData: FormData) {
  const supabase = await createTenderSupabaseServerClient();
  if (!supabase) redirect("/tenders/login?error=setup");

  const email = requiredString(formData, "email");
  const password = requiredString(formData, "password");
  const next = safeNext(formData);

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/tenders/login?error=${encodeURIComponent(authErrorMessage(error.message))}`);

  await ensureTenderTrialForCurrentUser();
  redirect(next);
}

async function createTenderAuthUser(email: string, password: string) {
  const service = createTenderSupabaseServiceRoleClient();
  if (!service) {
    return createPublicTenderAuthUser(email, password);
  }

  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      product_code: TENDER_PRODUCT_CODE
    }
  });

  if (!created.error) return { data: { user: created.data.user }, error: null };
  if (isServiceRoleRecoverableSignupError(created.error.message)) {
    return createPublicTenderAuthUser(email, password);
  }
  return { data: { user: null }, error: created.error };
}

async function createPublicTenderAuthUser(email: string, password: string) {
  const supabase = await createTenderSupabaseServerClient();
  if (!supabase) return { data: { user: null }, error: new Error("setup") };
  return supabase.auth.signUp({ email, password });
}

function isServiceRoleRecoverableSignupError(message: string) {
  return /service role|jwt|api key|permission|not configured|missing/i.test(message);
}
