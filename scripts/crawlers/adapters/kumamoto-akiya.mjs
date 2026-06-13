import { cleanupText, fetchText, htmlToText } from "../core/fetch.mjs";
import { extractAddress, extractCity } from "../parsers/address.mjs";
import { extractAreaM2 } from "../parsers/area.mjs";
import { extractDate } from "../parsers/date.mjs";
import { extractPriceYen } from "../parsers/price.mjs";

export async function crawl(source, options = {}) {
  const limit = options.limit ?? 20;
  const detailUrls = await collectDetailUrls(source, Math.max(1, Math.ceil(limit / 12)));
  const candidates = [];
  const warnings = [];
  let failed = 0;
  const scanLimit = Math.min(detailUrls.length, Math.max(limit * 5, limit));

  for (const url of detailUrls.slice(0, scanLimit)) {
    try {
      const html = await fetchText(url);
      candidates.push(parseDetail(source, html, url));
    } catch (error) {
      failed += 1;
      warnings.push(`詳細ページ取得失敗: ${url} (${error.message})`);
    }
  }

  return { found: detailUrls.length, candidates, warnings, failed };
}

async function collectDetailUrls(source, pages) {
  const urls = new Set();

  for (let page = 1; page <= pages; page += 1) {
    const listUrl = page === 1 ? source.listUrl : new URL(`page/${page}/`, source.listUrl).toString();
    const html = await fetchText(listUrl);
    for (const match of html.matchAll(/href=["']([^"']*\/property\/p[0-9]+\/?[^"']*)["']/g)) {
      urls.add(new URL(match[1], source.baseUrl).toString());
    }
  }

  return [...urls];
}

function parseDetail(source, html, sourceUrl) {
  const text = htmlToText(html);
  const title = extractTitle(html, text);
  const price = extractPriceYen(html, text);
  const address = extractAddress(text, "熊本県", "市区町村未確認");

  return {
    source_listing_url: source.listUrl,
    source_url: sourceUrl,
    title,
    price_yen: price.priceYen,
    raw_price_text: price.rawPriceText,
    prefecture: "熊本県",
    city: extractCity(address, "熊本県"),
    address_display: address,
    land_area_m2: extractAreaM2(text, ["土地面積", "土地", "敷地面積"]),
    building_area_m2: extractAreaM2(text, ["建物面積", "延床面積", "建物"], { fallbackToFirst: false }),
    construction_year: extractConstructionYear(text),
    source_published_at: extractDate(text, ["登録日", "掲載日", "公開日"]),
    source_updated_at: extractDate(text, ["更新日", "最終更新日"]),
    remarks: "熊本県空き家バンクの公開ページから取得候補を検出。"
  };
}

function extractTitle(html, text) {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return cleanupText(ogTitle ?? h1 ?? title ?? text.split("\n").find(Boolean) ?? "熊本県の格安物件")
    .replace(/^熊本県空き家バンクプラットフォーム\s*[|｜]\s*物件詳細\s*[|｜]\s*/, "")
    .replace(/\s*[\-|｜]\s*熊本県空き家バンク.*$/, "")
    .slice(0, 120);
}

function extractConstructionYear(text) {
  const line = text.split("\n").find((candidate) => /建築年|築年|建築時期|築年月/.test(candidate));
  const year = line?.match(/(19[0-9]{2}|20[0-9]{2}|昭和\s*[0-9０-９]+|平成\s*[0-9０-９]+|令和\s*[0-9０-９]+)/)?.[1];
  if (!year) return null;
  const normalized = year.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)).replace(/\s/g, "");
  if (/^19|^20/.test(normalized)) return Number.parseInt(normalized, 10);
  if (normalized.startsWith("昭和")) return 1925 + Number.parseInt(normalized.replace("昭和", ""), 10);
  if (normalized.startsWith("平成")) return 1988 + Number.parseInt(normalized.replace("平成", ""), 10);
  if (normalized.startsWith("令和")) return 2018 + Number.parseInt(normalized.replace("令和", ""), 10);
  return null;
}
