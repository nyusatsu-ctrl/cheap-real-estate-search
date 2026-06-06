"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("email rate limit")) {
    return "確認メールの送信上限に達しました。Supabaseのメール確認を一時的にOFFにするか、しばらく時間を置いてから再度お試しください。";
  }

  if (normalized.includes("email not confirmed")) {
    return "メール確認が完了していません。Supabaseでこのユーザーを確認済みにするか、メール確認をOFFにしてから再登録してください。";
  }

  if (normalized.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが違います。";
  }

  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "このメールアドレスはすでに登録されています。ログインをお試しください。";
  }

  if (normalized.includes("password")) {
    return "パスワードは8文字以上で入力してください。";
  }

  return message;
}

async function getAppOrigin() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "https";
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

export async function signUpMemberAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/dashboard?demo=1");

  const email = requiredString(formData, "email");
  const password = requiredString(formData, "password");
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) redirect(`/signup?error=${encodeURIComponent(getAuthErrorMessage(error.message))}`);

  if (data.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email,
      role: "viewer",
      subscription_status: "trialing",
      trial_ends_at: trialEndsAt
    });
  }

  redirect("/dashboard");
}

export async function signInMemberAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/dashboard?demo=1");

  const email = requiredString(formData, "email");
  const password = requiredString(formData, "password");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(getAuthErrorMessage(error.message))}`);

  redirect("/dashboard");
}

export async function sendPasswordResetAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/forgot-password?error=Supabase 環境変数が未設定です。");

  const email = requiredString(formData, "email");
  const origin = await getAppOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`
  });

  if (error) redirect(`/forgot-password?error=${encodeURIComponent(getAuthErrorMessage(error.message))}`);

  redirect("/forgot-password?message=パスワード再設定メールを送信しました。メール内のリンクを開いてください。");
}

export async function updatePasswordAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/reset-password?error=Supabase 環境変数が未設定です。");

  const password = requiredString(formData, "password");
  const passwordConfirmation = requiredString(formData, "password_confirmation");

  if (password.length < 8) {
    redirect("/reset-password?error=パスワードは8文字以上で入力してください。");
  }

  if (password !== passwordConfirmation) {
    redirect("/reset-password?error=確認用パスワードが一致しません。");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/reset-password?error=${encodeURIComponent(getAuthErrorMessage(error.message))}`);

  redirect("/admin/login?message=パスワードを変更しました。新しいパスワードでログインしてください。");
}

export async function signOutMemberAction() {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
