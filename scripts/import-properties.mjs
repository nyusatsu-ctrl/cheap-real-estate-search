import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_MAX_PRICE = 30000000;
const DEFAULT_PAGES = 3;
const DEFAULT_LIMIT = 5000;
const SOURCE_FILE = "data/property-import-sources.json";
const PREFECTURE_CODES = [
  ["01", "北海道"],
  ["02", "青森県"],
  ["03", "岩手県"],
  ["04", "宮城県"],
  ["05", "秋田県"],
  ["06", "山形県"],
  ["07", "福島県"],
  ["08", "茨城県"],
  ["09", "栃木県"],
  ["10", "群馬県"],
  ["11", "埼玉県"],
  ["12", "千葉県"],
  ["13", "東京都"],
  ["14", "神奈川県"],
  ["15", "新潟県"],
  ["16", "富山県"],
  ["17", "石川県"],
  ["18", "福井県"],
  ["19", "山梨県"],
  ["20", "長野県"],
  ["21", "岐阜県"],
  ["22", "静岡県"],
  ["23", "愛知県"],
  ["24", "三重県"],
  ["25", "滋賀県"],
  ["26", "京都府"],
  ["27", "大阪府"],
  ["28", "兵庫県"],
  ["29", "奈良県"],
  ["30", "和歌山県"],
  ["31", "鳥取県"],
  ["32", "島根県"],
  ["33", "岡山県"],
  ["34", "広島県"],
  ["35", "山口県"],
  ["36", "徳島県"],
  ["37", "香川県"],
  ["38", "愛媛県"],
  ["39", "高知県"],
  ["40", "福岡県"],
  ["41", "佐賀県"],
  ["42", "長崎県"],
  ["43", "熊本県"],
  ["44", "大分県"],
  ["45", "宮崎県"],
  ["46", "鹿児島県"],
  ["47", "沖縄県"]
];

const args = parseArgs(process.argv.slice(2));
const commit = args.commit === true;
const publish = args.draft === true ? false : true;
const verbose = args.verbose === true;
const requestedPages = args.pages === undefined ? null : toPositiveInteger(args.pages, DEFAULT_PAGES);
const limit = toPositiveInteger(args.limit, DEFAULT_LIMIT);
const maxPrice = toPositiveInteger(args["max-price"], DEFAULT_MAX_PRICE);
const sourceFilter = typeof args.source === "string" ? args.source : "all";
const prefectureFilter = typeof args.prefecture === "string" ? args.prefecture : null;

loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = commit ? createSupabaseClient(supabaseUrl, serviceRoleKey) : null;

main().catch((error) => {
  console.error(`Import failed: ${error.message}`);
  process.exit(1);
});

async function main() {
  const sources = selectSources(loadSources());

  if (args["list-sources"] === true) {
    for (const source of sources) {
      console.log(`${source.id}: ${source.name} (${source.prefecture ?? "全国"}) ${source.listUrl}`);
    }
    return;
  }

  if (sources.length === 0) {
    throw new Error("対象の収集元がありません。--source または --prefecture を確認してください。");
  }

  console.log(commit ? "Mode: commit" : "Mode: dry-run");
  console.log(`Sources: ${sources.map((source) => source.id).join(", ")}`);
  console.log(`Max price: ${formatYen(maxPrice)}`);
  if (commit) console.log(`Publish mode: ${publish ? "auto-publish" : "draft"}`);

  const totals = {
    found: 0,
    candidates: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0
  };

  for (const source of sources) {
    const result = await importSource(source);
    totals.found += result.found;
    totals.candidates += result.candidates;
    totals.inserted += result.inserted;
    totals.updated += result.updated;
    totals.skipped += result.skipped;
    totals.failed += result.failed;
  }

  console.log("");
  console.log(
    `Completed. sources=${sources.length} found=${totals.found} candidates=${totals.candidates} inserted=${totals.inserted} updated=${totals.updated} skipped=${totals.skipped} failed=${totals.failed}`
  );
}

async function importSource(source) {
  console.log("");
  console.log(`Source: ${source.name}`);
  console.log(`List URL: ${source.listUrl}`);

  const result = {
    found: 0,
    candidates: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0
  };

  const collected =
    source.kind === "athomePrefectureBuy"
      ? await collectAthomeProperties(source, getSourcePages(source))
      : source.kind === "zeroEstateApi"
        ? await collectZeroEstateProperties(source, getSourcePages(source))
      : source.kind === "lifullTownIndex"
        ? await collectLifullProperties(source, getSourcePages(source))
        : await collectDetailProperties(source, getSourcePages(source));
  result.found = collected.found;
  result.skipped += collected.skipped;
  result.failed += collected.failed;
  const candidates = collected.properties.slice(0, limit);

  console.log(`Found items: ${collected.found}`);
  console.log(`Import candidates: ${candidates.length}`);
  for (const property of candidates) {
    console.log(`- ${formatYen(property.price_yen)} ${property.prefecture}${property.city} ${property.title}`);
    console.log(`  ${property.source_url}`);
  }

  result.candidates = candidates.length;

  if (!commit) return result;

  const sourceId = await ensureSource(source);
  for (const property of candidates) {
    const existing = await findExistingProperty(property.source_url);
    const status = existing?.status === "sold" ? "sold" : publish ? "published" : "draft";
    const publishedAt = status === "published" ? existing?.published_at ?? new Date().toISOString() : null;
    const payload = {
      ...property,
      source_id: sourceId,
      publication_permission: "unknown",
      status,
      published_at: publishedAt
    };

    if (existing?.id) {
      const { error } = await supabase.from("properties").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
      result.updated += 1;
    } else {
      const { error } = await supabase.from("properties").insert(payload);
      if (error) throw new Error(error.message);
      result.inserted += 1;
    }
  }

  return result;
}

async function collectDetailProperties(source, pages) {
  const detailUrls = await collectDetailUrls(source, pages);
  const result = {
    found: detailUrls.length,
    properties: [],
    skipped: 0,
    failed: 0
  };

  for (const url of detailUrls) {
    try {
      const html = await fetchHtml(url);
      const property = parseProperty(source, html, url);
      if (shouldSkipProperty(property, url, result)) continue;
      result.properties.push(property);
    } catch (error) {
      result.failed += 1;
      console.log(`FAIL parse: ${url} (${error.message})`);
    }
  }

  return result;
}

async function collectDetailUrls(source, pages) {
  const urls = new Set();
  const pageUrls = buildListPageUrls(source, pages);

  for (const pageUrl of pageUrls) {
    try {
      const html = await fetchHtml(pageUrl);
      for (const url of extractDetailUrls(source, html)) urls.add(url);
    } catch (error) {
      if (pageUrl === pageUrls[0]) throw error;
      console.log(`STOP list page not available: ${pageUrl}`);
      break;
    }
  }

  return [...urls];
}

function buildListPageUrls(source, pages) {
  const pageUrls = [source.listUrl];
  if (source.pagination?.type !== "path") return pageUrls;

  for (let page = 2; page <= pages; page += 1) {
    pageUrls.push(new URL(source.pagination.pathTemplate.replace("{page}", String(page)), source.listUrl).toString());
  }

  return pageUrls;
}

async function collectLifullProperties(source, pages) {
  const townUrls = await collectLifullTownUrls(source, pages);
  const result = {
    found: townUrls.length,
    properties: [],
    skipped: 0,
    failed: 0
  };

  console.log(`Found town URLs: ${townUrls.length}`);

  for (const townUrl of townUrls) {
    try {
      const html = await fetchHtml(townUrl);
      const properties = extractLifullTownProperties(source, html, townUrl);
      for (const property of properties) {
        if (shouldSkipProperty(property, property.source_url, result)) continue;
        result.properties.push(property);
      }
    } catch (error) {
      result.failed += 1;
      console.log(`FAIL town page: ${townUrl} (${error.message})`);
    }
  }

  result.found = result.properties.length + result.skipped;
  return result;
}

async function collectAthomeProperties(source, pages) {
  const result = {
    found: 0,
    properties: [],
    skipped: 0,
    failed: 0
  };
  const prefectures = prefectureFilter ? PREFECTURE_CODES.filter(([, name]) => name === prefectureFilter) : PREFECTURE_CODES;

  console.log(`Target prefectures: ${prefectures.length}`);

  for (const [code, prefecture] of prefectures) {
    for (let page = 1; page <= pages; page += 1) {
      const url = buildAthomePrefectureUrl(source, code, page);
      try {
        const html = await fetchHtml(url);
        const properties = extractAthomeProperties(source, html, url, prefecture);
        result.found += properties.length;

        for (const property of properties) {
          if (shouldSkipProperty(property, property.source_url, result)) continue;
          result.properties.push(property);
        }
      } catch (error) {
        result.failed += 1;
        console.log(`FAIL prefecture page: ${prefecture} ${url} (${error.message})`);
      }
    }
  }

  return result;
}

async function collectZeroEstateProperties(source, pages) {
  const result = {
    found: 0,
    properties: [],
    skipped: 0,
    failed: 0
  };

  for (let page = 1; page <= pages; page += 1) {
    try {
      const data = await fetchZeroEstatePage(source, page);
      const items = data.items ?? [];
      result.found += items.length;

      for (const item of items) {
        if (item.isSuspended || !String(item.publicStatus ?? item.status ?? "").includes("募集中")) {
          result.skipped += 1;
          continue;
        }

        const property = parseZeroEstateProperty(item);
        if (shouldSkipProperty(property, property.source_url, result)) continue;
        result.properties.push(property);
      }

      if (!data.totalPages || page >= data.totalPages || items.length === 0) break;
    } catch (error) {
      result.failed += 1;
      console.log(`FAIL zero estate page: ${page} (${error.message})`);
      if (page === 1) throw error;
      break;
    }
  }

  return result;
}

async function fetchZeroEstatePage(source, page) {
  const input = encodeURIComponent(JSON.stringify({ 0: { json: { page } } }));
  const url = `${source.apiUrl}?batch=1&input=${input}`;
  const response = await fetch(url, {
    headers: {
      "accept": "application/json",
      "accept-language": "ja,en-US;q=0.9,en;q=0.8",
      "user-agent": "Mozilla/5.0 (compatible; cheap-real-estate-search/0.1; +https://cheap-real-estate-search.vercel.app)"
    }
  });

  if (!response.ok) throw new Error(`Fetch failed ${response.status}: ${url}`);

  const payload = await response.json();
  const data = payload?.[0]?.result?.data?.json;
  if (!data || !Array.isArray(data.items)) throw new Error("Invalid zero estate response");
  return data;
}

function parseZeroEstateProperty(item) {
  const address = cleanupText(item.address ?? `${item.prefecture ?? ""}${item.city ?? ""}`) || "所在地未確認";
  const prefecture = item.prefecture ?? extractPrefecture(address) ?? "都道府県未確認";
  const city = item.city ?? extractCity({ prefecture, cityFallback: "市町村未確認" }, address);
  const title = cleanupText(item.title ?? `${prefecture}${city}の0円物件`).slice(0, 90);
  const landArea = extractArea(title, ["土地面積", "土地", "敷地面積", "宅地面積"]) ?? extractFirstArea(title);
  const buildingArea = /家|戸建|建物|住宅|マンション/.test(`${item.propertyType ?? ""}${title}`) ? extractFirstArea(title) : null;

  return {
    title,
    property_type: inferPropertyType(`${item.propertyType ?? ""}\n${title}`, landArea, buildingArea),
    price_yen: 0,
    prefecture,
    city,
    address_display: address,
    land_area_m2: landArea,
    building_area_m2: buildingArea,
    construction_year: item.builtYear ? Number.parseInt(String(item.builtYear), 10) || null : null,
    latitude: item.approximateLatitude ? Number.parseFloat(item.approximateLatitude) : null,
    longitude: item.approximateLongitude ? Number.parseFloat(item.approximateLongitude) : null,
    source_url: `https://zero.estate/properties/${item.id}`
  };
}

function buildAthomePrefectureUrl(source, code, page) {
  const url = new URL(`${code}/`, source.listUrl);
  url.searchParams.set("item_count", String(source.itemCount ?? 100));
  if (page > 1) url.searchParams.set("page", String(page));
  return url.toString();
}

function extractAthomeProperties(source, html, pageUrl, fallbackPrefecture) {
  const sections = extractAthomePropertySections(html);
  const properties = [];

  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const block = htmlToText(section);
    if (!/^売(?:戸建|土地|マンション|事業用)/.test(block)) continue;

    const price = extractPriceYen("", block);
    if (price === null) continue;

    const address = extractAthomeAddress(block, fallbackPrefecture);
    const prefecture = extractPrefecture(address) ?? fallbackPrefecture;
    const city = extractCity({ prefecture, cityFallback: "市町村未確認" }, address);
    const landArea = extractArea(block, ["土地面積", "敷地面積", "宅地面積"]);
    const buildingArea = extractArea(block, ["建物面積", "専有面積", "延床面積", "延べ床面積"]);
    const title = extractAthomeTitle(block, prefecture, city);
    const sourceUrl = extractAthomeSectionDetailUrl(section, pageUrl) ?? `${pageUrl}#property-${index + 1}`;

    properties.push({
      title,
      property_type: inferPropertyType(block, landArea, buildingArea),
      price_yen: price,
      prefecture,
      city,
      address_display: address,
      land_area_m2: landArea,
      building_area_m2: buildingArea,
      construction_year: extractConstructionYear(block),
      latitude: null,
      longitude: null,
      source_url: sourceUrl
    });
  }

  return properties;
}

function extractAthomePropertySections(html) {
  const matches = [...html.matchAll(/<section\s+class=["']propety["'][^>]*>/g)];
  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? html.indexOf("<div class=\"countOuter\">", start);
    return html.slice(start, end > start ? end : undefined);
  });
}

function extractAthomeSectionDetailUrl(section, pageUrl) {
  const href = section.match(/href=["']([^"']*\/bukken\/detail\/buy\/[0-9]+[^"']*)["']/)?.[1];
  return href ? new URL(href, pageUrl).toString() : null;
}

function extractAthomeAddress(block, fallbackPrefecture) {
  const location = block.match(/所在地\s*\n\s*([^\n]+)/)?.[1];
  const fromBlock = block.match(new RegExp(`${fallbackPrefecture}[^\\n]+`))?.[0];
  return cleanupText(location ?? fromBlock ?? `${fallbackPrefecture} 所在地未確認`).slice(0, 120);
}

function extractAthomeTitle(block, prefecture, city) {
  const lines = block.split("\n").map(cleanupText).filter(Boolean);
  const newTitle = lines.find((line) => line.startsWith("NEW "));
  if (newTitle) return newTitle.replace(/^NEW\s+/, "").slice(0, 90);

  const addressLine = lines.find((line) => line.startsWith(prefecture));
  if (addressLine) return addressLine.slice(0, 90);

  return `${prefecture}${city}の格安物件`;
}

async function collectLifullTownUrls(source, pages) {
  const urls = new Set();
  const pageUrls = buildLifullTownIndexUrls(source, pages);

  for (const pageUrl of pageUrls) {
    try {
      const html = await fetchHtml(pageUrl);
      for (const url of extractLifullTownUrls(source, html)) urls.add(url);
    } catch (error) {
      if (pageUrl === pageUrls[0]) throw error;
      console.log(`STOP town index page not available: ${pageUrl}`);
      break;
    }
  }

  return [...urls];
}

function buildLifullTownIndexUrls(source, pages) {
  const urls = [source.listUrl];
  const param = source.pagination?.param ?? "page";

  for (let page = 2; page <= pages; page += 1) {
    const url = new URL(source.listUrl);
    url.searchParams.set(param, String(page));
    urls.push(url.toString());
  }

  return urls;
}

function extractLifullTownUrls(source, html) {
  const urls = new Set();
  const hrefPattern = /href=["']([^"']*\/akiyabank\/[^"']+\/[^"']+\/?)["']/g;
  let match;

  while ((match = hrefPattern.exec(html)) !== null) {
    const url = new URL(match[1], source.websiteUrl);
    if (!/^\/akiyabank\/[^/]+\/[^/]+\/$/.test(url.pathname)) continue;
    if (url.pathname === "/akiyabank/towns/") continue;
    urls.add(url.toString());
  }

  return [...urls];
}

function extractLifullTownProperties(source, html, townUrl) {
  const text = htmlToText(html);
  const town = extractLifullTown(text);
  const blocks = text.split(/\n###\s+/).slice(1);
  const properties = [];
  let saleIndex = 0;

  for (const rawBlock of blocks) {
    const block = cleanupLifullBlock(rawBlock);
    if (!/^売買/.test(block)) continue;

    const price = extractPriceYen("", block);
    const prefecture = extractPrefecture(block) ?? town.prefecture;
    if (!prefecture || price === null) {
      saleIndex += 1;
      continue;
    }

    const address = extractLifullAddress(block, prefecture);
    const city = extractCity({ prefecture, cityFallback: town.city }, address);
    const landArea = extractArea(block, ["土地面積", "敷地面積", "宅地面積"]);
    const buildingArea = extractArea(block, ["建物面積", "延床面積", "延べ床面積"]);
    const title = cleanupText(block.split("\n")[0]).slice(0, 90);
    const detailUrl = extractLifullDetailUrl(html, townUrl, saleIndex) ?? `${townUrl}#property-${saleIndex + 1}`;

    properties.push({
      title,
      property_type: inferPropertyType(block, landArea, buildingArea),
      price_yen: price,
      prefecture,
      city,
      address_display: address,
      land_area_m2: landArea,
      building_area_m2: buildingArea,
      construction_year: extractConstructionYear(block),
      latitude: null,
      longitude: null,
      source_url: detailUrl
    });
    saleIndex += 1;
  }

  return properties;
}

function cleanupLifullBlock(block) {
  return block
    .split(/\n(?:北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|東京都|神奈川県|埼玉県|千葉県|茨城県|栃木県|群馬県|新潟県|富山県|石川県|福井県|山梨県|長野県|愛知県|岐阜県|静岡県|三重県|大阪府|兵庫県|京都府|滋賀県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)の地域から空き家情報を探す\n/)[0]
    .split("\nスポンサーリンク\n")[0]
    .trim();
}

function extractLifullTown(text) {
  const heading = text.match(/([^\n]+?)の空き家物件（[0-9０-９]+件）/)?.[1] ?? "";
  const prefecture = extractPrefecture(heading);
  const city = prefecture ? extractCity({ prefecture, cityFallback: "市町村未確認" }, heading) : "市町村未確認";
  return { prefecture, city };
}

function extractLifullAddress(block, prefecture) {
  const locationLine = block.match(/・所在地\s*\n\s*([^\n]+)/)?.[1];
  const fromTitle = block.match(new RegExp(`${prefecture}[^\\n]+`))?.[0];
  return cleanupText(locationLine ?? fromTitle ?? `${prefecture} 所在地未確認`).slice(0, 120);
}

function extractLifullDetailUrl(html, townUrl, index) {
  const detailUrls = [...html.matchAll(/href=["']([^"']+)["'][^>]*>\s*詳細をみる\s*</g)]
    .map((match) => new URL(match[1], townUrl).toString())
    .filter((url) => !/\/rent\//.test(new URL(url).pathname));
  return detailUrls[index] ?? null;
}

function extractDetailUrls(source, html) {
  const urls = new Set();
  const hrefPattern = /href=["']([^"']+)["']/g;
  const detailPattern = new RegExp(source.detailUrlPattern);
  let match;

  while ((match = hrefPattern.exec(html)) !== null) {
    const absoluteUrl = new URL(match[1], source.websiteUrl).toString();
    if (detailPattern.test(new URL(absoluteUrl).pathname)) urls.add(absoluteUrl);
  }

  return [...urls];
}

function parseProperty(source, html, sourceUrl) {
  const text = htmlToText(html);
  const title = extractTitle(source, html, text);
  const priceYen = extractPriceYen(html, text);
  const address = extractAddress(source, text);
  const prefecture = source.prefecture === "全国" ? extractPrefecture(address) ?? extractPrefecture(text) ?? "都道府県未確認" : source.prefecture;
  const city = extractCity({ ...source, prefecture }, address);
  const landArea = extractArea(text, ["土地面積", "土地", "敷地面積", "宅地面積"]);
  const buildingArea = extractArea(text, ["建物面積", "延床面積", "延べ床面積", "建物"]);

  return {
    title,
    property_type: inferPropertyType(`${title}\n${text}`, landArea, buildingArea),
    price_yen: priceYen,
    prefecture,
    city,
    address_display: address,
    land_area_m2: landArea,
    building_area_m2: buildingArea,
    construction_year: extractConstructionYear(text),
    latitude: null,
    longitude: null,
    source_url: sourceUrl
  };
}

function shouldSkipProperty(property, url, result) {
  if (prefectureFilter && property.prefecture !== prefectureFilter) {
    result.skipped += 1;
    return true;
  }

  if (property.price_yen === null) {
    result.skipped += 1;
    console.log(`SKIP price not found: ${url}`);
    return true;
  }

  if (property.price_yen > maxPrice) {
    result.skipped += 1;
    if (verbose) console.log(`SKIP over max price: ${formatYen(property.price_yen)} ${url}`);
    return true;
  }

  return false;
}

function extractTitle(source, html, text) {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  let value = cleanupText(h1 ?? title ?? ogTitle ?? text.split("\n").find(Boolean) ?? `${source.prefecture}の格安物件`);

  for (const pattern of source.titleRemovePatterns ?? []) {
    value = value.replace(new RegExp(pattern), "");
  }

  return cleanupText(value).slice(0, 90);
}

function extractPriceYen(html, text) {
  const htmlPrice = html.match(/<span[^>]*class=["'][^"']*badge[^"']*["'][^>]*>\s*価格\s*<\/span>[\s\S]{0,500}?<span[^>]*>\s*([0-9０-９,.，．]+)\s*<\/span>\s*万円/i)?.[1];
  if (htmlPrice) return parseYen(`${htmlPrice}万円`);

  const nextLinePrice = text.match(/(?:価格|売却価格|売買価格|希望価格|販売価格|代金)\s*\n\s*(無料|無償|応相談|相談|0\s*円|[0-9０-９,.，．]+\s*万円|[0-9０-９,，]+\s*円)/);
  if (nextLinePrice) return parseYen(nextLinePrice[1]);

  const priceLine = findLine(text, ["価格", "売却価格", "売買価格", "希望価格", "販売価格", "代金"]);
  const candidate = priceLine ?? text;
  const match = candidate.match(/(無料|無償|応相談|相談|0\s*円|[0-9０-９,.，．]+\s*万円|[0-9０-９,，]+\s*円)/);
  if (!match) return null;

  return parseYen(match[1]);
}

function parseYen(value) {
  const normalized = toHalfWidth(value).replace(/[,\s，]/g, "");
  if (/無料|無償|^0円$/.test(normalized)) return 0;
  if (/応相談|相談/.test(normalized)) return null;

  const amount = Number.parseFloat(normalized.replace(/[万円円]/g, ""));
  if (!Number.isFinite(amount)) return null;
  if (normalized.includes("万円")) return Math.round(amount * 10000);
  return Math.round(amount);
}

function extractAddress(source, text) {
  const labelAddress = findValueAfterLabel(text, ["所在地", "住所", "所在", "所在地番"]);
  if (source.prefecture === "全国") {
    const fromLabel = labelAddress && extractPrefecture(labelAddress) ? labelAddress : null;
    const fromText = text.match(/(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|東京都|神奈川県|埼玉県|千葉県|茨城県|栃木県|群馬県|新潟県|富山県|石川県|福井県|山梨県|長野県|愛知県|岐阜県|静岡県|三重県|大阪府|兵庫県|京都府|滋賀県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)[^\n]+/)?.[0];
    return cleanupText(fromLabel ?? fromText ?? "所在地未確認").slice(0, 120);
  }

  const tableAddress = text.match(new RegExp(`所在地\\s*${source.prefecture}\\s*([\\s\\S]{1,100}?)(?:建物構造|建物面積|土地面積|敷地面積|価格|築年月|間取り)`))?.[1];
  if (tableAddress) return cleanupText(`${source.prefecture} ${tableAddress}`).slice(0, 120);

  const locationLine = findLine(text, ["所在地", "住所", "所在", "所在地番"]);
  const fromLocation = locationLine?.match(new RegExp(`${source.prefecture}[^\\n]+`))?.[0] ?? (labelAddress?.startsWith(source.prefecture) ? labelAddress : null);
  const fromText = text.match(new RegExp(`${source.prefecture}[^\\n]+`))?.[0];
  const fallback = `${source.prefecture}${source.cityFallback ?? ""} 所在地未確認`;
  return cleanupText(fromLocation ?? fromText ?? fallback).slice(0, 120);
}

function extractCity(source, address) {
  return address.match(new RegExp(`${source.prefecture}\\s*([^\\s市区町村]+(?:市|区|町|村))`))?.[1] ?? source.cityFallback ?? "市町村未確認";
}

function extractPrefecture(text) {
  return text.match(/(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|東京都|神奈川県|埼玉県|千葉県|茨城県|栃木県|群馬県|新潟県|富山県|石川県|福井県|山梨県|長野県|愛知県|岐阜県|静岡県|三重県|大阪府|兵庫県|京都府|滋賀県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/)?.[1] ?? null;
}

function extractArea(text, labels) {
  for (const label of labels) {
    const nextLineArea = text.match(new RegExp(`${label}\\s*\\n\\s*([0-9０-９,.，．]+)\\s*(?:㎡|m2|m²|平方メートル)`, "i"))?.[1];
    if (nextLineArea) return parseNumber(nextLineArea);

    const line = findLine(text, [label]);
    const area = line?.match(/([0-9０-９,.，．]+)\s*(?:㎡|m2|m²|平方メートル)/i)?.[1];
    if (area) return parseNumber(area);
  }

  return null;
}

function extractFirstArea(text) {
  const area = text.match(/([0-9０-９,.，．]+)\s*(?:㎡|m2|m²|平方メートル)/i)?.[1];
  return area ? parseNumber(area) : null;
}

function extractConstructionYear(text) {
  const line = findLine(text, ["建築年", "築年", "建築時期", "築年月", "建築年月", "建設年"]);
  const year = line?.match(/(19[0-9]{2}|20[0-9]{2}|昭和\s*[0-9０-９]+|平成\s*[0-9０-９]+|令和\s*[0-9０-９]+)/)?.[1];
  if (!year) return null;

  const normalized = toHalfWidth(year).replace(/\s/g, "");
  if (/^19|^20/.test(normalized)) return Number.parseInt(normalized, 10);
  if (normalized.startsWith("昭和")) return 1925 + Number.parseInt(normalized.replace("昭和", ""), 10);
  if (normalized.startsWith("平成")) return 1988 + Number.parseInt(normalized.replace("平成", ""), 10);
  if (normalized.startsWith("令和")) return 2018 + Number.parseInt(normalized.replace("令和", ""), 10);
  return null;
}

function inferPropertyType(text, landArea, buildingArea) {
  if (/倉庫|作業場/.test(text)) return "warehouse";
  if (/店舗|事務所/.test(text)) return "store";
  if (/古家|古屋|古民家/.test(text)) return "old_house_land";
  if (/土地|宅地/.test(text) && !buildingArea) return "land";
  if (/戸建|住宅|家屋|建物/.test(text) || buildingArea) return "detached_house";
  if (landArea) return "land";
  return "other";
}

async function ensureSource(source) {
  const { data: existing, error: selectError } = await supabase
    .from("property_sources")
    .select("id")
    .eq("name", source.name)
    .limit(1)
    .maybeSingle();

  if (selectError) throw new Error(selectError.message);
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("property_sources")
    .insert({ name: source.name, website_url: source.websiteUrl })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

async function findExistingProperty(sourceUrl) {
  const { data, error } = await supabase
    .from("properties")
    .select("id,status,published_at")
    .eq("source_url", sourceUrl)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "ja,en-US;q=0.9,en;q=0.8",
      "user-agent": "Mozilla/5.0 (compatible; cheap-real-estate-search/0.1; +https://cheap-real-estate-search.vercel.app)"
    }
  });

  if (!response.ok) throw new Error(`Fetch failed ${response.status}: ${url}`);
  return response.text();
}

function htmlToText(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<(br|\/p|\/div|\/li|\/tr|\/th|\/td|h[1-6])[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .split("\n")
    .map(cleanupText)
    .filter(Boolean)
    .join("\n");
}

function loadSources() {
  const path = resolve(process.cwd(), SOURCE_FILE);
  return JSON.parse(readFileSync(path, "utf8"));
}

function selectSources(sources) {
  return sources
    .filter((source) => source.enabled !== false)
    .filter((source) => sourceFilter === "all" || source.id === sourceFilter)
    .filter((source) => !prefectureFilter || source.prefecture === prefectureFilter || source.prefecture === "全国");
}

function getSourcePages(source) {
  return requestedPages ?? toPositiveInteger(source.defaultPages, DEFAULT_PAGES);
}

function findLine(text, labels) {
  return text.split("\n").find((line) => labels.some((label) => line.includes(label)));
}

function findValueAfterLabel(text, labels) {
  const lines = text.split("\n").map(cleanupText).filter(Boolean);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const label = labels.find((candidate) => line === candidate || line.startsWith(candidate));
    if (!label) continue;

    const inline = cleanupText(line.replace(label, ""));
    if (inline) return inline;
    if (lines[index + 1]) return lines[index + 1];
  }

  return null;
}

function cleanupText(value) {
  return decodeEntities(String(value).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function parseNumber(value) {
  const parsed = Number.parseFloat(toHalfWidth(value).replace(/[,\s，]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function toHalfWidth(value) {
  return String(value)
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[．，]/g, (char) => (char === "．" ? "." : ","));
}

function formatYen(value) {
  return `${value.toLocaleString("ja-JP")}円`;
}

function parseArgs(argv) {
  const parsed = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value] = arg.slice(2).split("=");
    parsed[key] = value === undefined ? true : value;
  }
  return parsed;
}

function toPositiveInteger(value, fallback) {
  if (value === undefined || value === true) return fallback;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function loadEnvFile(fileName) {
  const path = resolve(process.cwd(), fileName);
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function createSupabaseClient(url, key) {
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください。");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
