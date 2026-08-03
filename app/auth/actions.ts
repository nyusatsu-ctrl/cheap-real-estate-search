"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getMemberAuthErrorCode,
  getPropertyAuthCallbackUrl,
  getPropertyPasswordResetCallbackUrl,
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

function redirectWithCode(path: string, key: "error" | "message", code: string): never {
  const params = new URLSearchParams({ [key]: code });
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

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const next = safeMemberNextPath(String(formData.get("next") ?? ""));
  if (!email || !password) redirect("/login?error=invalid_credentials");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${getMemberAuthErrorCode(error)}`);

  redirect(next);
}

export async function sendPasswordResetAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirectWithCode("/forgot-password", "error", "temporarily_unavailable");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    redirectWithCode("/forgot-password", "error", "invalid_email");
  }
  const origin = await getAppOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getPropertyPasswordResetCallbackUrl(`${origin}/forgot-password`, process.env.VERCEL_ENV)
  });

  if (error) redirect(`/forgot-password?error=${getMemberAuthErrorCode(error)}`);

  redirectWithCode("/forgot-password", "message", "reset_email_sent");
}

export async function updatePasswordAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirectWithCode("/reset-password", "error", "temporarily_unavailable");

  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("password_confirmation") ?? "");

  if (password.length < 8) {
    redirectWithCode("/reset-password", "error", "weak_password");
  }

  if (password !== passwordConfirmation) {
    redirectWithCode("/reset-password", "error", "password_mismatch");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/reset-password?error=${getMemberAuthErrorCode(error)}`);

  redirectWithCode("/login", "message", "password_updated");
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
