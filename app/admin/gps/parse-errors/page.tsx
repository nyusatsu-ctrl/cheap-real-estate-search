import { loadGpsAdminData } from "@/lib/gps/data";

export default async function GpsParseErrorsPage() {
  const data = await loadGpsAdminData();

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-lg font-black text-slate-950">プロトコル解析エラー</h2>
        <p className="mt-1 text-sm text-slate-600">未対応・解析失敗の受信データを確認します。</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">日時</th>
              <th className="px-3 py-3">種別</th>
              <th className="px-3 py-3">parser</th>
              <th className="px-3 py-3">raw_log_id</th>
              <th className="px-3 py-3">内容</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {data.parseErrors.map((error) => (
              <tr key={error.id}>
                <td className="px-3 py-3 text-slate-700">{formatDateTime(error.created_at)}</td>
                <td className="px-3 py-3 font-bold text-slate-950">{error.error_type}</td>
                <td className="px-3 py-3 text-slate-700">{error.parser_version ?? "-"}</td>
                <td className="px-3 py-3 font-mono text-xs text-slate-700">{error.raw_log_id}</td>
                <td className="px-3 py-3 text-slate-700">{error.error_message}</td>
              </tr>
            ))}
            {data.parseErrors.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-slate-500">
                  解析エラーはありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
}
