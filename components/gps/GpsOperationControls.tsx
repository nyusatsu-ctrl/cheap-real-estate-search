"use client";

import { useState } from "react";
import { Ban, RotateCcw } from "lucide-react";

export function GpsOperationControls({ deviceId, vehicleId }: { deviceId: string; vehicleId: string | null }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function logTestOperation(operationType: "safe_cut" | "restore") {
    const label = operationType === "safe_cut" ? "燃料カット" : "復旧";
    const confirmed = window.confirm(
      `${label}はMVPでは実機送信しません。確認ダイアログと操作ログ保存のみ実行します。続行しますか？`
    );
    if (!confirmed) return;

    setPending(true);
    setMessage(null);
    const response = await fetch("/api/admin/gps/operations/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        deviceId,
        vehicleId,
        operationType,
        reason: `${label}のMVPテスト操作`
      })
    });
    const result = (await response.json()) as { message?: string };
    setMessage(result.message ?? (response.ok ? "操作ログを保存しました。" : "操作ログ保存に失敗しました。"));
    setPending(false);
  }

  return (
    <div className="rounded-lg border border-rose-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">遠隔制御</h2>
      <div className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
        実機制御は未接続・安全確認前です。現在は管理対象へ送信せず、確認ダイアログ後に操作ログだけ保存します。
      </div>
      <p className="mt-1 text-sm text-slate-600">
        初期状態では実機への送信は無効です。走行中停止は禁止し、将来はRELAY,2#相当の安全カットのみを基本にします。
        確認画面と操作ログ保存を必須にします。
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => logTestOperation("safe_cut")}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50 focus-ring"
        >
          <Ban size={16} />
          燃料カット ログのみ
        </button>
        <button
          type="button"
          onClick={() => logTestOperation("restore")}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50 focus-ring"
        >
          <RotateCcw size={16} />
          復旧 ログのみ
        </button>
      </div>
      {message && <p className="mt-3 rounded bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">{message}</p>}
    </div>
  );
}
