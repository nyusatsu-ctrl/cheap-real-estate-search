export const PROPERTY_APP_ORIGIN = "https://cheap-real-estate-search.vercel.app";
export const PROPERTY_AUTH_CALLBACK_PATH = "/auth/callback";
export const PROPERTY_SIGNUP_COMPLETE_PATH = "/signup/complete";

export type PropertyMemberAuthMessageCode =
  | "already_registered"
  | "auth_link_invalid"
  | "email_confirmation_unavailable"
  | "email_confirmed"
  | "email_not_confirmed"
  | "invalid_credentials"
  | "invalid_email"
  | "password_mismatch"
  | "password_updated"
  | "rate_limited"
  | "reset_email_sent"
  | "reset_link_invalid"
  | "reset_link_required"
  | "temporarily_unavailable"
  | "weak_password";

export type PropertySignupInput = {
  email: string;
  password: string;
};

export type PropertySignupError = {
  code: "invalid_email" | "invalid_password" | "already_registered" | "rate_limited" | "temporarily_unavailable";
  message: string;
  status: number;
};

export type PropertyAuthCallbackFlow = "signup_confirmation" | "password_reset";
export type PropertyAuthCallbackOutcome = "success" | "failure";

export type PropertyAuthCallbackDestination = {
  path: "/login" | "/forgot-password" | "/reset-password";
  key?: "error" | "message" | "notice";
  code?: PropertyMemberAuthMessageCode;
};

export function validatePropertySignupInput(value: unknown):
  | { ok: true; input: PropertySignupInput }
  | { ok: false; error: PropertySignupError } {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const email = String(record.email ?? "").trim().toLowerCase();
  const password = String(record.password ?? "");

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return {
      ok: false,
      error: {
        code: "invalid_email",
        message: "メールアドレスの形式を確認してください。",
        status: 400
      }
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      error: {
        code: "invalid_password",
        message: "パスワードは8文字以上で入力してください。",
        status: 400
      }
    };
  }

  return { ok: true, input: { email, password } };
}

export function getPropertySignupError(error: unknown): PropertySignupError {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const normalized = `${String(record.code ?? "")} ${String(record.message ?? "")}`.toLowerCase();

  if (normalized.includes("rate limit") || normalized.includes("over_email_send_rate_limit")) {
    return {
      code: "rate_limited",
      message: "確認メールの送信回数が上限に達しました。しばらく時間を置いてから再度お試しください。",
      status: 429
    };
  }

  if (normalized.includes("already registered") || normalized.includes("already exists") || normalized.includes("user_already_exists")) {
    return {
      code: "already_registered",
      message: "登録済みの可能性があります。会員ログインをお試しください。",
      status: 409
    };
  }

  if (normalized.includes("password") || normalized.includes("weak_password")) {
    return {
      code: "invalid_password",
      message: "パスワードは8文字以上で、推測されにくい内容を入力してください。",
      status: 400
    };
  }

  return {
    code: "temporarily_unavailable",
    message: "登録処理を完了できませんでした。一定時間後に再度お試しください。登録済みの場合は会員ログインをお試しください。",
    status: 503
  };
}

export function getPropertySignupPageError(code?: string) {
  switch (code) {
    case "invalid_password":
      return "パスワードは8文字以上で、推測されにくい内容を入力してください。";
    case "already_registered":
      return "登録済みの可能性があります。会員ログインをお試しください。";
    case "rate_limited":
      return "確認メールの送信回数が上限に達しました。しばらく時間を置いてから再度お試しください。";
    case "temporarily_unavailable":
      return "登録処理を完了できませんでした。一定時間後に再度お試しください。登録済みの場合は会員ログインをお試しください。";
    default:
      return "";
  }
}

export function getMemberAuthErrorMessage(message: string) {
  return getMemberAuthPageMessage(getMemberAuthErrorCode(message));
}

export function getMemberAuthErrorCode(error: unknown): PropertyMemberAuthMessageCode {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const normalized = `${String(record.code ?? "")} ${String(record.message ?? error ?? "")}`.toLowerCase();

  if (normalized.includes("email rate limit") || normalized.includes("over_email_send_rate_limit")) {
    return "rate_limited";
  }

  if (normalized.includes("email not confirmed")) {
    return "email_not_confirmed";
  }

  if (normalized.includes("invalid login credentials")) {
    return "invalid_credentials";
  }

  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "already_registered";
  }

  if (normalized.includes("password")) {
    return "weak_password";
  }

  return "temporarily_unavailable";
}

export function getMemberAuthPageMessage(code?: string) {
  switch (code as PropertyMemberAuthMessageCode | undefined) {
    case "already_registered":
      return "このメールアドレスはすでに登録されています。会員ログインをお試しください。";
    case "auth_link_invalid":
      return "リンクが無効か、有効期限が切れています。パスワードを忘れた方から再度お申し込みください。";
    case "email_confirmation_unavailable":
      return "メール確認の処理を完了できませんでした。すでに確認済みの可能性があります。会員ログインをお試しください。";
    case "email_confirmed":
      return "メールアドレスの確認が完了しました。ログインしてください。";
    case "email_not_confirmed":
      return "メール確認が完了していません。確認メール内のボタンを押してからログインしてください。";
    case "invalid_credentials":
      return "メールアドレスまたはパスワードが違います。";
    case "invalid_email":
      return "メールアドレスの形式を確認してください。";
    case "password_mismatch":
      return "確認用パスワードが一致しません。";
    case "password_updated":
      return "パスワードを変更しました。新しいパスワードでログインしてください。";
    case "rate_limited":
      return "メールの送信回数が上限に達しました。しばらく時間を置いてから再度お試しください。";
    case "reset_email_sent":
      return "パスワード再設定メールを送信しました。メール内のボタンから新しいパスワードを設定してください。";
    case "reset_link_invalid":
      return "パスワード再設定リンクが無効か、有効期限が切れています。パスワードを忘れた方から再度お申し込みください。";
    case "reset_link_required":
      return "パスワード再設定メール内のボタンから、この画面を開いてください。リンクが無効な場合は再申請してください。";
    case "weak_password":
      return "パスワードは8文字以上で入力してください。";
    case "temporarily_unavailable":
      return "処理を完了できませんでした。一定時間後に再度お試しください。";
    default:
      return "";
  }
}

export function getPropertyAuthCallbackFlow(next?: string | null): PropertyAuthCallbackFlow {
  return next === "/reset-password" ? "password_reset" : "signup_confirmation";
}

export function getPropertyAuthCallbackDestination(
  next: string | null,
  outcome: PropertyAuthCallbackOutcome
): PropertyAuthCallbackDestination {
  if (getPropertyAuthCallbackFlow(next) === "password_reset") {
    return outcome === "success"
      ? { path: "/reset-password" }
      : { path: "/forgot-password", key: "error", code: "reset_link_invalid" };
  }

  return outcome === "success"
    ? { path: "/login", key: "message", code: "email_confirmed" }
    : { path: "/login", key: "notice", code: "email_confirmation_unavailable" };
}

export function getPropertyAuthCallbackUrl(requestUrl: string, vercelEnvironment?: string) {
  const origin = vercelEnvironment === "production"
    ? PROPERTY_APP_ORIGIN
    : new URL(requestUrl).origin;
  return `${origin}${PROPERTY_AUTH_CALLBACK_PATH}`;
}

export function getPropertyPasswordResetCallbackUrl(requestUrl: string, vercelEnvironment?: string) {
  return `${getPropertyAuthCallbackUrl(requestUrl, vercelEnvironment)}?next=/reset-password`;
}
