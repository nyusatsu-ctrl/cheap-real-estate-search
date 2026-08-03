"use client";

import { LoaderCircle, LogOut } from "lucide-react";
import { useState, type FormEvent } from "react";

export function PropertyLogoutForm({ compact = false }: { compact?: boolean }) {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    setIsPending(true);
    setErrorMessage("");
    try {
      const response = await fetch("/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      const result = response.ok ? await response.json() as { redirectTo?: string } : null;
      if (!result?.redirectTo?.startsWith("/properties")) throw new Error("invalid logout response");
      window.location.replace(result.redirectTo);
    } catch {
      setIsPending(false);
      setErrorMessage("ログアウトを完了できませんでした。通信状況を確認し、もう一度お試しください。");
    }
  }

  return (
    <form
      action="/auth/logout"
      method="post"
      aria-busy={isPending}
      onSubmit={handleSubmit}
      className={compact ? "relative" : undefined}
    >
      <button
        type="submit"
        disabled={isPending}
        className={
          compact
            ? "inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white/85 px-2.5 py-1.5 shadow-sm ring-1 ring-emerald-100 hover:text-emerald-700 disabled:cursor-wait disabled:opacity-70 sm:px-3 sm:py-2"
            : "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-700 disabled:cursor-wait disabled:opacity-70 focus-ring"
        }
      >
        {isPending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogOut className="h-4 w-4" aria-hidden="true" />
        )}
        <span>{isPending ? "ログアウト中…" : "ログアウト"}</span>
      </button>
      <span className="sr-only" aria-live="polite">
        {isPending ? "ログアウト処理中です" : ""}
      </span>
      {errorMessage ? (
        <p
          role="alert"
          className={compact
            ? "absolute right-0 top-full z-20 mt-2 w-72 rounded border border-rose-200 bg-white p-3 text-left text-xs font-semibold leading-5 text-rose-800 shadow-lg"
            : "mt-2 max-w-md text-sm font-semibold leading-6 text-rose-700"}
        >
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
