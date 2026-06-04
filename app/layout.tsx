import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "格安不動産サーチ",
  description: "0円から300万円以下の格安不動産を探せる会員制サービス"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-base font-bold text-slate-950">
              格安不動産サーチ
            </Link>
            <nav className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <Link href="/properties" className="hover:text-brand-700">
                物件一覧
              </Link>
              <Link href="/plans" className="hover:text-brand-700">
                料金
              </Link>
              <Link href="/signup" className="hover:text-brand-700">
                無料登録
              </Link>
              <Link href="/dashboard" className="hover:text-brand-700">
                会員
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
