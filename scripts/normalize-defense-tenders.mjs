import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const candidatePath = path.join(root, "data", "defense-candidates.json");
const tenderPath = path.join(root, "data", "tender-imports.json");

const defenseOrganizationTypes = new Set([
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

const prefectureRegions = {
  "北海道": "北海道",
  "青森県": "東北",
  "岩手県": "東北",
  "宮城県": "東北",
  "秋田県": "東北",
  "山形県": "東北",
  "福島県": "東北",
  "茨城県": "関東",
  "栃木県": "関東",
  "群馬県": "関東",
  "埼玉県": "関東",
  "千葉県": "関東",
  "東京都": "関東",
  "神奈川県": "関東",
  "山梨県": "関東",
  "新潟県": "中部",
  "富山県": "中部",
  "石川県": "中部",
  "福井県": "中部",
  "長野県": "中部",
  "岐阜県": "中部",
  "静岡県": "中部",
  "愛知県": "中部",
  "三重県": "近畿",
  "滋賀県": "近畿",
  "京都府": "近畿",
  "大阪府": "近畿",
  "兵庫県": "近畿",
  "奈良県": "近畿",
  "和歌山県": "近畿",
  "鳥取県": "中国",
  "島根県": "中国",
  "岡山県": "中国",
  "広島県": "中国",
  "山口県": "中国",
  "徳島県": "四国",
  "香川県": "四国",
  "愛媛県": "四国",
  "高知県": "四国",
  "福岡県": "九州",
  "佐賀県": "九州",
  "長崎県": "九州",
  "熊本県": "九州",
  "大分県": "九州",
  "宮崎県": "九州",
  "鹿児島県": "九州",
  "沖縄県": "沖縄"
};

const shortPrefectures = {
  "熊本": "熊本県",
  "福岡": "福岡県",
  "佐賀": "佐賀県",
  "長崎": "長崎県",
  "大分": "大分県",
  "宮崎": "宮崎県",
  "鹿児島": "鹿児島県",
  "沖縄": "沖縄県"
};

const counters = {
  candidateRegionFixed: 0,
  candidatePrefectureFixed: 0,
  candidateOrganizationTypeFixed: 0,
  candidateSourceNameFixed: 0,
  tenderRegionFixed: 0,
  tenderPrefectureFixed: 0,
  tenderOrganizationTypeFixed: 0,
  tenderSourceNameFixed: 0
};

const candidates = readJson(candidatePath, []);
const tenders = readJson(tenderPath, []);

writeJson(candidatePath, candidates.map((item) => normalize(item, "candidate")));
writeJson(tenderPath, tenders.map((item) => normalize(item, "tender")));

console.log(JSON.stringify(counters, null, 2));

function normalize(item, kind) {
  const next = { ...item };
  const source = next.tender_sources ? { ...next.tender_sources } : null;
  const text = searchText(next);
  const sourceName = next.source_name || source?.source_name || source?.name || next.agency_name || null;
  if (!next.source_name && sourceName) {
    next.source_name = sourceName;
    counters[`${kind}SourceNameFixed`] += 1;
  }

  const organizationType = inferOrganizationType(next);
  if ((!next.organization_type || !defenseOrganizationTypes.has(next.organization_type)) && organizationType) {
    next.organization_type = organizationType;
    counters[`${kind}OrganizationTypeFixed`] += 1;
  }

  const prefecture = validValue(next.prefecture) || extractPrefecture(`${next.base_location || ""} ${next.original_label || ""} ${text}`);
  if ((!validValue(next.prefecture)) && prefecture) {
    next.prefecture = prefecture;
    counters[`${kind}PrefectureFixed`] += 1;
  }

  let region = validValue(next.region) || prefectureRegions[next.prefecture] || null;
  if (!region && isWesternArea(next)) region = next.prefecture === "沖縄県" ? "沖縄" : "九州";
  if (!validValue(next.region) && region) {
    next.region = region;
    counters[`${kind}RegionFixed`] += 1;
  }

  if (isDefenseLike(next)) next.is_defense = true;
  if (source) {
    source.source_name = source.source_name || next.source_name || null;
    source.organization_type = source.organization_type || next.organization_type || null;
    next.tender_sources = source;
  }
  return next;
}

function inferOrganizationType(item) {
  const current = item.organization_type || item.tender_sources?.organization_type;
  if (defenseOrganizationTypes.has(current)) return current;
  const text = searchText(item);
  if (/防衛装備庁/.test(text)) return "defense_equipment_agency";
  if (/陸上自衛隊|\/gsdf\//.test(text)) return "ground_self_defense_force";
  if (/海上自衛隊|地方総監部|\/msdf\//.test(text)) return "maritime_self_defense_force";
  if (/航空自衛隊|基地|分屯基地|\/asdf\//.test(text)) return "air_self_defense_force";
  if (/防衛局/.test(text)) return "defense_bureau";
  if (/防衛医科大学校|ndmc\.ac\.jp/.test(text)) return "defense_hospital";
  if (/防衛研究所|nids\.mod\.go\.jp/.test(text)) return "defense_research";
  if (/防衛省|自衛隊|mod\.go\.jp/.test(text)) return "defense_ministry";
  return null;
}

function isDefenseLike(item) {
  const org = item.organization_type || item.tender_sources?.organization_type;
  if (item.is_defense || defenseOrganizationTypes.has(org)) return true;
  return /防衛省|防衛装備庁|陸上自衛隊|海上自衛隊|航空自衛隊|自衛隊|方面会計隊|地方総監部|基地|分屯基地|防衛局|mod\.go\.jp|nids\.mod\.go\.jp|ndmc\.ac\.jp/.test(searchText(item));
}

function isWesternArea(item) {
  return /\/gsdf\/wae\/|西部方面|西部方面会計隊/.test(searchText(item));
}

function extractPrefecture(text) {
  for (const prefecture of Object.keys(prefectureRegions)) {
    if (text.includes(prefecture)) return prefecture;
  }
  const bracketMatch = text.match(/[（(]([^）)]+)[）)]/);
  if (bracketMatch && shortPrefectures[bracketMatch[1].trim()]) return shortPrefectures[bracketMatch[1].trim()];
  for (const [shortName, prefecture] of Object.entries(shortPrefectures)) {
    if (text.includes(shortName)) return prefecture;
  }
  return null;
}

function searchText(item) {
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

function validValue(value) {
  return value && value !== "未設定" && value !== "全国" ? value : null;
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}
