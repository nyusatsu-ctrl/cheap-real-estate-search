import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "建設業売上アップ診断｜株式会社エコループ",
  description: "建設会社の現状を診断し、売上アップ・公共工事参入・経営改善に向けた優先課題とサポート内容を提案します。",
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

export default function DiagnosisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
