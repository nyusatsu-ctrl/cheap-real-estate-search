import { cleanupText, fetchText, htmlToText, decodeEntities } from "../core/fetch.mjs";
import { extractAddress, extractCity, extractPrefecture } from "../parsers/address.mjs";
import { extractAreaM2 } from "../parsers/area.mjs";
import { extractDate } from "../parsers/date.mjs";

export async function crawl(source, options = {}) {
  const limit = options.limit ?? 20;
  const html = await fetchText(source.listUrl);
  const items = extractItems(source, html).slice(0, limit);
  const candidates = [];
  const warnings = [];

  for (const item of items) {
    try {
      const detailHtml = await fetchText(item.url);
      const text = htmlToText(detailHtml);
      if (/成約済み|売却済み|受付終了/.test(text)) continue;
      candidates.push(parseDetail(source, detailHtml, item));
    } catch (error) {
      warnings.push(`詳細ページ取得失敗: ${item.url} (${error.message})`);
    }
  }

  return { found: items.length, candidates, warnings };
}

function extractItems(source, html) {
  const items = [];
  const seen = new Set();
  for (const match of html.matchAll(/"headline":\s*"([^"]+)"[\s\S]{0,900}?"url":\s*"([^"]+\/pages\/[0-9]+\?detail=1&b_id=[0-9]+&r_id=[0-9]+#[^"]+)"/g)) {
    const url = new URL(match[2], source.baseUrl).toString();
    if (seen.has(url)) continue;
    seen.add(url);
    items.push({ title: decodeEntities(match[1]), url });
  }
  for (const match of html.matchAll(/"url":\s*"([^"]+\/pages\/[0-9]+\?detail=1&b_id=[0-9]+&r_id=[0-9]+#[^"]+)"/g)) {
    const url = new URL(match[1], source.baseUrl).toString();
    if (seen.has(url)) continue;
    seen.add(url);
    items.push({ title: "全国0円不動産の0円物件", url });
  }
  return items;
}

function parseDetail(source, html, item) {
  const text = htmlToText(html);
  const location = extractZenkokuLocation(text, item.title);

  return {
    source_listing_url: source.listUrl,
    source_url: item.url,
    title: cleanupText(item.title).replace(/^※?(商談中|成約済み)\s*/, "").slice(0, 120),
    price_yen: 0,
    raw_price_text: "0円",
    prefecture: location.prefecture,
    city: location.city,
    address_display: location.addressDisplay,
    land_area_m2: extractAreaM2(text, ["土地面積", "敷地面積", "宅地面積", "土地"]),
    building_area_m2: extractAreaM2(text, ["建物面積", "延床面積", "延べ床面積", "建物"], { fallbackToFirst: false }),
    source_published_at: extractDate(text, ["掲載日", "登録日", "公開日"]),
    source_updated_at: extractDate(text, ["更新日", "最終更新日"]),
    transaction_type: "無償譲渡",
    remarks: "全国0円不動産の公開ページから取得候補を検出。"
  };
}

function extractZenkokuLocation(text, title) {
  const fallback = "市区町村未確認";
  const lines = text.split("\n").map(cleanupText).filter(Boolean);
  const labeledAddress = extractAddress(text, null, fallback);
  const candidates = [
    labeledAddress,
    title,
    ...lines.filter((line) => extractPrefecture(line))
  ].filter(Boolean);

  for (const candidate of candidates) {
    const cleaned = cleanupLocationCandidate(candidate);
    const prefecture = extractPrefecture(cleaned);
    if (!prefecture) continue;
    const rawCity = extractCity(cleaned, prefecture, null);
    if (!rawCity || rawCity === fallback) continue;
    const city = normalizeMunicipality(rawCity);

    return {
      prefecture,
      city,
      addressDisplay: buildSafeAddressDisplay(cleaned, prefecture, rawCity)
    };
  }

  return {
    prefecture: extractPrefecture(text) ?? null,
    city: fallback,
    addressDisplay: fallback
  };
}

function buildSafeAddressDisplay(value, prefecture, city) {
  const cleaned = cleanupLocationCandidate(value);
  const base = `${prefecture}${city}`;
  const start = cleaned.indexOf(base);
  if (start === -1) return base;

  const tail = cleaned.slice(start + base.length);
  const compactTail = trimAddressTail(tail);
  return cleanupText(`${base}${compactTail}`).slice(0, 80);
}

function trimAddressTail(value) {
  const text = cleanupText(value)
    .replace(/^[\s　:：\-ー|｜／\/、,]+/, "")
    .replace(/^(大字|字)\s+/, "$1");
  if (!text) return "";

  const cut = text.search(/(0円|０円|譲渡|物件|土地と建物|土地・建物|土地、建物|土地と家屋|土地・家屋|土地、家屋|建物|家屋|県道|国道|道路|近く|付近|徒歩|車で|学校|施設|良好|景色|！！|!|。)/);
  const head = cleanupText((cut >= 0 ? text.slice(0, cut) : text).split(/[、,。|｜／\/]/)[0]);

  if (!head || head.length > 18) return "";
  return head;
}

function cleanupLocationCandidate(value) {
  return cleanupText(value)
    .replace(/[【】\[\]［］（）()]/g, " ")
    .replace(/^(所在地|住所|所在|所在地番)[:：\s]*/, "")
    .replace(/^(物件名|物件|名称)[:：\s]*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMunicipality(value) {
  return cleanupText(value).replace(/^.+郡(?=.+(?:町|村)$)/, "");
}
