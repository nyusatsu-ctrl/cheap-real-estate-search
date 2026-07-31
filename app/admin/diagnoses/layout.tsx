import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理画面｜建設会社向け 経営診断・再成長戦略｜株式会社エコループ",
  description: "建設会社向け経営診断の回答、支援判定、相談、商談、成約状況を管理します。",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminDiagnosesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
