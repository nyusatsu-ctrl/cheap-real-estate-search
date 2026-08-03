import { NextResponse } from "next/server";
import {
  getPropertyAuthCallbackUrl,
  getPropertySignupError,
  PROPERTY_SIGNUP_COMPLETE_PATH,
  validatePropertySignupInput
} from "@/lib/property-signup";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate"
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse({
      code: "temporarily_unavailable",
      message: "入力内容を確認して、もう一度お試しください。",
      status: 400
    });
  }

  const validated = validatePropertySignupInput(body);
  if (!validated.ok) return errorResponse(validated.error);

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return errorResponse({
      code: "temporarily_unavailable",
      message: "現在、登録を受け付けられません。一定時間後に再度お試しください。",
      status: 503
    });
  }

  let signupResult: Awaited<ReturnType<typeof supabase.auth.signUp>>;
  try {
    signupResult = await supabase.auth.signUp({
      email: validated.input.email,
      password: validated.input.password,
      options: {
        emailRedirectTo: getPropertyAuthCallbackUrl(request.url, process.env.VERCEL_ENV)
      }
    });
  } catch {
    console.error("[property-signup] auth service unavailable");
    return errorResponse({
      code: "temporarily_unavailable",
      message: "登録処理を完了できませんでした。一定時間後に再度お試しください。登録済みの場合は会員ログインをお試しください。",
      status: 503
    });
  }

  const { data, error } = signupResult;

  if (error) {
    const publicError = getPropertySignupError(error);
    console.warn("[property-signup] rejected", {
      code: publicError.code,
      authCode: typeof error.code === "string" ? error.code : undefined,
      status: error.status
    });
    return errorResponse(publicError);
  }

  if (!data.user) {
    return errorResponse({
      code: "temporarily_unavailable",
      message: "登録処理を完了できませんでした。一定時間後に再度お試しください。",
      status: 503
    });
  }

  return NextResponse.json(
    {
      ok: true,
      status: data.session ? "signed_in" : "confirmation_required",
      next: data.session ? "/dashboard" : PROPERTY_SIGNUP_COMPLETE_PATH
    },
    { status: 202, headers: RESPONSE_HEADERS }
  );
}

function errorResponse(error: { code: string; message: string; status: number }) {
  return NextResponse.json(
    { ok: false, code: error.code, message: error.message },
    { status: error.status, headers: RESPONSE_HEADERS }
  );
}
