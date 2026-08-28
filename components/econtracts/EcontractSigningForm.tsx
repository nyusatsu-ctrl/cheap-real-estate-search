"use client";

import { useMemo, useState } from "react";
import { signEcontractAction } from "@/app/econtracts/[token]/actions";
import type { EcontractImportantItem } from "@/lib/econtracts/types";

export function EcontractSigningForm({ token, items }: { token: string; items: EcontractImportantItem[] }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const allChecked = useMemo(() => items.every((item) => checked[item.id]), [checked, items]);

  return (
    <form action={signEcontractAction} className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm sm:p-6">
      <input type="hidden" name="token" value={token} />
      <h2 className="text-xl font-black text-emerald-950">最終確認</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-emerald-900">
        各項目を1つずつ確認してください。すべて確認するまで契約ボタンは有効になりません。
      </p>
      <div className="mt-5 grid gap-3">
        {items.map((item, index) => (
          <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded border border-emerald-200 bg-white p-4 text-base font-semibold leading-7 text-slate-800">
            <input
              type="checkbox"
              name="consent"
              value={item.id}
              checked={Boolean(checked[item.id])}
              onChange={(event) => setChecked((current) => ({ ...current, [item.id]: event.target.checked }))}
              className="mt-1 h-5 w-5 shrink-0 accent-emerald-700"
            />
            <span><span className="mr-2 font-black text-emerald-800">{index + 1}.</span>{item.text}</span>
          </label>
        ))}
      </div>
      <button
        type="submit"
        disabled={!allChecked}
        className="mt-6 w-full rounded bg-emerald-700 px-5 py-4 text-lg font-black text-white shadow-sm focus-ring disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
      >
        内容を確認し契約する
      </button>
      <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">
        ボタンを押した時刻、本文・同意内容のハッシュ、本人確認方法、IPアドレスおよび端末情報が契約証跡として保存されます。
      </p>
    </form>
  );
}
