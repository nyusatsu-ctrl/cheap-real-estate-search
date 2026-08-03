"use client";

import { useState } from "react";

type SignupResponse = {
  ok?: boolean;
  message?: string;
  next?: string;
};

export function SignupForm({ initialError = "" }: { initialError?: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(initialError);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    let keepDisabled = false;

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? "")
        })
      });
      const result = await readSignupResponse(response);

      if (!response.ok || !result.ok) {
        setError(result.message || "登録処理を完了できませんでした。一定時間後に再度お試しください。登録済みの場合は会員ログインをお試しください。");
        return;
      }

      keepDisabled = true;
      window.location.assign(result.next || "/signup/complete");
    } catch {
      setError("画面が更新された可能性があります。再読み込みしてもう一度お試しください。登録済みの場合は会員ログインをお試しください。");
    } finally {
      if (!keepDisabled) setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 grid gap-4" aria-busy={submitting}>
      {error ? (
        <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-sm font-semibold leading-6 text-rose-700">
          {error}
        </p>
      ) : null}
      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        メールアドレス
        <input name="email" type="email" autoComplete="email" required disabled={submitting} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring disabled:bg-slate-100" />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        パスワード
        <input name="password" type="password" autoComplete="new-password" minLength={8} required disabled={submitting} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring disabled:bg-slate-100" />
      </label>
      <button type="submit" disabled={submitting} className="rounded bg-brand-700 px-4 py-3 font-bold text-white focus-ring disabled:cursor-not-allowed disabled:bg-slate-400">
        {submitting ? "登録処理中" : "14日間無料で始める"}
      </button>
    </form>
  );
}

async function readSignupResponse(response: Response): Promise<SignupResponse> {
  try {
    return await response.json() as SignupResponse;
  } catch {
    return {};
  }
}
