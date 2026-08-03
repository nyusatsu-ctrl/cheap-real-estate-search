export type LeadSource = "aidma" | "meta" | "lp" | "referral" | "monitor2026aug" | "direct" | "other";

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  aidma: "アイドマHD",
  meta: "Meta広告",
  lp: "自社LP",
  referral: "紹介",
  monitor2026aug: "10社限定モニター",
  direct: "直接",
  other: "その他"
};

const LEAD_SOURCE_VALUES = new Set<LeadSource>(Object.keys(LEAD_SOURCE_LABELS) as LeadSource[]);

export function normalizeLeadSource(value: string | null | undefined): LeadSource {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "direct";
  return LEAD_SOURCE_VALUES.has(normalized as LeadSource) ? normalized as LeadSource : "other";
}

export function getLeadSourceLabel(value: string | null | undefined) {
  return LEAD_SOURCE_LABELS[normalizeLeadSource(value)];
}
