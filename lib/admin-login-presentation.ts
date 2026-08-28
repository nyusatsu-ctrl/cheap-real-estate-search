export type AdminLoginKind = "contract" | "gps" | "diagnosis";

export type AdminLoginPresentation = {
  kind: AdminLoginKind;
  systemName: string;
  description: string;
  metadataTitle: string;
  metadataDescription: string;
};

const DIAGNOSIS_METADATA = {
  metadataTitle: "管理者ログイン｜建設業売上アップ診断｜株式会社エコループ",
  metadataDescription: "建設業売上アップ診断の診断者一覧、リード対応状況、診断詳細を管理するためのログイン画面です。"
};

const CONTRACT_PRESENTATION: AdminLoginPresentation = {
  kind: "contract",
  systemName: "契約管理システム",
  description: "契約台帳・電子契約・顧客情報を管理するアカウントでログインしてください。",
  metadataTitle: "管理者ログイン｜株式会社エコループ｜契約管理システム",
  metadataDescription: "契約台帳・電子契約・顧客情報を管理するアカウントでログインしてください。"
};

const GPS_PRESENTATION: AdminLoginPresentation = {
  kind: "gps",
  systemName: "GPS車両管理システム",
  description: "GPS顧客、車両、端末、受信ログを管理するアカウントでログインしてください。",
  ...DIAGNOSIS_METADATA
};

const DIAGNOSIS_PRESENTATION: AdminLoginPresentation = {
  kind: "diagnosis",
  systemName: "建設業売上アップ診断",
  description: "診断者一覧、リード対応状況、診断詳細を管理するアカウントでログインしてください。",
  ...DIAGNOSIS_METADATA
};

const CONTRACT_ADMIN_ROUTE_BASES = ["/admin/sales-contracts", "/admin/econtracts"] as const;

export function getAdminLoginPresentation(redirectTo: string): AdminLoginPresentation {
  const pathname = redirectTo.split(/[?#]/, 1)[0];
  if (CONTRACT_ADMIN_ROUTE_BASES.some((base) => pathname === base || pathname.startsWith(`${base}/`))) {
    return CONTRACT_PRESENTATION;
  }
  if (pathname === "/admin/gps" || pathname.startsWith("/admin/gps/")) return GPS_PRESENTATION;
  return DIAGNOSIS_PRESENTATION;
}
