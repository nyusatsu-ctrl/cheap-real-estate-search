export const DEFENSE_ORGANIZATION_TYPES = new Set([
  "defense_ministry",
  "defense_equipment_agency",
  "ground_self_defense_force",
  "maritime_self_defense_force",
  "air_self_defense_force",
  "defense_bureau",
  "defense_school",
  "defense_hospital",
  "defense_research",
  "other_defense"
]);

export const PREFECTURE_REGIONS: Record<string, string> = {
  北海道: "北海道",
  青森県: "東北",
  岩手県: "東北",
  宮城県: "東北",
  秋田県: "東北",
  山形県: "東北",
  福島県: "東北",
  茨城県: "関東",
  栃木県: "関東",
  群馬県: "関東",
  埼玉県: "関東",
  千葉県: "関東",
  東京都: "関東",
  神奈川県: "関東",
  山梨県: "関東",
  新潟県: "中部",
  富山県: "中部",
  石川県: "中部",
  福井県: "中部",
  長野県: "中部",
  岐阜県: "中部",
  静岡県: "中部",
  愛知県: "中部",
  三重県: "近畿",
  滋賀県: "近畿",
  京都府: "近畿",
  大阪府: "近畿",
  兵庫県: "近畿",
  奈良県: "近畿",
  和歌山県: "近畿",
  鳥取県: "中国",
  島根県: "中国",
  岡山県: "中国",
  広島県: "中国",
  山口県: "中国",
  徳島県: "四国",
  香川県: "四国",
  愛媛県: "四国",
  高知県: "四国",
  福岡県: "九州",
  佐賀県: "九州",
  長崎県: "九州",
  熊本県: "九州",
  大分県: "九州",
  宮崎県: "九州",
  鹿児島県: "九州",
  沖縄県: "沖縄"
};

const SHORT_PREFECTURES: Record<string, string> = {
  熊本: "熊本県",
  福岡: "福岡県",
  佐賀: "佐賀県",
  長崎: "長崎県",
  大分: "大分県",
  宮崎: "宮崎県",
  鹿児島: "鹿児島県",
  沖縄: "沖縄県"
};

const DEFENSE_KEYWORDS = [
  "防衛省",
  "防衛装備庁",
  "陸上自衛隊",
  "海上自衛隊",
  "航空自衛隊",
  "自衛隊",
  "方面会計隊",
  "地方総監部",
  "基地",
  "分屯基地",
  "防衛局",
  "mod.go.jp",
  "nids.mod.go.jp",
  "ndmc.ac.jp"
];

type TenderLike = {
  id?: string;
  source_id?: string | null;
  source_name?: string | null;
  organization_type?: string | null;
  title?: string | null;
  agency_name?: string | null;
  tender_type?: string | null;
  original_label?: string | null;
  region?: string | null;
  prefecture?: string | null;
  base_location?: string | null;
  source_url?: string | null;
  pdf_url?: string | null;
  raw_text?: string | null;
  detail_memo?: string | null;
  is_defense?: boolean | null;
  tender_sources?: {
    name?: string | null;
    source_name?: string | null;
    organization_type?: string | null;
    base_url?: string | null;
    url?: string | null;
  } | null;
};

export function isDefenseOrganizationType(value?: string | null) {
  return Boolean(value && DEFENSE_ORGANIZATION_TYPES.has(value));
}

export function isDefenseLike(item: TenderLike) {
  if (item.is_defense) return true;
  if (isDefenseOrganizationType(item.organization_type ?? item.tender_sources?.organization_type)) return true;
  return DEFENSE_KEYWORDS.some((keyword) => tenderSearchText(item).includes(keyword));
}

export function inferDefenseOrganizationType(item: TenderLike) {
  const text = tenderSearchText(item);
  const current = item.organization_type ?? item.tender_sources?.organization_type;
  if (isDefenseOrganizationType(current)) return current;
  if (/防衛装備庁/.test(text)) return "defense_equipment_agency";
  if (/陸上自衛隊|\/gsdf\//.test(text)) return "ground_self_defense_force";
  if (/海上自衛隊|地方総監部|\/msdf\//.test(text)) return "maritime_self_defense_force";
  if (/航空自衛隊|基地|分屯基地|\/asdf\//.test(text)) return "air_self_defense_force";
  if (/防衛局/.test(text)) return "defense_bureau";
  if (/防衛医科大学校|ndmc\.ac\.jp/.test(text)) return "defense_hospital";
  if (/防衛研究所|nids\.mod\.go\.jp/.test(text)) return "defense_research";
  if (/防衛省|自衛隊|mod\.go\.jp/.test(text)) return "defense_ministry";
  return current ?? null;
}

export function prefectureToRegion(prefecture?: string | null) {
  if (!prefecture || prefecture === "未設定") return null;
  return PREFECTURE_REGIONS[prefecture] ?? null;
}

export function extractPrefectureFromText(text?: string | null) {
  if (!text) return null;
  for (const prefecture of Object.keys(PREFECTURE_REGIONS)) {
    if (text.includes(prefecture)) return prefecture;
  }
  const bracketMatch = text.match(/[（(]([^）)]+)[）)]/);
  if (bracketMatch) {
    const inner = bracketMatch[1].trim();
    if (SHORT_PREFECTURES[inner]) return SHORT_PREFECTURES[inner];
  }
  for (const [shortName, prefecture] of Object.entries(SHORT_PREFECTURES)) {
    if (text.includes(shortName)) return prefecture;
  }
  return null;
}

export function isWesternAreaAccounting(item: TenderLike) {
  const text = tenderSearchText(item);
  return text.includes("/gsdf/wae/") || text.includes("西部方面") || text.includes("西部方面会計隊");
}

export function normalizedTenderLocation(item: TenderLike) {
  const text = tenderSearchText(item);
  const inferredPrefecture = extractPrefectureFromText(`${item.base_location ?? ""} ${item.original_label ?? ""} ${text}`);
  const prefecture = validValue(item.prefecture) ?? inferredPrefecture;
  let region = validValue(item.region) ?? prefectureToRegion(prefecture);

  if (!region && isWesternAreaAccounting(item)) {
    region = prefecture === "沖縄県" ? "沖縄" : "九州";
  }

  return {
    region: region ?? item.region ?? "全国",
    prefecture: prefecture ?? item.prefecture ?? "未設定"
  };
}

export function normalizeDefenseTender<T extends TenderLike>(item: T): T {
  const location = normalizedTenderLocation(item);
  const organizationType = inferDefenseOrganizationType(item);
  const sourceName = item.source_name ?? item.tender_sources?.source_name ?? item.tender_sources?.name ?? item.agency_name ?? null;

  return {
    ...item,
    source_name: sourceName,
    organization_type: organizationType,
    region: location.region,
    prefecture: location.prefecture,
    is_defense: isDefenseLike({ ...item, organization_type: organizationType }),
    tender_sources: item.tender_sources ? {
      ...item.tender_sources,
      source_name: item.tender_sources.source_name ?? sourceName,
      organization_type: item.tender_sources.organization_type ?? organizationType
    } : item.tender_sources
  };
}

export function tenderRegion(item: TenderLike) {
  return normalizedTenderLocation(item).region;
}

function tenderSearchText(item: TenderLike) {
  return [
    item.title,
    item.agency_name,
    item.source_name,
    item.organization_type,
    item.region,
    item.prefecture,
    item.base_location,
    item.original_label,
    item.source_url,
    item.pdf_url,
    item.raw_text,
    item.detail_memo,
    item.tender_sources?.name,
    item.tender_sources?.source_name,
    item.tender_sources?.organization_type,
    item.tender_sources?.base_url,
    item.tender_sources?.url
  ].filter(Boolean).join(" ");
}

function validValue(value?: string | null) {
  if (!value || value === "未設定" || value === "全国") return null;
  return value;
}
