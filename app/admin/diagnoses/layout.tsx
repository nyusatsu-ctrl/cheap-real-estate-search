import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理画面｜建設業売上アップ診断｜株式会社エコループ",
  description: "建設業売上アップ診断の診断者一覧、リード対応状況、診断詳細を管理します。"
};

export default function AdminDiagnosesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
