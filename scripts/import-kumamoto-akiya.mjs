import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SOURCE = {
  name: "熊本県空き家バンク",
  websiteUrl: "https://kumamoto-akiya360.jp",
  listUrl: "https://kumamoto-akiya360.jp/sale/"
};

const args = parseArgs(process.argv.slice(2));
const commit = args.commit === true;
const publish = args.draft === true ? false : true;
const maxPages = toPositiveInteger(args.pages, 3);
const limit = toPositiveInteger(args.limit, 50);
const listUrl = typeof args["list-url"] === "string" ? args["list-url"] : SOURCE.listUrl;
const maxPrice = toPositiveInteger(args["max-price"], 3000000);

loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = commit ? createSupabaseClient(supabaseUrl, serviceRoleKey) : null;

main().catch((error) => {
  console.error(`Import failed: ${error.message}`);
  process.exit(1);
});

async function main() {
  console.log(commit ? "Mode: commit" : "Mode: dry-run");
  console.log(`Source: ${SOURCE.name}`);
  console.log(`List URL: ${listUrl}`);
  if (commit) {
    console.log(`Publish mode: ${publish ? "auto-publish" : "draft"}`);
  }

  const detailUrls = await collectDetailUrls(listUrl, maxPages);
  console.log(`Found detail URLs: ${detailUrls.length}`);

  const candidates = [];
  for (const url of detailUrls.slice(0, limit)) {
    const html = await fetchHtml(url);
    const property = parseProperty(html, url);

    if (property.price_yen === null) {
      console.log(`SKIP price not found: ${url}`);
      continue;
    }

    if (property.price_yen > maxPrice) {
      console.log(`SKIP over max price: ${formatYen(property.price_yen)} ${url}`);
      continue;
    }

    candidates.push(property);
  }

  console.log(`Import candidates: ${candidates.length}`);
  for (const property of candidates) {
    console.log(`- ${formatYen(property.price_yen)} ${property.prefecture}${property.city} ${property.title}`);
    console.log(`  ${property.source_url}`);
  }

  if (!commit) {
    console.log("");
    console.log("Dry run only. Supabaseへ登録して自動公開する場合は npm run import:kumamoto -- --commit を実行してください。");
    console.log("確認用に非公開で登録する場合は npm run import:kumamoto -- --commit --draft を実行してください。");
    return;
  }

  const sourceId = await ensureSource();
  let inserted = 0;
  let updated = 0;

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
      updated += 1;
    } else {
      const { error } = await supabase.from("properties").insert(payload);
      if (error) throw new Error(error.message);
      inserted += 1;
    }
  }

  console.log(`Completed. inserted=${inserted} updated=${updated} publishMode=${publish ? "auto-publish" : "draft"}`);
}

async function collectDetailUrls(baseListUrl, pages) {
  const urls = new Set();

  for (let page = 1; page <= pages; page += 1) {
    const pageUrl = page === 1 ? baseListUrl : new URL(`page/${page}/`, baseListUrl).toString();

    try {
      const html = await fetchHtml(pageUrl);
      for (const url of extractDetailUrls(html)) urls.add(url);
    } catch (error) {
      if (page === 1) throw error;
      console.log(`STOP list page not available: ${pageUrl}`);
      break;
    }
  }

  return [...urls];
}

function extractDetailUrls(html) {
  const urls = new Set();
  const hrefPattern = /href=["']([^"']*\/property\/p[0-9]+\/?[^"']*)["']/g;
  let match;

  while ((match = hrefPattern.exec(html)) !== null) {
    urls.add(new URL(match[1], SOURCE.websiteUrl).toString());
  }

  return [...urls];
}

function parseProperty(html, sourceUrl) {
  const text = htmlToText(html);
  const title = extractTitle(html, text);
  const priceYen = extractPriceYen(html, text);
  const address = extractAddress(text);
  const city = extractCity(address) ?? "市町村未確認";
  const landArea = extractArea(text, ["土地面積", "土地"]);
  const buildingArea = extractArea(text, ["建物面積", "延床面積", "建物"]);

  return {
    title,
    property_type: inferPropertyType(`${title}\n${text}`, landArea, buildingArea),
    price_yen: priceYen,
    prefecture: "熊本県",
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

function extractTitle(html, text) {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const rawTitle = ogTitle ?? h1 ?? title ?? text.split("\n").find(Boolean) ?? "熊本県の格安物件";

  return cleanupText(rawTitle)
    .replace(/^熊本県空き家バンクプラットフォーム\s*[|｜]\s*物件詳細\s*[|｜]\s*/, "")
    .replace(/\s*[\-|｜]\s*熊本県空き家バンク.*$/, "")
    .slice(0, 90);
}

function extractPriceYen(html, text) {
  const htmlPrice = html.match(/<span[^>]*class=["'][^"']*badge[^"']*["'][^>]*>\s*価格\s*<\/span>[\s\S]{0,500}?<span[^>]*>\s*([0-9０-９,.，．]+)\s*<\/span>\s*万円/i)?.[1];
  if (htmlPrice) return parseYen(`${htmlPrice}万円`);

  const priceLine = findLine(text, ["価格", "売却価格", "売買価格", "希望価格"]);
  const candidate = priceLine ?? text;
  const match = candidate.match(/(無料|無償|0\s*円|[0-9０-９,.，．]+\s*万円|[0-9０-９,，]+\s*円)/);
  if (!match) return null;

  return parseYen(match[1]);
}

function parseYen(value) {
  const normalized = toHalfWidth(value).replace(/[,\s，]/g, "");
  if (/無料|無償|^0円$/.test(normalized)) return 0;

  const amount = Number.parseFloat(normalized.replace(/[万円円]/g, ""));
  if (!Number.isFinite(amount)) return null;
  if (normalized.includes("万円")) return Math.round(amount * 10000);
  return Math.round(amount);
}

function extractAddress(text) {
  const tableAddress = text.match(/所在地\s*熊本県\s*([\s\S]{1,80}?)(?:建物構造|建物面積|土地面積|価格|築年月|間取り)/)?.[1];
  if (tableAddress) return cleanupText(`熊本県 ${tableAddress}`).slice(0, 120);

  const locationLine = findLine(text, ["所在地", "住所", "所在"]);
  const fromLocation = locationLine?.match(/熊本県[^\n]+/)?.[0];
  const fromText = text.match(/熊本県[^\n]+/)?.[0];
  return cleanupText(fromLocation ?? fromText ?? "熊本県 所在地未確認").slice(0, 120);
}

function extractCity(address) {
  return address.match(/熊本県\s*([^\s]+[市町村区])/)?.[1] ?? null;
}

function extractArea(text, labels) {
  for (const label of labels) {
    const line = findLine(text, [label]);
    const area = line?.match(/([0-9０-９,.，．]+)\s*(?:㎡|m2|m²|平方メートル)/i)?.[1];
    if (area) return parseNumber(area);
  }

  return null;
}

function extractConstructionYear(text) {
  const line = findLine(text, ["建築年", "築年", "建築時期", "築年月"]);
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

async function ensureSource() {
  const { data: existing, error: selectError } = await supabase
    .from("property_sources")
    .select("id")
    .eq("name", SOURCE.name)
    .limit(1)
    .maybeSingle();

  if (selectError) throw new Error(selectError.message);
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("property_sources")
    .insert({ name: SOURCE.name, website_url: SOURCE.websiteUrl })
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
      "user-agent": "cheap-real-estate-search/0.1 (+https://cheap-real-estate-search.vercel.app)"
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

function findLine(text, labels) {
  return text.split("\n").find((line) => labels.some((label) => line.includes(label)));
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
