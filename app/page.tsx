import Link from "next/link";
import { Activity, Database, MapPin, Router, ShieldCheck, Wrench } from "lucide-react";

export default function HomePage() {
  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="max-w-4xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
              <MapPin className="h-4 w-4" />
              MV930G GPS管理プラットフォーム
            </p>
            <h1 className="text-3xl font-black leading-tight text-slate-950 md:text-5xl">GPS車両管理システム</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700">
              車・バイク自社ローン販売、レンタカー、車両管理向けに、顧客、車両、GPS端末、最新位置、raw受信ログ、操作履歴を一元管理します。
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/admin/login" className="inline-flex items-center justify-center rounded bg-brand-700 px-5 py-3 font-bold text-white focus-ring">
                管理者ログイン
              </Link>
              <Link href="/admin/gps" className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 focus-ring">
                GPS管理画面
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            [Activity, "車両状態を把握", "オンライン/オフライン、最終通信、最新位置、速度、方位を管理します。"],
            [Database, "rawログを保存", "プロトコル解析前でも受信データを raw_device_logs に残します。"],
            [Router, "TCP受信に対応", "MV930GからのTCP通信を受け、message_idとDevice IDを簡易解析します。"],
            [ShieldCheck, "安全設計", "燃料カットなどの実機制御は安全確認前のため無効化し、操作ログだけ保存します。"],
            [Wrench, "実機テスト手順", "APN/SERVER設定、受信確認、トラブルチェックを管理画面にまとめます。"],
            [MapPin, "地図連携", "Google Maps APIキー未設定時も緯度経度と外部リンクで確認できます。"]
          ].map(([Icon, title, body]) => (
            <div key={String(title)} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <Icon className="h-5 w-5 text-brand-700" />
              <h2 className="mt-3 text-lg font-black text-slate-950">{String(title)}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-700">{String(body)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
