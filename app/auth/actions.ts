"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getMemberAuthErrorMessage,
  getPropertyAuthCallbackUrl,
  getPropertySignupError,
  PROPERTY_SIGNUP_COMPLETE_PATH
} from "@/lib/property-signup";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
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

function redirectWithMessage(path: string, key: "error" | "message", message: string): never {
  const params = new URLSearchParams({ [key]: message });
  redirect(`${path}?${params.toString()}`);
}

// Compatibility path for registration pages loaded before the JSON API form rollout.
export async function signUpMemberAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/signup?error=temporarily_unavailable");
  }

  const email = normalizeEmail(requiredString(formData, "email"));
  const password = requiredString(formData, "password");
  const origin = await getAppOrigin();

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getPropertyAuthCallbackUrl(`${origin}/signup`, process.env.VERCEL_ENV)
      }
    });

    if (error) {
      redirect(`/signup?error=${getPropertySignupError(error).code}`);
    }

    redirect(data.session ? "/dashboard" : PROPERTY_SIGNUP_COMPLETE_PATH);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    redirect("/signup?error=temporarily_unavailable");
  }
}

export async function signInMemberAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/dashboard?demo=1");

  const email = normalizeEmail(requiredString(formData, "email"));
  const password = requiredString(formData, "password");
  const next = safeMemberNextPath(String(formData.get("next") ?? ""));

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(getMemberAuthErrorMessage(error.message))}`);

  redirect(next);
}

export async function sendPasswordResetAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirectWithMessage("/forgot-password", "error", "現在、パスワード再設定を受け付けられません。一定時間後に再度お試しください。");

  const email = requiredString(formData, "email");
  const origin = await getAppOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`
  });

  if (error) redirect(`/forgot-password?error=${encodeURIComponent(getMemberAuthErrorMessage(error.message))}`);

  redirectWithMessage("/forgot-password", "message", "パスワード再設定メールを送信しました。メール内のリンクを開いてください。");
}

export async function updatePasswordAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirectWithMessage("/reset-password", "error", "現在、パスワードを変更できません。一定時間後に再度お試しください。");

  const password = requiredString(formData, "password");
  const passwordConfirmation = requiredString(formData, "password_confirmation");

  if (password.length < 8) {
    redirectWithMessage("/reset-password", "error", "パスワードは8文字以上で入力してください。");
  }

  if (password !== passwordConfirmation) {
    redirectWithMessage("/reset-password", "error", "確認用パスワードが一致しません。");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/reset-password?error=${encodeURIComponent(getMemberAuthErrorMessage(error.message))}`);

  redirectWithMessage("/admin/login", "message", "パスワードを変更しました。新しいパスワードでログインしてください。");
}

export async function signOutMemberAction() {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function safeMemberNextPath(value: string) {
  const path = value.trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/admin")) {
    return "/dashboard";
  }
  return path;
}
