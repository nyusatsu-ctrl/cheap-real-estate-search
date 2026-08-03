"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  next: string;
};

export function LoginForm({ action, next }: Props) {
  return (
    <form action={action} className="mt-5 grid gap-4">
      <input type="hidden" name="next" value={next} />
      <LoginFields />
    </form>
  );
}

function LoginFields() {
  const { pending } = useFormStatus();

  return (
    <fieldset disabled={pending} aria-busy={pending} className="contents">
      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        メールアドレス
        <input name="email" type="email" required autoComplete="email" className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring disabled:bg-slate-100" />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        パスワード
        <input name="password" type="password" required autoComplete="current-password" className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring disabled:bg-slate-100" />
      </label>
      <button
        type="submit"
        disabled={pending}
        aria-disabled={pending}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-brand-700 px-4 py-3 font-bold text-white focus-ring disabled:cursor-wait disabled:bg-slate-500"
      >
        {pending ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
        {pending ? "ログイン中…" : "ログイン"}
      </button>
      <p role="status" aria-live="polite" className={pending ? "text-center text-sm font-semibold text-slate-600" : "sr-only"}>
        {pending ? "ログイン処理中です。画面が切り替わるまでお待ちください。" : "ログインフォームを入力できます。"}
      </p>
    </fieldset>
  );
}
