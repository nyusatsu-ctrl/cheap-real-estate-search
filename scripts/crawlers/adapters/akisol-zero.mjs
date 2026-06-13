import { cleanupText, fetchText, htmlToText } from "../core/fetch.mjs";
import { extractAddress, extractCity, extractPrefecture } from "../parsers/address.mjs";
import { extractAreaM2 } from "../parsers/area.mjs";
import { extractDate } from "../parsers/date.mjs";
import { extractPriceYen } from "../parsers/price.mjs";

export async function crawl(source, options = {}) {
  const limit = options.limit ?? 20;
  const html = await fetchText(source.listUrl);
  const detailUrls = extractDetailUrls(source, html).slice(0, limit);
  const candidates = [];
  const warnings = [];

  for (const url of detailUrls) {
    try {
      const detailHtml = await fetchText(url);
      candidates.push(parseDetail(source, detailHtml, url));
    } catch (error) {
      warnings.push(`詳細ページ取得失敗: ${url} (${error.message})`);
    }
  }

  return { found: detailUrls.length, candidates, warnings };
}

function extractDetailUrls(source, html) {
  const urls = new Set();
  for (const match of html.matchAll(/href=["']([^"']*\/zero-bukken\/properties\/[A-Za-z0-9_-]+[^"']*)["']/g)) {
    urls.add(new URL(match[1], source.baseUrl).toString());
  }
  return [...urls];
}

function parseDetail(source, html, sourceUrl) {
  const text = htmlToText(html);
  const price = extractPriceYen(html, text);
  const address = extractAddress(text, null, "市区町村未確認");
  const prefecture = extractPrefecture(address) ?? extractPrefecture(text);

  return {
    source_listing_url: source.listUrl,
    source_url: sourceUrl,
    title: extractTitle(html, text),
    price_yen: price.priceYen ?? (/0円|０円|無償/.test(text) ? 0 : null),
    raw_price_text: price.rawPriceText ?? (/0円|０円|無償/.test(text) ? "0円" : null),
    prefecture,
    city: extractCity(address, prefecture),
    address_display: address,
    land_area_m2: extractAreaM2(text, ["土地面積", "敷地面積", "宅地面積", "土地"]),
    building_area_m2: extractAreaM2(text, ["建物面積", "延床面積", "延べ床面積", "建物"], { fallbackToFirst: false }),
    source_published_at: extractDate(text, ["掲載日", "登録日", "公開日"]),
    source_updated_at: extractDate(text, ["更新日", "最終更新日"]),
    transaction_type: "無償譲渡",
    remarks: "アキソル0円物件の公開ページから取得候補を検出。"
  };
}

function extractTitle(html, text) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return cleanupText(h1 ?? ogTitle ?? title ?? text.split("\n").find(Boolean) ?? "アキソル0円物件")
    .replace(/\s*\|\s*アキソル.*$/, "")
    .slice(0, 120);
}
