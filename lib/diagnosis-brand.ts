export const DIAGNOSIS_APP_NAME = "エコループ 建設会社向け経営診断";
export const DIAGNOSIS_DESCRIPTION =
  "建設会社の経営課題、利益管理、組織体制、公共工事への参入余地と今後90日間の優先行動を整理する無料診断です。";

export const DIAGNOSIS_OPERATOR = {
  companyName: "株式会社エコループ",
  representative: "嶋本耕力",
  address: "〒861-8038 熊本県熊本市東区長嶺東5-8-8",
  phone: "096-201-7191",
  businessHours: "9:30〜17:30（日祝休み）"
} as const;

const FALLBACK_BASE_URL = "https://cheap-real-estate-search.vercel.app";

export function getDiagnosisBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_DIAGNOSIS_BASE_URL?.trim();
  if (!configured) return FALLBACK_BASE_URL;
  try {
    return new URL(configured).origin;
  } catch {
    return FALLBACK_BASE_URL;
  }
}

export function getDiagnosisAbsoluteUrl(path: string) {
  return new URL(path, `${getDiagnosisBaseUrl()}/`).toString();
}
