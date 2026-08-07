import Link from "next/link";
import type { Metadata } from "next";
import { GpsAdminShell } from "@/components/gps/GpsAdminShell";
import { getGpsAdminOrPreview } from "@/lib/gps/data";

export const dynamic = "force-dynamic";

const title = "GPS車両管理システム | 株式会社エコループ";
const description = "MiCODUS MV930G-Gの顧客、車両、GPS端末、位置情報、受信ログを管理する専用画面です。";

export const metadata: Metadata = {
  applicationName: "GPS車両管理システム",
  title,
  description,
  robots: {
    index: false,
    follow: false
  },
  openGraph: {
    title,
    description,
    siteName: "株式会社エコループ"
  }
};

export default async function AdminGpsLayout({ children }: { children: React.ReactNode }) {
  const admin = await getGpsAdminOrPreview();

  if (admin.status === "unavailable") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-lg border border-rose-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">GPSデータベースへ接続できません</h1>
          <p className="mt-2 text-slate-700">
            Supabase接続設定を確認してください。デモデータや空データへの自動切替は行いません。
          </p>
        </div>
      </div>
    );
  }

  if (admin.status === "unauthenticated") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">GPS管理画面</h1>
          <p className="mt-2 text-slate-700">MV930G GPS管理には管理者ログインが必要です。</p>
          <Link href="/admin/login?next=%2Fadmin%2Fgps" className="mt-5 inline-block rounded bg-brand-700 px-4 py-2 font-bold text-white focus-ring">
            ログインへ
          </Link>
        </div>
      </div>
    );
  }

  if (admin.status === "forbidden") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-lg border border-rose-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">GPS管理者権限がありません</h1>
          <p className="mt-2 text-slate-700">
            ログイン中のアカウントではGPSデータを閲覧できません。GPSデータベースへの照会は行っていません。
          </p>
        </div>
      </div>
    );
  }

  return (
    <GpsAdminShell email={admin.email} isDemo={admin.isPreview}>
      {children}
    </GpsAdminShell>
  );
}
