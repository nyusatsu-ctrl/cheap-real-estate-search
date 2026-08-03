export const PROPERTY_APP_ORIGIN = "https://cheap-real-estate-search.vercel.app";
export const PROPERTY_AUTH_CALLBACK_PATH = "/auth/callback";
export const PROPERTY_SIGNUP_COMPLETE_PATH = "/signup/complete";

export type PropertySignupInput = {
  email: string;
  password: string;
};

export type PropertySignupError = {
  code: "invalid_email" | "invalid_password" | "already_registered" | "rate_limited" | "temporarily_unavailable";
  message: string;
  status: number;
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
  const normalized = message.toLowerCase();

  if (normalized.includes("email rate limit") || normalized.includes("over_email_send_rate_limit")) {
    return "確認メールの送信回数が上限に達しました。しばらく時間を置いてから再度お試しください。";
  }

  if (normalized.includes("email not confirmed")) {
    return "メール確認が完了していません。確認メール内のボタンを押してからログインしてください。";
  }

  if (normalized.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが違います。";
  }

  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "このメールアドレスはすでに登録されています。会員ログインをお試しください。";
  }

  if (normalized.includes("password")) {
    return "パスワードは8文字以上で入力してください。";
  }

  return "処理を完了できませんでした。一定時間後に再度お試しください。";
}

export function getPropertyAuthCallbackUrl(requestUrl: string, vercelEnvironment?: string) {
  const origin = vercelEnvironment === "production"
    ? PROPERTY_APP_ORIGIN
    : new URL(requestUrl).origin;
  return `${origin}${PROPERTY_AUTH_CALLBACK_PATH}`;
}
