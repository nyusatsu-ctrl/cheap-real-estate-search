"use client";

export default function GpsAdminError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-lg border border-rose-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black text-slate-950">GPSデータを読み込めません</h1>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          データベース接続またはGPSテーブルの状態を確認してください。障害時にデモデータや空データへ自動切替はしません。
        </p>
        <p className="mt-2 text-xs text-slate-500">詳細は機密情報を含まないサーバーログで確認できます。</p>
        <button onClick={reset} className="mt-5 rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
          再読み込み
        </button>
      </div>
    </div>
  );
}
