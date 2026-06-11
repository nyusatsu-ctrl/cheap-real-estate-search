import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "建設業売上アップ診断",
  description: "建設業者・一人親方・職人・専門工事業者向けの売上アップ診断アプリ"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-base font-bold text-slate-950">
              建設業売上アップ診断
            </Link>
            <nav className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <Link href="/diagnosis" className="hover:text-brand-700">
                無料診断
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
