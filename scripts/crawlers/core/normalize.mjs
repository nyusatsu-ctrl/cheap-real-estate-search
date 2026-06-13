import { cleanupText } from "./fetch.mjs";
import { extractPrefecture, extractCity, normalizeCity } from "../parsers/address.mjs";
import { inferPropertyClassification } from "../parsers/property-type.mjs";
import { buildDuplicateKey } from "../utils/duplicate-key.mjs";
import { buildContentHash } from "../utils/content-hash.mjs";
import { getAreaBlock } from "../utils/region.mjs";

export function normalizeCandidate(raw, source) {
  const address = cleanupText(raw.address_display ?? raw.address ?? "");
  const prefecture = raw.prefecture ?? extractPrefecture(address) ?? source.prefecture ?? "都道府県未確認";
  const city = normalizeCity(raw.city ?? extractCity(address, prefecture, source.cityFallback ?? "市区町村未確認"), source.cityFallback ?? "市区町村未確認");
  const searchText = [
    source.name,
    raw.title,
    raw.raw_text,
    raw.property_type,
    raw.property_category,
    address
  ].filter(Boolean).join("\n");
  const classification = inferPropertyClassification({
    title: raw.title,
    text: searchText,
    landAreaM2: raw.land_area_m2,
    buildingAreaM2: raw.building_area_m2
  });
  const propertyType = raw.property_type ?? classification.propertyType;
  const propertyCategory = raw.property_category ?? classification.propertyCategory;
  const parseWarnings = buildParseWarnings({
    raw,
    prefecture,
    city,
    propertyCategory,
    fallbackCity: source.cityFallback ?? "市区町村未確認"
  });

  const candidate = {
    source_key: source.id,
    source_name: source.name,
    source_url: raw.source_url,
    source_listing_url: raw.source_listing_url ?? source.listUrl ?? source.baseUrl,
    source_external_id: raw.source_external_id ?? null,
    title: cleanupText(raw.title ?? `${prefecture}${city}の格安物件`).slice(0, 120),
    title_normalized: normalizeTitle(raw.title ?? ""),
    price_yen: raw.price_yen ?? null,
    raw_price_text: raw.raw_price_text ?? null,
    prefecture,
    city,
    address_display: address || `${prefecture}${city}`,
    property_type: propertyType,
    property_category: propertyCategory,
    transaction_type: raw.transaction_type ?? inferTransactionType(searchText, raw.price_yen),
    land_area_m2: normalizeNullableNumber(raw.land_area_m2),
    building_area_m2: normalizeNullableNumber(raw.building_area_m2),
    construction_year: normalizeNullableInteger(raw.construction_year),
    source_published_at: raw.source_published_at ?? raw.listed_at ?? null,
    source_updated_at: raw.source_updated_at ?? null,
    scraped_at: new Date().toISOString(),
    first_detected_at: null,
    last_checked_at: null,
    last_changed_at: null,
    has_updates: false,
    price_band: buildPriceBand(raw.price_yen),
    risk_tags: raw.risk_tags ?? inferRiskTags(searchText),
    remarks: cleanupText(raw.remarks ?? `${source.name}から取得候補を検出。詳細本文と画像は保存せず、元URLへ送客。`).slice(0, 160),
    area_block: getAreaBlock(prefecture),
    crawl_status: "candidate",
    parse_warnings: parseWarnings
  };

  candidate.duplicate_key = buildDuplicateKey(candidate);
  candidate.content_hash = buildContentHash(candidate);

  return candidate;
}

export function normalizeCandidates(rawCandidates, source) {
  return rawCandidates
    .filter((candidate) => candidate?.source_url)
    .map((candidate) => normalizeCandidate(candidate, source));
}

function normalizeTitle(value) {
  return cleanupText(value).replace(/[【】［］\[\]（）()「」『』]/g, "").slice(0, 120);
}

function normalizeNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
}

function normalizeNullableInteger(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildPriceBand(priceYen) {
  if (priceYen === null || priceYen === undefined) return "価格未確認";
  if (priceYen === 0) return "0円";
  if (priceYen <= 500000) return "50万円以下";
  if (priceYen <= 1000000) return "100万円以下";
  if (priceYen <= 3000000) return "300万円以下";
  if (priceYen <= 5000000) return "500万円以下";
  return "500万円超";
}

function inferTransactionType(text, priceYen) {
  if (/競売/.test(text)) return "競売";
  if (/公売/.test(text)) return "公売";
  if (/国有地|国有財産/.test(text)) return "国有地";
  if (/市有地|町有地|村有地|公有財産/.test(text)) return "公有地";
  if (priceYen === 0 || /無償|0円|０円|譲渡/.test(text)) return "無償譲渡";
  return "売買";
}

function inferRiskTags(text) {
  const rules = [
    ["農地", /農地|農用地|田畑|田んぼ|畑地|水田/],
    ["山林", /山林|森林|立木|原野/],
    ["別荘地", /別荘地|管理費/],
    ["再建築注意", /再建築不可|未接道|接道なし|道路なし/],
    ["境界注意", /境界未確定|境界不明/],
    ["残置物", /残置物|家財|片付け/],
    ["解体前提", /解体|取り壊し|倒壊/],
    ["公売", /公売/],
    ["競売", /競売/],
    ["国有地", /国有地|国有財産/]
  ];

  return rules.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag);
}

function buildParseWarnings({ raw, prefecture, city, propertyCategory, fallbackCity }) {
  const warnings = [];
  if (raw.price_yen === null || raw.price_yen === undefined) warnings.push("price_not_numeric");
  if (!raw.raw_price_text) warnings.push("raw_price_text_missing");
  if (!raw.source_url) warnings.push("source_url_missing");
  if (!prefecture || prefecture === "都道府県未確認") warnings.push("prefecture_missing");
  if (!city || city === fallbackCity) warnings.push("city_missing");
  if (!propertyCategory || propertyCategory === "unknown") warnings.push("property_type_unknown");
  return warnings;
}
