import type { Metadata } from "next";
import "./diagnosis-print.css";

export const metadata: Metadata = {
  title: "建設会社向け 経営診断・再成長戦略｜株式会社エコループ",
  description: "経営課題、利益管理、組織体制、公共工事への参入余地を無料で診断します。",
  robots: {
    index: false,
    follow: false
  },
  openGraph: {
    title: "建設会社向け 経営診断・再成長戦略｜株式会社エコループ",
    description: "経営課題、利益管理、組織体制、公共工事への参入余地を無料で診断します。",
    siteName: "株式会社エコループ",
    images: [
      {
        url: "/images/ecoloop-sales-diagnosis-logo.png",
        width: 1914,
        height: 822,
        alt: "株式会社エコループ 建設会社向け 経営診断・再成長戦略"
      }
    ]
  }
};

export default function DiagnosisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
