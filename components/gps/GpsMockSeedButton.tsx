"use client";

import { useState } from "react";
import { Database, Send } from "lucide-react";

export function GpsMockSeedButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function seed() {
    setPending(true);
    setMessage(null);
    const response = await fetch("/api/admin/gps/mock/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}"
    });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message ?? (response.ok ? "モックデータを投入しました。" : "投入に失敗しました。"));
    setPending(false);
  }

  async function ingest() {
    setPending(true);
    setMessage(null);
    const response = await fetch("/api/admin/gps/mock/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transport: "tcp" })
    });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message ?? (response.ok ? "モック受信データを保存しました。" : "保存に失敗しました。"));
    setPending(false);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">デモデータ確認</h2>
      <p className="mt-1 text-sm font-bold text-amber-700">
        実データではありません。データベースへの保存、実機通信、SMS送信は行いません。
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={seed}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50 focus-ring"
        >
          <Database size={16} />
          基本データ表示
        </button>
        <button
          type="button"
          onClick={ingest}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50 focus-ring"
        >
          <Send size={16} />
          raw受信デモ解析
        </button>
      </div>
      {message && <p className="mt-3 rounded bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">{message}</p>}
    </div>
  );
}
