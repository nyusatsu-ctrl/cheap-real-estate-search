import type { Metadata } from "next";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://cheap-real-estate-search.vercel.app"),
  title: "建設業売上アップ診断｜株式会社エコループ",
  description: "建設会社の現状を診断し、売上アップ・公共工事参入・経営改善に向けた優先課題とサポート内容を提案します。",
  icons: {
    icon: [{ url: "/images/ecoloop-sales-diagnosis-logo.png", type: "image/png" }],
    apple: [{ url: "/images/ecoloop-sales-diagnosis-logo.png", type: "image/png" }]
  },
  openGraph: {
    title: "建設業売上アップ診断｜株式会社エコループ",
    description: "建設会社の現状を診断し、売上アップ・公共工事参入・経営改善に向けた優先課題とサポート内容を提案します。",
    siteName: "株式会社エコループ",
    images: [
      {
        url: "/images/ecoloop-sales-diagnosis-logo.png",
        width: 1914,
        height: 822,
        alt: "株式会社エコループ 建設業売上アップ診断"
      }
    ]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Suspense fallback={null}><AppHeader /></Suspense>
        <main>{children}</main>
        <AppFooter />
      </body>
    </html>
  );
}
