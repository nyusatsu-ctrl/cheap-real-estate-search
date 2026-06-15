import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "格安不動産サーチ 管理画面",
  description: "格安不動産サーチの診断者一覧、リード対応状況、診断詳細を管理します。"
};

export default function AdminDiagnosesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
