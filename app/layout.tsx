import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "GPS車両管理システム",
  description: "車・バイク自社ローン、レンタカー、車両管理向けのGPS管理システム"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-base font-bold text-slate-950">
              GPS車両管理システム
            </Link>
            <nav className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <Link href="/admin/gps" className="hover:text-brand-700">
                GPS管理
              </Link>
              <Link href="/admin/login" className="hover:text-brand-700">
                管理者ログイン
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
