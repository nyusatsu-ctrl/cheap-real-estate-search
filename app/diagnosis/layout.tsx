import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "建設業売上アップ診断",
  description: "現在の受注状況、集客、利益管理、組織体制などから、売上アップに向けた優先課題と改善タイプを自動判定します。"
};

export default function DiagnosisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
