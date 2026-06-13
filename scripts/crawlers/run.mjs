import { crawl as crawlKumamotoAkiya } from "./adapters/kumamoto-akiya.mjs";
import { crawl as crawlZeroEstate } from "./adapters/zero-estate.mjs";
import { crawl as crawlAkisolZero } from "./adapters/akisol-zero.mjs";
import { crawl as crawlZenkokuZero } from "./adapters/zenkoku-zero-fudosan.mjs";
import { crawl as crawlNtaKoubai } from "./adapters/nta-koubai.mjs";
import { checkRobots } from "./core/robots.mjs";
import { waitForRateLimit } from "./core/rate-limit.mjs";
import { normalizeCandidates } from "./core/normalize.mjs";
import { createRunResult, formatCrawlerError, printSourceResult } from "./core/crawl-log.mjs";
import { upsertCandidates } from "./core/upsert.mjs";

const DEFAULT_LIMIT = 20;
const ADAPTERS = {
  "kumamoto-akiya": crawlKumamotoAkiya,
  "zero-estate": crawlZeroEstate,
  "akisol-zero": crawlAkisolZero,
  "zenkoku-zero-fudosan": crawlZenkokuZero,
  "nta-koubai": crawlNtaKoubai
};

const SOURCES = [
  {
    id: "kumamoto-akiya",
    name: "熊本県空き家バンク",
    baseUrl: "https://kumamoto-akiya360.jp",
    listUrl: "https://kumamoto-akiya360.jp/sale/",
    category: "prefecture_akiya_bank",
    rank: "A",
    crawlMethod: "html",
    adapterName: "kumamoto-akiya",
    crawlPolicy: "allow_with_rate_limit",
    robotsStatus: "unknown",
    crawlFrequency: "daily",
    rateLimitMs: 1200,
    prefecture: "熊本県",
    cityFallback: "市区町村未確認",
    termsNote: "県版空き家バンク。画像・本文全文は保存せず、元URLへ送客する。"
  },
  {
    id: "zero-estate",
    name: "みんなの0円物件",
    baseUrl: "https://zero.estate",
    listUrl: "https://zero.estate/properties",
    apiUrl: "https://zeroestate-prod-api-production.up.railway.app/api/trpc/property.list",
    category: "zero_yen",
    rank: "A",
    crawlMethod: "public_json",
    adapterName: "zero-estate",
    crawlPolicy: "allow_with_rate_limit",
    robotsStatus: "unknown",
    crawlFrequency: "daily",
    rateLimitMs: 1000,
    cityFallback: "市区町村未確認",
    termsNote: "0円物件専門。本文全文と画像は保存しない。"
  },
  {
    id: "akisol-zero",
    name: "アキソル 0円物件",
    baseUrl: "https://akisol.jp",
    listUrl: "https://akisol.jp/zero-bukken/properties?status%5B0%5D=receiving",
    category: "zero_yen",
    rank: "A",
    crawlMethod: "html",
    adapterName: "akisol-zero",
    crawlPolicy: "allow_with_rate_limit",
    robotsStatus: "unknown",
    crawlFrequency: "daily",
    rateLimitMs: 1500,
    cityFallback: "市区町村未確認",
    termsNote: "0円物件一覧。掲載本文の全文転載はしない。"
  },
  {
    id: "zenkoku-zero-fudosan",
    name: "全国0円不動産",
    baseUrl: "https://zenkokuzeroen-fudosan.com",
    listUrl: "https://zenkokuzeroen-fudosan.com/pages/25/",
    category: "zero_yen",
    rank: "A",
    crawlMethod: "html",
    adapterName: "zenkoku-zero-fudosan",
    crawlPolicy: "allow_with_rate_limit",
    robotsStatus: "unknown",
    crawlFrequency: "daily",
    rateLimitMs: 1500,
    cityFallback: "市区町村未確認",
    termsNote: "0円不動産専門。詳細確認は元サイトへ送客する。"
  },
  {
    id: "nta-koubai",
    name: "国税庁 公売情報",
    baseUrl: "https://www.koubai.nta.go.jp",
    listUrl: "https://www.koubai.nta.go.jp/",
    category: "public_auction",
    rank: "A",
    crawlMethod: "html_search_app",
    adapterName: "nta-koubai",
    crawlPolicy: "allow_with_rate_limit",
    robotsStatus: "manual_review",
    crawlFrequency: "daily",
    rateLimitMs: 2000,
    cityFallback: "市区町村未確認",
    termsNote: "公的公売情報。Phase 1-Aは雛形と安全な失敗ログまで。検索条件と詳細URL構造の追加確認が必要。"
  }
];

const args = parseArgs(process.argv.slice(2));
const commit = args.commit === true;
const limit = toPositiveInteger(args.limit, DEFAULT_LIMIT);
const sourceFilter = typeof args.source === "string" ? args.source : "all";

main().catch((error) => {
  console.error(`Crawler failed: ${error.message}`);
  process.exitCode = 1;
});

async function main() {
  const sources = selectSources();
  if (sources.length === 0) throw new Error(`対象の収集元がありません: ${sourceFilter}`);

  console.log(`Mode: ${commit ? "commit-draft" : "dry-run"}`);
  console.log(`Sources: ${sources.map((source) => source.id).join(", ")}`);
  console.log(`Limit per source: ${limit}`);
  if (!commit) console.log("DB保存: なし (--commit がないため)");
  if (commit) console.log("DB保存: draft / pending として保存します。published にはしません。");

  const totals = { found: 0, candidates: 0, inserted: 0, updated: 0, skipped: 0, failed: 0 };

  for (const source of sources) {
    const result = await runSource(source);
    totals.found += result.found;
    totals.candidates += result.candidates.length;
    totals.inserted += result.inserted ?? 0;
    totals.updated += result.updated ?? 0;
    totals.skipped += result.skipped;
    totals.failed += result.failed + result.errors.length;
    printSourceResult(result);
    console.log("");
    await waitForRateLimit(source);
  }

  console.log(
    `Completed. sources=${sources.length} found=${totals.found} candidates=${totals.candidates} inserted=${totals.inserted} updated=${totals.updated} skipped=${totals.skipped} failed=${totals.failed}`
  );
}

async function runSource(source) {
  const result = createRunResult(source);
  const adapter = ADAPTERS[source.adapterName];
  if (!adapter) {
    result.failed += 1;
    result.errors.push({ errorType: "AdapterNotFound", message: `adapter not found: ${source.adapterName}` });
    return result;
  }

  try {
    result.robots = await checkRobots(source);
    if (source.crawlPolicy === "disallow" || result.robots.status === "disallowed") {
      result.skipped += 1;
      result.warnings.push("crawl_policy または robots.txt によりスキップしました。");
      return result;
    }

    const crawled = await adapter(source, { limit, args });
    result.found = crawled.found ?? 0;
    result.warnings.push(...(crawled.warnings ?? []));
    result.failed += crawled.failed ?? 0;
    const normalized = normalizeCandidates(crawled.candidates ?? [], source);
    const eligible = normalized.filter((candidate) => candidate.price_yen !== null && candidate.price_yen <= 3000000);
    result.skipped += normalized.length - eligible.length;
    result.candidates = eligible.slice(0, limit);

    const saved = await upsertCandidates({ source, candidates: result.candidates, commit });
    result.inserted = saved.inserted;
    result.updated = saved.updated;
  } catch (error) {
    result.failed += 1;
    result.errors.push(formatCrawlerError(error, { sourceKey: source.id, url: source.listUrl }));
  }

  return result;
}

function selectSources() {
  return SOURCES
    .filter((source) => source.enabled !== false)
    .filter((source) => sourceFilter === "all" || source.id === sourceFilter);
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
