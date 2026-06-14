import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "格安不動産サーチ",
  description: "0円物件と300万円以下の格安不動産を探せる会員制サービス"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AppHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
