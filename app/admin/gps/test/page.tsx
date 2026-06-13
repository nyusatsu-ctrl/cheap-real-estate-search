import Link from "next/link";

const checks = [
  "Supabase SQL Editorで supabase/mv930g-schema.sql が適用済み",
  "npm run gps:tcp が常駐サーバーまたはVPSで起動中",
  "MV930G管理対象のSIMが開通済み",
  "APN、ユーザー名、パスワードがSIM事業者の情報と一致",
  "管理対象のDevice IDまたはIMEIが gps_devices に登録済み",
  "サーバー側のTCPポートがファイアウォールで許可済み",
  "raw_device_logs に受信データが保存されることを確認"
];

export default function GpsRealDeviceTestPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-2xl font-black text-slate-950">MV930G 実機テスト手順</h2>
        <p className="mt-2 text-sm text-slate-600">
          実機到着後にTCP受信、rawログ保存、管理対象設定を確認するための作業ページです。管理対象へ送るSMS/コマンドはMV930Gの正式マニュアルで確認してから使用します。
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-black text-slate-950">1. TCPサーバー起動</h3>
        <pre className="mt-3 overflow-x-auto rounded bg-slate-950 p-3 text-sm text-white">npm run gps:tcp</pre>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <Info label="待受ホスト" value="MV930G_TCP_HOST=0.0.0.0" />
          <Info label="待受ポート" value="MV930G_TCP_PORT=9300" />
          <Info label="raw保存先" value="raw_device_logs" />
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-black text-slate-950">2. APN設定コマンド</h3>
        <div className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
          下記は入力項目の雛形です。MV930G正式マニュアルでSMSコマンド形式を確認してから送信してください。
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <CommandBox label="APNのみ" value="APN,<APN名>#" />
          <CommandBox label="APN + 認証情報" value="APN,<APN名>,<ユーザー名>,<パスワード>#" />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-black text-slate-950">3. SERVER設定コマンド</h3>
        <div className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
          コマンド名、TCP/UDP指定、ドメイン指定可否は資料確認後に確定します。まずは受信サーバーのIP/ポートを控えてください。
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <CommandBox label="TCPサーバー雛形" value="SERVER,<TCP>,<サーバーIPまたはドメイン>,9300#" />
          <CommandBox label="UDPサーバー雛形" value="SERVER,<UDP>,<サーバーIPまたはドメイン>,9300#" />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-black text-slate-950">4. 受信確認</h3>
        <ol className="mt-3 space-y-2 text-sm text-slate-700">
          <li>1. TCPサーバーのログに `saved raw_log=... message_id=... parse=...` が出ることを確認</li>
          <li>2. rawログ一覧で `packet_type` と `parse_status` を確認</li>
          <li>3. `message_id=0200` の場合は最新位置が更新されることを確認</li>
          <li>4. 管理対象詳細で最終通信日時と位置履歴を確認</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/gps/raw-logs" className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
            rawログ確認
          </Link>
          <Link href="/admin/gps/devices" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
            管理対象一覧
          </Link>
          <Link href="/admin/gps/positions" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
            最新位置
          </Link>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-black text-slate-950">トラブル時チェックリスト</h3>
        <ul className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
          {checks.map((check) => (
            <li key={check} className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
              {check}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-bold text-slate-500">{label}</dt>
      <dd className="mt-1 font-mono text-slate-950">{value}</dd>
    </div>
  );
}

function CommandBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="mt-2 break-all font-mono text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}
