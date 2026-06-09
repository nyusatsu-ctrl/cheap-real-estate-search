import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const APP_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const requireFromApp = createRequire(import.meta.url);
const SOURCES_PATH = path.join(APP_ROOT, "data", "defense-sources.json");
const CANDIDATES_PATH = path.join(APP_ROOT, "data", "defense-candidates.json");
const CRAWL_SUMMARY_PATH = path.join(APP_ROOT, "data", "defense-crawl-summary.json");
const FETCH_TIMEOUT_MS = 8000;
const PLAYWRIGHT_TIMEOUT_MS = Number(process.env.DEFENSE_CRAWLER_PLAYWRIGHT_TIMEOUT_MS ?? 30000);
const PLAYWRIGHT_WAIT_INTERVAL_MS = Number(process.env.DEFENSE_CRAWLER_PLAYWRIGHT_WAIT_INTERVAL_MS ?? 3000);
const PLAYWRIGHT_MAX_WAIT_MS = Number(process.env.DEFENSE_CRAWLER_PLAYWRIGHT_MAX_WAIT_MS ?? 45000);
const CHILD_LINK_LIMIT = 5;
const REQUEST_DELAY_MS = 100;
const CHILD_REQUEST_DELAY_MS = 50;
const CRAWL_CONCURRENCY = 6;
const PLAYWRIGHT_FALLBACK_ENABLED = process.env.DEFENSE_CRAWLER_DISABLE_PLAYWRIGHT !== "1";
const PLAYWRIGHT_HEADLESS = process.env.DEFENSE_CRAWLER_PLAYWRIGHT_HEADLESS !== "0";
const BROWSER_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";

let playwrightBrowser = null;
let playwrightContext = null;
let playwrightFallbackChain = Promise.resolve();

const OFFICIAL_HOSTS = [
  "mod.go.jp",
  "www.mod.go.jp",
  "nids.mod.go.jp",
  "www.nids.mod.go.jp",
  "ndmc.ac.jp",
  "www.ndmc.ac.jp"
];

const DISCOVERY_KEYWORDS = [
  "調達",
  "入札",
  "公告",
  "公示",
  "公募",
  "契約",
  "オープンカウンター",
  "オープンカウンタ",
  "見積",
  "売払",
  "糧食",
  "部外委託",
  "給食",
  "物品",
  "役務",
  "会計隊",
  "補給処",
  "地方総監部",
  "基地",
  "分屯基地",
  "会計",
  "契約班",
  "R8",
  "R7",
  "令和8年度",
  "令和7年度",
  "2026",
  "2025",
  "ippan",
  "open",
  "kou",
  "nyusatu",
  "koukoku",
  "keiyaku",
  "choutatsu",
  "supply",
  "public_offering",
  "bid",
  "procurement"
];

const TENDER_KEYWORDS = [
  "入札公告",
  "公告",
  "公示",
  "公募",
  "見積依頼",
  "オープンカウンター",
  "オープンカウンタ",
  "見積合わせ",
  "売払",
  "物品",
  "役務",
  "糧食",
  "部外委託",
  "給食業務",
  "食器洗浄",
  "調達",
  "契約",
  "入札情報",
  "公告件名",
  "件名"
];

const HTML_CANDIDATE_KEYWORDS = [
  "入札公告",
  "公告",
  "公示",
  "公募",
  "見積依頼",
  "オープンカウンター",
  "オープンカウンタ",
  "見積合わせ",
  "売払",
  "公告件名",
  "件名",
  "糧食",
  "部外委託",
  "給食業務",
  "食器洗浄"
];

const LISTING_OR_NOTICE_WORDS = [
  "調達・公募情報",
  "公告・公示情報",
  "トップページ",
  "ガイドライン",
  "各種様式",
  "様式",
  "お知らせ",
  "調達実績",
  "制度",
  "手続",
  "心得",
  "契約条項",
  "システム",
  "政策",
  "ポスター",
  "リーフレット",
  "はこちら"
];

const EXCLUDE_KEYWORDS = [
  "採用情報",
  "広報",
  "イベント",
  "SNS",
  "アクセス",
  "お問い合わせ",
  "ホーム",
  "組織",
  "報道資料",
  "政策",
  "研究開発",
  "部隊紹介",
  "沿革",
  "サイトマップ",
  "プライバシーポリシー"
];

const GOODS_WORDS = ["購入", "買入", "物品", "備品", "消耗品", "車両", "タイヤ", "パソコン", "印刷", "制服", "食料品", "糧食", "工具", "機器", "LED", "照明", "机", "椅子", "コピー用紙", "トナー", "什器", "燃料", "ガソリン", "灯油", "軽油"];
const SERVICE_WORDS = ["業務", "委託", "清掃", "草刈", "除草", "点検", "保守", "警備", "修繕", "運搬", "廃棄物", "施設管理", "リース", "レンタル", "維持管理", "調査", "受付", "整備", "防錆", "塗装", "航空機騒音", "騒音度調査", "草刈り", "集草", "食器洗浄", "部外委託"];
const OPEN_COUNTER_WORDS = ["オープンカウンター", "オープンカウンタ", "公開見積", "公募型見積", "定例見積", "見積依頼", "見積合わせ", "見積書提出", "少額"];
const SALE_WORDS = ["売払", "売払い", "不用品", "廃品", "古物", "不用物品"];
const CONSTRUCTION_WORDS = ["工事", "建設", "土木", "建築", "電気工事", "管工事", "舗装", "解体", "改修工事", "建築一式", "とび", "しゅんせつ"];

const DEFENSE_PARENT_SOURCES = [
  source("防衛省・自衛隊 公告・公示・公募", "defense_ministry", "全国", null, "https://www.mod.go.jp/j/budget/chotatsu/index.html", "defense_mod", "A"),
  source("防衛省 調達機関リンク集", "defense_ministry", "全国", null, "https://www.mod.go.jp/j/budget/chotatsu/ichiran.html", "defense_mod", "A"),
  source("陸上自衛隊 調達情報", "ground_self_defense_force", "全国", null, "https://www.mod.go.jp/gsdf/procurement_information/", "defense_unit", "A"),
  source("海上自衛隊 調達情報", "maritime_self_defense_force", "全国", null, "https://www.mod.go.jp/msdf/supply/", "defense_unit", "A"),
  source("海上自衛隊 調達情報詳細", "maritime_self_defense_force", "全国", null, "https://www.mod.go.jp/msdf/bukei/index.html", "defense_unit", "A"),
  source("航空自衛隊 調達情報", "air_self_defense_force", "全国", null, "https://www.mod.go.jp/asdf/choutatsu/index.html", "defense_unit", "A"),
  source("防衛装備庁 調達・公募情報", "defense_equipment_agency", "全国", null, "https://www.mod.go.jp/atla/choutatsu.html", "defense_unit", "A"),
  source("統合幕僚監部 調達情報", "defense_ministry", "全国", null, "https://www.mod.go.jp/js/supply/index.html", "defense_unit", "A"),
  source("情報本部 調達情報", "defense_ministry", "全国", null, "https://www.mod.go.jp/dih/supply/", "defense_unit", "A"),
  source("防衛研究所 調達情報", "defense_research", "関東", "東京都", "https://www.nids.mod.go.jp/procurement/index.html", "defense_unit", "A"),
  source("防衛医科大学校 調達情報", "defense_hospital", "関東", "埼玉県", "https://www.ndmc.ac.jp/info/information/", "defense_unit", "A")
];

const ASDF_BASE_SOURCES = [
  source("千歳基地", "air_self_defense_force", "北海道", "北海道", "https://www.mod.go.jp/asdf/chitose/acs/", "defense_unit", "A"),
  source("三沢基地", "air_self_defense_force", "東北", "青森県", "https://www.mod.go.jp/asdf/misawa/offer/public_offering/public_offering.html", "defense_unit", "A"),
  source("秋田分屯基地", "air_self_defense_force", "東北", "秋田県", "https://www.mod.go.jp/asdf/akita/", "defense_unit", "A"),
  source("松島基地", "air_self_defense_force", "東北", "宮城県", "https://www.mod.go.jp/asdf/matsushima/", "defense_unit", "A"),
  source("新潟分屯基地", "air_self_defense_force", "中部", "新潟県", "https://www.mod.go.jp/asdf/niigata/", "defense_unit", "A"),
  source("百里基地", "air_self_defense_force", "関東", "茨城県", "https://www.mod.go.jp/asdf/hyakuri/", "defense_unit", "A"),
  source("木更津分屯基地", "air_self_defense_force", "関東", "千葉県", "https://www.mod.go.jp/asdf/kisarazu/", "defense_unit", "A"),
  source("十条基地", "air_self_defense_force", "関東", "東京都", "https://www.mod.go.jp/asdf/jujo/", "defense_unit", "A"),
  source("市ヶ谷基地", "air_self_defense_force", "関東", "東京都", "https://www.mod.go.jp/asdf/ichigaya/", "defense_unit", "A"),
  source("目黒基地", "air_self_defense_force", "関東", "東京都", "https://www.mod.go.jp/asdf/meguro/", "defense_unit", "A"),
  source("府中基地", "air_self_defense_force", "関東", "東京都", "https://www.mod.go.jp/asdf/fuchu/", "defense_unit", "A"),
  source("横田基地", "air_self_defense_force", "関東", "東京都", "https://www.mod.go.jp/asdf/yokota/", "defense_unit", "A"),
  source("入間基地", "air_self_defense_force", "関東", "埼玉県", "https://www.mod.go.jp/asdf/iruma/bosyu/raising/index.html", "defense_unit", "A"),
  source("熊谷基地", "air_self_defense_force", "関東", "埼玉県", "https://www.mod.go.jp/asdf/kumagaya/", "defense_unit", "A"),
  source("静浜基地", "air_self_defense_force", "中部", "静岡県", "https://www.mod.go.jp/asdf/shizuhama/", "defense_unit", "A"),
  source("浜松基地", "air_self_defense_force", "中部", "静岡県", "https://www.mod.go.jp/asdf/hamamatsu/", "defense_unit", "A"),
  source("小牧基地", "air_self_defense_force", "中部", "愛知県", "https://www.mod.go.jp/asdf/komaki/", "defense_unit", "A"),
  source("岐阜基地", "air_self_defense_force", "中部", "岐阜県", "https://www.mod.go.jp/asdf/gifu/", "defense_unit", "A"),
  source("小松基地", "air_self_defense_force", "中部", "石川県", "https://www.mod.go.jp/asdf/komatsu/", "defense_unit", "A"),
  source("奈良基地", "air_self_defense_force", "近畿", "奈良県", "https://www.mod.go.jp/asdf/nara/", "defense_unit", "A"),
  source("美保基地", "air_self_defense_force", "中国", "鳥取県", "https://www.mod.go.jp/asdf/miho/", "defense_unit", "A"),
  source("防府北基地", "air_self_defense_force", "中国", "山口県", "https://www.mod.go.jp/asdf/hofukita/", "defense_unit", "A"),
  source("防府南基地", "air_self_defense_force", "中国", "山口県", "https://www.mod.go.jp/asdf/hofuminami/", "defense_unit", "A"),
  source("築城基地", "air_self_defense_force", "九州", "福岡県", "https://www.mod.go.jp/asdf/tsuiki/choutatsu.html", "defense_unit", "A"),
  source("芦屋基地", "air_self_defense_force", "九州", "福岡県", "https://www.mod.go.jp/asdf/ashiya/choutatsu/", "defense_unit", "A"),
  source("春日基地", "air_self_defense_force", "九州", "福岡県", "https://www.mod.go.jp/asdf/kasuga/", "defense_unit", "A"),
  source("新田原基地", "air_self_defense_force", "九州", "宮崎県", "https://www.mod.go.jp/asdf/nyutabaru/08cyoutatsu/", "defense_unit", "A"),
  source("那覇基地", "air_self_defense_force", "沖縄", "沖縄県", "https://www.mod.go.jp/asdf/naha/acs/", "defense_unit", "A")
];

const DEFENSE_SEED_SOURCES = [
  ...DEFENSE_PARENT_SOURCES,
  source("北部方面隊", "ground_self_defense_force", "北海道", "北海道", "https://www.mod.go.jp/gsdf/nae/fin/", "defense_unit", "A"),
  source("東北方面隊", "ground_self_defense_force", "東北", null, "https://www.mod.go.jp/gsdf/neae/koukoku/fin/", "defense_unit", "A"),
  source("東部方面隊", "ground_self_defense_force", "関東", null, "https://www.mod.go.jp/gsdf/eae/kaikei/eafin/index.html", "defense_unit", "A"),
  source("中部方面隊", "ground_self_defense_force", "中部", null, "https://www.mod.go.jp/gsdf/mae/mafin/", "defense_unit", "A"),
  source("西部方面隊", "ground_self_defense_force", "九州", null, "https://www.mod.go.jp/gsdf/wae/info/nyusatu/", "defense_unit", "A"),
  source("西部方面会計隊 物品・役務", "ground_self_defense_force", "九州", null, "https://www.mod.go.jp/gsdf/wae/info/nyusatu/wa-fin/kou/R8ippan.htm", "defense_unit", "A"),
  source("西部方面会計隊 物品・役務 Excel表", "ground_self_defense_force", "九州", null, "https://www.mod.go.jp/gsdf/wae/info/nyusatu/wa-fin/kou/R8ippan.files/sheet001.htm", "defense_unit", "A"),
  source("西部方面会計隊 オープンカウンター", "ground_self_defense_force", "九州", null, "https://www.mod.go.jp/gsdf/wae/info/nyusatu/wa-fin/open/", "defense_unit", "A"),
  source("中央会計隊", "ground_self_defense_force", "関東", "東京都", "https://www.mod.go.jp/gsdf/dc/cfin/html/", "defense_unit", "A"),
  source("中央輸送隊", "ground_self_defense_force", "関東", "神奈川県", "https://www.mod.go.jp/gsdf/yokohama/", "defense_unit", "B"),
  source("補給本部", "ground_self_defense_force", "関東", "東京都", "https://www.mod.go.jp/gsdf/gmcc/", "defense_unit", "B"),
  ...ASDF_BASE_SOURCES,
  source("北海道防衛局", "defense_bureau", "北海道", "北海道", "https://www.mod.go.jp/rdb/hokkaido/keiyaku/index.html", "defense_unit", "A"),
  source("東北防衛局", "defense_bureau", "東北", "宮城県", "https://www.mod.go.jp/rdb/tohoku/index.html", "defense_unit", "A"),
  source("北関東防衛局", "defense_bureau", "関東", "埼玉県", "https://www.mod.go.jp/rdb/n-kanto/nyusatsu-keiyaku/nyusatsu-keiyaku.html", "defense_unit", "A"),
  source("南関東防衛局", "defense_bureau", "関東", "神奈川県", "https://www.mod.go.jp/rdb/s-kanto/contract/", "defense_unit", "A"),
  source("近畿中部防衛局", "defense_bureau", "近畿", "大阪府", "https://www.mod.go.jp/rdb/kinchu/contract/", "defense_unit", "A"),
  source("東海防衛支局", "defense_bureau", "中部", "愛知県", "https://www.mod.go.jp/rdb/tokai/contract/", "defense_unit", "A"),
  source("中国四国防衛局", "defense_bureau", "中国", "広島県", "https://www.mod.go.jp/rdb/chushi/contract/", "defense_unit", "A"),
  source("九州防衛局", "defense_bureau", "九州", "福岡県", "https://www.mod.go.jp/rdb/kyushu/contract/", "defense_unit", "A"),
  source("沖縄防衛局", "defense_bureau", "沖縄", "沖縄県", "https://www.mod.go.jp/rdb/okinawa/contract/", "defense_unit", "A")
];

function source(sourceName, organizationType, region, prefecture, url, crawlerType, priority) {
  return {
    source_name: sourceName,
    organization_type: organizationType,
    region,
    prefecture,
    base_url: origin(url),
    tender_list_url: url,
    open_counter_url: /open|オープンカウンタ|公開見積/.test(url + sourceName) ? url : null,
    result_url: null,
    target_types: ["goods", "services", "open_counter", "small_discretionary", "qualification_required"],
    source_format: "mixed",
    crawler_type: crawlerType,
    crawler_difficulty: "medium",
    crawl_priority: priority,
    crawl_frequency: "daily",
    is_active: true,
    robots_note: "未確認",
    terms_note: "未確認",
    admin_note: "防衛省・自衛隊公式ページ。robots.txt と利用規約確認後に本番自動クロール対象にする。",
    crawl_ready: false
  };
}

async function fetchText(url, options = {}) {
  try {
    return await fetchTextDirect(url);
  } catch (error) {
    if (!shouldUsePlaywrightFallback(error, url, options.sourceInfo)) throw error;
    return withPlaywrightFallback(() => fetchTextWithPlaywright(url, options.sourceInfo, error));
  }
}

async function fetchTextDirect(url) {
  assertOfficialUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "loan-system-defense-crawler/0.1 (+official-sites-only; metadata-only)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    signal: controller.signal
  }).finally(() => clearTimeout(timeout));
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "";
  const html = decodeBuffer(buffer, contentType);
  if (!response.ok) {
    throw fetchError(`HTTP ${response.status}: ${response.url}`, {
      code: response.status === 403 ? "HTTP_403" : "HTTP_ERROR",
      status: response.status,
      url: response.url
    });
  }
  if (isChallengeHtml(html) || response.headers.get("cf-mitigated") === "challenge") {
    throw fetchError(`Blocked by anti-bot challenge: ${response.url}`, {
      code: "ANTI_BOT_CHALLENGE",
      status: response.status,
      url: response.url
    });
  }
  return {
    url: response.url,
    status: response.status,
    contentType,
    html,
    mojibake: false
  };
}

function fetchError(message, details = {}) {
  const error = new Error(message);
  Object.assign(error, details);
  return error;
}

function isChallengeHtml(html) {
  return /Just a moment|Cloudflare|cf-browser-verification|Attention Required|Enable JavaScript and cookies|cf_chl|しばらくお待ちください/i.test(html);
}

function shouldUsePlaywrightFallback(error, url, sourceInfo) {
  if (!PLAYWRIGHT_FALLBACK_ENABLED) return false;
  if (!["HTTP_403", "ANTI_BOT_CHALLENGE"].includes(error.code)) return false;

  const target = `${url} ${sourceInfo?.source_name ?? ""}`;
  return /西部方面|北部方面|東北方面|中央会計隊|中部方面|東部方面|\/gsdf\/wae\/|\/gsdf\/nae\/|\/gsdf\/neae\/|\/gsdf\/dc\/cfin\/|\/gsdf\/mae\/|\/gsdf\/eae\/kaikei\/eafin\//.test(target);
}

async function withPlaywrightFallback(task) {
  const run = playwrightFallbackChain.then(task, task);
  playwrightFallbackChain = run.catch(() => {});
  return run;
}

async function fetchTextWithPlaywright(url, sourceInfo, originalError) {
  assertOfficialUrl(url);
  const context = await getPlaywrightContext();
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: PLAYWRIGHT_TIMEOUT_MS });
    const html = await waitForPlaywrightContent(page);
    if (isChallengeHtml(html)) {
      throw fetchError(`Playwright blocked by anti-bot challenge: ${page.url()}`, {
        code: "PLAYWRIGHT_ANTI_BOT_CHALLENGE",
        url: page.url()
      });
    }

    const frames = await collectPlaywrightFrames(page);
    return {
      url: page.url(),
      status: 200,
      contentType: "text/html; charset=utf-8; fetched-by=playwright",
      html: combinePlaywrightHtml(html, frames),
      frameRows: frames.flatMap((frame) => frame.rows),
      playwright: true,
      fallback_from: originalError?.message ?? null,
      source_name: sourceInfo?.source_name ?? null
    };
  } finally {
    await page.close().catch(() => {});
  }
}

async function waitForPlaywrightContent(page) {
  const startedAt = Date.now();
  let html = await page.content();

  while (isChallengeHtml(html) && Date.now() - startedAt < PLAYWRIGHT_MAX_WAIT_MS) {
    await page.waitForTimeout(PLAYWRIGHT_WAIT_INTERVAL_MS);
    html = await page.content();
  }

  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  return page.content();
}

async function getPlaywrightContext() {
  if (playwrightContext) return playwrightContext;

  const { chromium } = loadPlaywright();
  const executablePath = await findChromeExecutable();
  const launchOptions = {
    headless: PLAYWRIGHT_HEADLESS,
    args: ["--disable-blink-features=AutomationControlled"]
  };
  if (executablePath) launchOptions.executablePath = executablePath;

  playwrightBrowser = await chromium.launch(launchOptions);
  playwrightContext = await playwrightBrowser.newContext({
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    userAgent: BROWSER_USER_AGENT,
    viewport: { width: 1365, height: 900 }
  });
  return playwrightContext;
}

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE_PATH,
    "playwright",
    path.join(process.env.HOME ?? "", ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright")
  ].filter(Boolean);
  const errors = [];

  for (const candidate of candidates) {
    try {
      return requireFromApp(candidate);
    } catch (error) {
      errors.push(`${candidate}: ${error.message}`);
    }
  }

  throw new Error(`Playwright is not available. Tried: ${errors.join(" | ")}`);
}

async function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try next browser executable.
    }
  }

  return null;
}

async function closePlaywrightBrowser() {
  await playwrightContext?.close().catch(() => {});
  await playwrightBrowser?.close().catch(() => {});
  playwrightContext = null;
  playwrightBrowser = null;
}

async function collectPlaywrightFrames(page) {
  const frames = [];
  for (const frame of page.frames()) {
    try {
      const html = await frame.content();
      const rows = await frame.evaluate(() => {
        const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();
        return [...document.querySelectorAll("tr")].map((row, rowIndex) => {
          const cells = [...row.querySelectorAll("th,td")].map((cell) => normalize(cell.innerText));
          const links = [...row.querySelectorAll("a[href]")].map((anchor) => ({
            text: normalize(anchor.innerText || anchor.textContent),
            url: anchor.href
          }));
          return {
            rowIndex,
            text: normalize(row.innerText),
            cells,
            links
          };
        }).filter((row) => row.text || row.links.length);
      });
      if (rows.length || /<frame|<iframe|\.pdf|入札|公告|見積|契約|調達/.test(html)) {
        frames.push({ url: frame.url(), html, rows: rows.map((row) => ({ ...row, frameUrl: frame.url() })) });
      }
    } catch {
      // Cross-origin or transient frames are not required for these official pages.
    }
  }
  return frames;
}

function combinePlaywrightHtml(html, frames) {
  const frameHtml = frames
    .filter((frame) => frame.html)
    .map((frame) => `<section data-playwright-frame-url="${escapeHtml(frame.url)}">${frame.html}</section>`)
    .join("\n");
  return `${html}\n${frameHtml}`;
}

function decodeBuffer(buffer, contentType) {
  const head = buffer.subarray(0, 4096).toString("latin1");
  const declared = contentType.match(/charset=([^;\s]+)/i)?.[1] ?? head.match(/charset=["']?([^"'\s/>]+)/i)?.[1] ?? "";
  const labels = normalizeCharset(declared) ? [normalizeCharset(declared)] : ["utf-8", "shift_jis", "euc-jp"];
  let best = "";
  let bestScore = Infinity;

  for (const label of labels) {
    try {
      const text = new TextDecoder(label, { fatal: false }).decode(buffer);
      const score = mojibakeScore(text);
      if (score < bestScore) {
        best = text;
        bestScore = score;
      }
    } catch {
      // Try next encoding.
    }
  }

  return best || new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

function normalizeCharset(value) {
  const lower = value.toLowerCase();
  if (!lower) return "";
  if (["shift_jis", "shift-jis", "sjis", "windows-31j", "cp932"].includes(lower)) return "shift_jis";
  if (["euc-jp", "euc_jp"].includes(lower)) return "euc-jp";
  if (["utf-8", "utf8"].includes(lower)) return "utf-8";
  return lower;
}

function mojibakeScore(text) {
  return (text.match(/�/g)?.length ?? 0) + (text.match(/縺|譁|荳|螟/g)?.length ?? 0) * 5;
}

function extractLinks(html, pageUrl) {
  const links = [];
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const attrs = match[1] ?? "";
    const href = attrs.match(/\bhref\s*=\s*["']?([^"'\s>]+)/i)?.[1];
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) continue;
    const alt = attrs.match(/\balt\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
    const title = attrs.match(/\btitle\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
    let url = "";
    try {
      url = new URL(decodeHtml(href), pageUrl).toString();
    } catch {
      continue;
    }
    if (!isOfficialUrl(url)) continue;
    const text = cleanText(stripTags(match[2] ?? "") || alt || title || path.basename(new URL(url).pathname));
    links.push({ text, url, attrs, file_type: fileType(url), source_text: cleanText(stripTags(match[0] ?? "")) });
  }
  return links;
}

function discoverFromPage(html, pageUrl, parentSource) {
  return extractLinks(html, pageUrl)
    .filter((link) => isDiscoveryLink(link))
    .map((link) => ({
      ...source(
        sourceNameFromLink(link, parentSource),
        organizationTypeFromUrl(link.url, link.text, parentSource.organization_type),
        regionFromText(link.url + link.text, parentSource.region),
        prefectureFromText(link.url + link.text, parentSource.prefecture),
        link.url,
        "defense_unit",
        priorityFromText(link.url + link.text)
      ),
      admin_note: `親ページ ${pageUrl} から自動発見。${parentSource.admin_note}`
    }));
}

function isDiscoveryLink(link) {
  if (link.file_type !== "html") return false;
  const target = `${link.text} ${link.url}`;
  if (isExcluded(target)) return false;
  return DISCOVERY_KEYWORDS.some((keyword) => target.includes(keyword));
}

function extractCandidates(html, pageUrl, sourceInfo) {
  const candidates = [];
  const yearContext = yearContextFrom(pageUrl + " " + extractTitle(html));

  if (isWesternAreaAccountingPage(pageUrl, sourceInfo)) {
    candidates.push(...extractWesternAreaCandidates(html, pageUrl, sourceInfo, yearContext));
  }

  for (const row of extractRows(html)) {
    const rowText = cleanText(stripTags(row));
    const links = extractLinks(row, pageUrl);
    const hasAttachment = links.some((link) => ["html", "pdf", "excel", "word"].includes(link.file_type));
    if (!isTenderText(rowText, links) && !hasAttachment) continue;

    const candidate = candidateFromText(rowText, links, sourceInfo, pageUrl, yearContext);
    if (candidate) candidates.push(candidate);
  }

  for (const link of extractLinks(html, pageUrl)) {
    const text = cleanText(link.text || link.source_text);
    if (!isTenderText(text, [link])) continue;
    const candidate = candidateFromText(text, [link], sourceInfo, pageUrl, yearContext);
    if (candidate) candidates.push(candidate);
  }

  return uniqueBy(candidates, (candidate) => `${candidate.source_url}-${candidate.title}`).filter(isInitialRangeCandidate);
}

function extractWesternAreaCandidates(html, pageUrl, sourceInfo, yearContext) {
  const candidates = [];
  for (const row of extractRows(html)) {
    const cells = extractCells(row, pageUrl);
    const links = extractLinks(row, pageUrl);
    const rowText = cleanText(stripTags(row));
    const noticeLinks = links.filter((link) => ["pdf", "excel", "word", "html"].includes(link.file_type));
    if (!noticeLinks.length || /公告中の案件はありません|該当.*ありません/.test(rowText)) continue;

    const title = pickWesternAreaTitle(cells, noticeLinks, rowText);
    if (!title || isExcluded(title)) continue;

    const location = westernAreaLocation(rowText);
    const dates = parseDates(rowText, yearContext);
    const classification = classify(`${title} ${rowText}`);
    const primaryLink = noticeLinks.find((link) => link.file_type === "pdf") ?? noticeLinks[0];
    const attachments = noticeLinks.map((link) => ({
      title: link.text || title,
      url: link.url,
      file_type: link.file_type,
      label: link.text || null,
      source_text: link.source_text || null
    }));

    candidates.push({
      source_id: null,
      source_name: sourceInfo.source_name,
      organization_type: sourceInfo.organization_type,
      title,
      agency_name: sourceInfo.source_name,
      tender_type: classification.tender_type === "unknown" ? inferWesternAreaTenderType(title, rowText) : classification.tender_type,
      original_label: classification.original_label,
      region: location.region ?? sourceInfo.region ?? "九州",
      prefecture: location.prefecture ?? sourceInfo.prefecture ?? "未設定",
      base_location: location.baseLocation ?? sourceInfo.prefecture ?? sourceInfo.region ?? null,
      published_at: dates[0] ?? null,
      deadline_at: dates[1] ?? null,
      bid_at: dates[1] ?? null,
      qualification_required: /全省庁統一資格|競争参加資格|資格審査|防衛省競争参加資格/.test(rowText),
      required_qualification: /全省庁統一資格|競争参加資格|資格審査|防衛省競争参加資格/.test(rowText) ? "防衛省または全省庁統一資格等。公式公告を確認してください。" : null,
      source_url: primaryLink.url,
      pdf_url: noticeLinks.find((link) => link.file_type === "pdf")?.url ?? null,
      attachments,
      raw_text: rowText.slice(0, 2000),
      ai_summary: `${sourceInfo.source_name}の公式ページから抽出した候補です。正式条件は元ページ・添付ファイルで確認してください。`,
      classification_confidence: classification.confidence,
      duplicate_candidate_id: null,
      review_status: "pending",
      admin_note: "西部方面会計隊専用パーサーで抽出。管理者確認後に公開。",
      fetched_at: new Date().toISOString()
    });
  }
  return uniqueBy(candidates, (candidate) => `${candidate.source_url}-${candidate.title}`);
}

function extractFrameRowCandidates(frameRows, pageUrl, sourceInfo) {
  const candidates = [];
  const yearContext = yearContextFrom(pageUrl + " " + sourceInfo.source_name);

  for (const row of frameRows ?? []) {
    const rowText = cleanText(row.text || row.cells?.join(" ") || "");
    const links = (row.links ?? []).map((link) => ({
      text: cleanText(link.text),
      url: link.url,
      attrs: "",
      file_type: fileType(link.url),
      source_text: rowText
    })).filter((link) => isOfficialUrl(link.url));
    const noticeLinks = links.filter((link) => ["pdf", "excel", "word", "html"].includes(link.file_type));
    if (!noticeLinks.length || !rowText || /公告中の案件はありません|該当.*ありません/.test(rowText)) continue;

    const title = pickFrameRowTitle(row.cells ?? [], noticeLinks, rowText);
    if (!title || isExcluded(title)) continue;

    const dates = pickFrameRowDates(row.cells ?? [], rowText, yearContext);
    const location = westernAreaLocation(rowText);
    const classification = classify(`${title} ${rowText}`);
    const primaryLink = noticeLinks.find((link) => link.file_type === "pdf") ?? noticeLinks[0];
    const attachments = noticeLinks.map((link) => ({
      title: link.text || title,
      url: link.url,
      file_type: link.file_type,
      label: link.text || null,
      source_text: link.source_text || null
    }));

    candidates.push({
      source_id: null,
      source_name: sourceInfo.source_name,
      organization_type: sourceInfo.organization_type,
      title,
      agency_name: sourceInfo.source_name,
      tender_type: classification.tender_type === "unknown" ? inferWesternAreaTenderType(title, rowText) : classification.tender_type,
      original_label: classification.original_label,
      region: location.region ?? sourceInfo.region ?? regionFromText(rowText + pageUrl, "全国"),
      prefecture: location.prefecture ?? sourceInfo.prefecture ?? prefectureFromText(rowText + pageUrl, "未設定"),
      base_location: location.baseLocation ?? sourceInfo.prefecture ?? sourceInfo.region ?? null,
      published_at: dates.published_at,
      deadline_at: dates.bid_at,
      bid_at: dates.bid_at,
      qualification_required: /全省庁統一資格|競争参加資格|資格審査|防衛省競争参加資格/.test(rowText),
      required_qualification: /全省庁統一資格|競争参加資格|資格審査|防衛省競争参加資格/.test(rowText) ? "防衛省または全省庁統一資格等。公式公告を確認してください。" : null,
      source_url: primaryLink.url,
      pdf_url: noticeLinks.find((link) => link.file_type === "pdf")?.url ?? null,
      attachments,
      raw_text: rowText.slice(0, 2000),
      ai_summary: `${sourceInfo.source_name}の公式ページから抽出した候補です。正式条件は元ページ・添付ファイルで確認してください。`,
      classification_confidence: classification.confidence,
      duplicate_candidate_id: null,
      review_status: "pending",
      admin_note: "Playwrightフォールバックで取得したfrSheet/表データから抽出。管理者確認後に公開。",
      fetched_at: new Date().toISOString()
    });
  }

  return uniqueBy(candidates, (candidate) => `${candidate.source_url}-${candidate.title}`).filter(isInitialRangeCandidate);
}

function pickFrameRowTitle(cells, links, rowText) {
  const cellObjects = cells.map((text) => ({ text: cleanText(text), links: [] }));
  const title = pickWesternAreaTitle(cellObjects, links, rowText);
  if (title) return title;

  const linkTitle = links
    .map((link) => cleanText(link.text))
    .find((text) => isWesternTitleCell(text));
  return linkTitle ? cleanWesternTitle(linkTitle).slice(0, 180) : "";
}

function pickFrameRowDates(cells, rowText, yearContext) {
  const orderedDates = [];
  for (const cell of cells) {
    for (const date of parseDates(cell, yearContext)) {
      if (!orderedDates.includes(date)) orderedDates.push(date);
    }
  }

  if (orderedDates.length >= 2) {
    return {
      bid_at: orderedDates[orderedDates.length - 2] ?? null,
      published_at: orderedDates[orderedDates.length - 1] ?? null
    };
  }

  const dates = parseDates(rowText, yearContext);
  return {
    published_at: orderedDates[0] ?? dates[0] ?? null,
    bid_at: dates.find((date) => date !== (orderedDates[0] ?? dates[0])) ?? null
  };
}

function candidateFromText(text, links, sourceInfo, pageUrl, yearContext) {
  const title = pickTitle(text, links);
  if (!title || isExcluded(title)) return null;
  const classification = classify(title + " " + text);
  const dates = parseDates(text, yearContext);
  const primaryLink = links.find((link) => link.file_type !== "unknown") ?? links[0] ?? { url: pageUrl, file_type: "html", text: title, source_text: text };
  const titleHasHtmlCandidateWord = HTML_CANDIDATE_KEYWORDS.some((keyword) => title.includes(keyword));
  if (!dates.length && LISTING_OR_NOTICE_WORDS.some((word) => title.includes(word))) return null;
  if (primaryLink.file_type === "html" && !dates.length && !titleHasHtmlCandidateWord) return null;
  const attachments = links.map((link) => ({
    title: link.text || title,
    url: link.url,
    file_type: link.file_type,
    label: link.text || null,
    source_text: link.source_text || null
  }));

  return {
    source_id: null,
    source_name: sourceInfo.source_name,
    organization_type: sourceInfo.organization_type,
    title,
    agency_name: sourceInfo.source_name,
    tender_type: classification.tender_type,
    original_label: classification.original_label,
    region: sourceInfo.region ?? regionFromText(text + pageUrl, "全国"),
    prefecture: sourceInfo.prefecture ?? prefectureFromText(text + pageUrl, "未設定"),
    base_location: sourceInfo.prefecture ?? sourceInfo.region ?? null,
    published_at: dates[0] ?? null,
    deadline_at: dates[1] ?? null,
    bid_at: dates[1] ?? null,
    qualification_required: /全省庁統一資格|競争参加資格|資格審査|防衛省競争参加資格/.test(text),
    required_qualification: /全省庁統一資格|競争参加資格|資格審査|防衛省競争参加資格/.test(text) ? "防衛省または全省庁統一資格等。公式公告を確認してください。" : null,
    source_url: primaryLink.url,
    pdf_url: links.find((link) => link.file_type === "pdf")?.url ?? null,
    attachments,
    raw_text: text.slice(0, 2000),
    ai_summary: `${sourceInfo.source_name}の公式ページから抽出した候補です。正式条件は元ページ・添付ファイルで確認してください。`,
    classification_confidence: classification.confidence,
    duplicate_candidate_id: null,
    review_status: "pending",
    admin_note: "防衛省・自衛隊汎用パーサーで抽出。管理者確認後に公開。",
    fetched_at: new Date().toISOString()
  };
}

function extractRows(html) {
  const rows = [...html.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map((match) => match[0]);
  const listItems = [...html.matchAll(/<li\b[\s\S]*?<\/li>/gi)].map((match) => match[0]);
  const paragraphs = [...html.matchAll(/<p\b[\s\S]*?<\/p>/gi)].map((match) => match[0]);
  return [...rows, ...listItems, ...paragraphs];
}

function extractCells(row, pageUrl) {
  return [...row.matchAll(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi)].map((match) => {
    const html = match[0];
    return {
      html,
      text: cleanText(stripTags(html)),
      links: extractLinks(html, pageUrl)
    };
  });
}

function isTenderText(text, links) {
  const target = `${text} ${links.map((link) => link.url).join(" ")}`;
  if (!target.trim()) return false;
  if (isExcluded(target) && !TENDER_KEYWORDS.some((keyword) => target.includes(keyword))) return false;
  if (TENDER_KEYWORDS.some((keyword) => target.includes(keyword))) return true;
  if (links.some((link) => ["pdf", "excel", "word"].includes(link.file_type)) && /R[789]|令和[789]|202[56]|入札|公告|見積|契約|調達|open|ippan|kou|bid|nyusatu/i.test(target)) return true;
  return false;
}

function isExcluded(text) {
  const procurementRelated = /契約|調達|入札|公告|公募|公示|見積/.test(text);
  if (procurementRelated) return false;
  return EXCLUDE_KEYWORDS.some((keyword) => text.includes(keyword)) || /privacy|sitemap|access|contact|recruit/i.test(text);
}

function pickTitle(text, links) {
  const linkText = links.map((link) => link.text).find((value) => value && value.length >= 3 && !/^(PDF|Excel|Word|こちら|詳細)$/.test(value));
  if (linkText) return linkText.slice(0, 180);
  const clean = text.replace(/\s+/g, " ").trim();
  const segments = clean.split(/。|\n|　{2,}|\s{2,}/).map((item) => item.trim()).filter(Boolean);
  return (segments.find((segment) => TENDER_KEYWORDS.some((keyword) => segment.includes(keyword))) ?? segments[0] ?? "").slice(0, 180);
}

function isWesternAreaAccountingPage(pageUrl, sourceInfo) {
  const target = `${pageUrl} ${sourceInfo.source_name ?? ""}`;
  return /\/gsdf\/wae\/.*wa-fin|西部方面会計隊|西部方面隊/.test(target);
}

function pickWesternAreaTitle(cells, links, rowText) {
  const meaningfulLinkText = links
    .map((link) => cleanText(link.text))
    .find((value) => value && value.length >= 3 && !/^(PDF|Excel|Word|公告|仕様書|内訳書|入札書|見積書|こちら|詳細|○|●|\d+)$/.test(value));
  if (meaningfulLinkText) return meaningfulLinkText.slice(0, 180);

  const cellTexts = cells.map((cell) => cell.text).filter(Boolean);
  const titleCell = cellTexts.find((text) => isWesternTitleCell(text));
  if (titleCell) return cleanWesternTitle(titleCell).slice(0, 180);

  const segments = rowText.split(/\s{2,}|　+|\t+|。/).map((item) => item.trim()).filter(Boolean);
  const segment = segments.find((text) => isWesternTitleCell(text));
  if (segment) return cleanWesternTitle(segment).slice(0, 180);

  return "";
}

function isWesternTitleCell(text) {
  if (!text || text.length < 3) return false;
  if (/^(No|番号|件名|公告日|入札日|履行場所|納地|備考|PDF|Excel|Word|\d+|NEW)$/i.test(text)) return false;
  if (/令和|R\s*\d|20\d{2}|\d{1,2}[.\/]\d{1,2}|時|分|まで|防衛省競争参加資格/.test(text)) return false;
  if (/駐屯地|分屯地|基地|会計隊|派遣隊|公告中の案件はありません/.test(text) && !/(ほか|業務|役務|購入|借上|修理|点検|整備|交換|印刷|清掃|委託|糧食|売払|ソフト|機器|装置|用品|紙|燃料|食器|除草|草刈|保守|調査)/.test(text)) return false;
  return /[\p{Script=Han}\p{Script=Katakana}\p{Script=Hiragana}]/u.test(text);
}

function cleanWesternTitle(text) {
  return cleanText(text)
    .replace(/^\d+[\s.、-]*/, "")
    .replace(/^(件名|品名|調達件名)\s*/g, "")
    .replace(/\s*(PDF|Excel|Word|公告|仕様書|内訳書|入札書|見積書)\s*$/i, "")
    .trim();
}

function westernAreaLocation(text) {
  const locations = [
    ["健軍", "熊本県", "九州"], ["高遊原", "熊本県", "九州"], ["北熊本", "熊本県", "九州"],
    ["目達原", "佐賀県", "九州"], ["飯塚", "福岡県", "九州"], ["小倉", "福岡県", "九州"], ["小郡", "福岡県", "九州"], ["久留米", "福岡県", "九州"],
    ["別府", "大分県", "九州"], ["湯布院", "大分県", "九州"], ["玖珠", "大分県", "九州"],
    ["相浦", "長崎県", "九州"], ["竹松", "長崎県", "九州"], ["大村", "長崎県", "九州"], ["対馬", "長崎県", "九州"],
    ["えびの", "宮崎県", "九州"], ["都城", "宮崎県", "九州"],
    ["川内", "鹿児島県", "九州"], ["国分", "鹿児島県", "九州"], ["奄美", "鹿児島県", "九州"],
    ["那覇", "沖縄県", "沖縄"]
  ];
  const found = locations.find(([name]) => text.includes(name));
  if (!found) {
    const prefecture = prefectureFromText(text, null);
    return { baseLocation: null, prefecture, region: prefecture ? regionFromText(prefecture, null) : null };
  }
  return { baseLocation: `${found[0]}駐屯地`, prefecture: found[1], region: found[2] };
}

function inferWesternAreaTenderType(title, text) {
  const target = `${title} ${text}`;
  if (OPEN_COUNTER_WORDS.some((word) => target.includes(word))) return "open_counter";
  if (SERVICE_WORDS.some((word) => target.includes(word))) return "services";
  return "goods";
}

function classify(text) {
  const originalLabel = OPEN_COUNTER_WORDS.find((word) => text.includes(word)) ?? SALE_WORDS.find((word) => text.includes(word)) ?? null;
  if (CONSTRUCTION_WORDS.some((word) => text.includes(word))) return { tender_type: "construction", confidence: 0.85, original_label: originalLabel };
  if (SALE_WORDS.some((word) => text.includes(word))) return { tender_type: "goods", confidence: 0.7, original_label: originalLabel ?? "売払" };
  if (OPEN_COUNTER_WORDS.some((word) => text.includes(word))) return { tender_type: text.includes("少額") ? "small_discretionary" : "open_counter", confidence: 0.9, original_label: originalLabel };
  if (/全省庁統一資格|競争参加資格|資格必要/.test(text)) return { tender_type: "qualification_required", confidence: 0.82, original_label: originalLabel };
  if (GOODS_WORDS.some((word) => text.includes(word))) return { tender_type: "goods", confidence: 0.75, original_label: originalLabel };
  if (SERVICE_WORDS.some((word) => text.includes(word))) return { tender_type: "services", confidence: 0.75, original_label: originalLabel };
  return { tender_type: "unknown", confidence: 0.35, original_label: originalLabel };
}

function parseDates(text, contextYear) {
  const dates = [];
  const patterns = [
    /R\s*(\d{1,2})[.\/年]\s*(\d{1,2})[.\/月]\s*(\d{1,2})日?/gi,
    /令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/gi,
    /(20\d{2})[.\/年]\s*(\d{1,2})[.\/月]\s*(\d{1,2})日?/g,
    /(?:^|[^\dR])(\d{1,2})[.\/](\d{1,2})[.\/](\d{1,2})(?:[^\d]|$)/g
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const parsed = pattern.source.includes("20\\d")
        ? toIso(Number(match[1]), Number(match[2]), Number(match[3]))
        : pattern.source.includes("(?:^|")
          ? toIso(contextYear ?? reiwaYear(Number(match[1])), Number(match[2]), Number(match[3]))
          : toIso(reiwaYear(Number(match[1])), Number(match[2]), Number(match[3]));
      if (parsed) dates.push(parsed);
    }
  }

  return uniqueBy(dates, (date) => date).sort();
}

function yearContextFrom(text) {
  const reiwa = text.match(/R\s*(\d{1,2})|令和\s*(\d{1,2})/i);
  if (reiwa) return reiwaYear(Number(reiwa[1] ?? reiwa[2]));
  const western = text.match(/202[56]/);
  return western ? Number(western[0]) : null;
}

function reiwaYear(value) {
  return 2018 + value;
}

function toIso(year, month, day) {
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(Date.UTC(year, month - 1, day)).toISOString();
}

async function discover(group) {
  const parents = filterSources(DEFENSE_SEED_SOURCES, group);
  const discovered = [...filterSources(DEFENSE_SEED_SOURCES, group)];

  try {
    for (const parent of parents) {
      try {
        const page = await fetchText(parent.tender_list_url, { sourceInfo: parent });
        discovered.push(...discoverFromPage(page.html, page.url, parent));
        await delay(400);
      } catch (error) {
        discovered.push({ ...parent, last_error_message: error.message });
      }
    }
  } finally {
    await closePlaywrightBrowser();
  }

  const sources = uniqueBy(discovered, (item) => item.tender_list_url);
  await writeJson(SOURCES_PATH, sources);
  const supabase = await saveSourcesToSupabase(sources);
  return { sources, supabase };
}

async function crawl(group) {
  let sources = await readJson(SOURCES_PATH, []);
  if (!sources.length) sources = (await discover(group)).sources;
  sources = filterSources(sources, group);
  const maxSources = Number(process.argv.find((arg) => arg.startsWith("--max-sources="))?.split("=")[1] ?? 0);
  if (maxSources > 0) sources = sources.slice(0, maxSources);
  const candidates = [];
  const errors = [];

  try {
    const results = await mapLimit(sources, CRAWL_CONCURRENCY, crawlSource);
    for (const result of results) {
      candidates.push(...result.candidates);
      errors.push(...result.errors);
    }
  } finally {
    await closePlaywrightBrowser();
  }

  const uniqueCandidates = uniqueBy(candidates, (item) => `${item.source_url}-${item.title}`);
  await writeJson(CANDIDATES_PATH, uniqueCandidates);
  const supabase = await saveCandidatesToSupabase(uniqueCandidates);
  await writeJson(CRAWL_SUMMARY_PATH, {
    command: "crawl",
    group,
    finished_at: new Date().toISOString(),
    candidate_count: uniqueCandidates.length,
    error_count: errors.length,
    errors,
    supabase
  });
  return { candidates: uniqueCandidates, errors, supabase };
}

async function crawlSource(sourceInfo) {
  const candidates = [];
  const errors = [];
  try {
    const page = await fetchText(sourceInfo.tender_list_url, { sourceInfo });
    candidates.push(...extractFrameRowCandidates(page.frameRows, page.url, sourceInfo));
    candidates.push(...extractCandidates(page.html, page.url, sourceInfo));
    for (const link of traversalLinks(page.html, page.url).slice(0, CHILD_LINK_LIMIT)) {
      try {
        const childSourceInfo = {
          ...sourceInfo,
          source_name: `${sourceInfo.source_name} / ${link.text || path.basename(new URL(link.url).pathname)}`
        };
        const childPage = await fetchText(link.url, { sourceInfo: childSourceInfo });
        candidates.push(...extractFrameRowCandidates(childPage.frameRows, childPage.url, childSourceInfo));
        candidates.push(...extractCandidates(childPage.html, childPage.url, childSourceInfo));
        await delay(CHILD_REQUEST_DELAY_MS);
      } catch {
        // Child pages are opportunistic. The parent source error is kept clear if the main page succeeded.
      }
    }
    await delay(REQUEST_DELAY_MS);
  } catch (error) {
    errors.push({ url: sourceInfo.tender_list_url, source_name: sourceInfo.source_name, error: error.message });
  }
  return { candidates, errors };
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function traversalLinks(html, pageUrl) {
  return uniqueBy(
    [...extractLinks(html, pageUrl), ...extractExcelSheetLinks(html, pageUrl)].filter((link) => {
      if (link.file_type !== "html") return false;
      if (link.url === pageUrl) return false;
      if (isExcluded(`${link.text} ${link.url}`)) return false;
      return isDiscoveryLink(link) || /R[789]|令和[789]|202[56]|\.files\/sheet\d+\.htm|sheet\d+|ippan|open|kou|nyusatu|koukoku|keiyaku|choutatsu|supply|public_offering|bid|procurement|contract/i.test(`${link.text} ${link.url}`);
    }),
    (link) => link.url
  );
}

function extractExcelSheetLinks(html, pageUrl) {
  const links = [];
  const seen = new Set();
  const patterns = [
    /\b(?:href|src)\s*=\s*["']?([^"'\s>]+\.files\/sheet\d+\.htm)/gi,
    /([A-Za-z0-9_.-]+\.files\/sheet\d+\.htm)/gi
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const rawUrl = match[1];
      if (!rawUrl || seen.has(rawUrl)) continue;
      try {
        const url = new URL(rawUrl, pageUrl).href;
        seen.add(rawUrl);
        if (isOfficialUrl(url)) {
          links.push({
            text: path.basename(new URL(url).pathname),
            url,
            attrs: "",
            file_type: "html",
            source_text: rawUrl
          });
        }
      } catch {
        // Ignore malformed workbook export references.
      }
    }
  }

  return links;
}

function isInitialRangeCandidate(candidate) {
  const today = startOfUtcDay(new Date());
  const lowerBound = new Date(today);
  lowerBound.setUTCDate(lowerBound.getUTCDate() - 180);
  const published = parseIsoDate(candidate.published_at);
  const deadline = parseIsoDate(candidate.deadline_at);
  const bid = parseIsoDate(candidate.bid_at);
  const hasCurrentDeadline = Boolean((deadline && deadline >= today) || (bid && bid >= today));
  const hasRecentPublished = Boolean(published && published >= lowerBound);
  const hasDate = Boolean(published || deadline || bid);
  if (hasCurrentDeadline || hasRecentPublished) return true;
  if (!hasDate) return true;
  return /R[78]|令和[78]|202[56]/.test(`${candidate.raw_text ?? ""} ${candidate.source_url}`);
}

function parseIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return startOfUtcDay(date);
}

function startOfUtcDay(value) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function filterSources(sources, group) {
  if (!group || group === "all" || group === "defense") return sources;
  const map = {
    gsdf: ["ground_self_defense_force"],
    msdf: ["maritime_self_defense_force"],
    asdf: ["air_self_defense_force"],
    "defense-bureaus": ["defense_bureau"]
  };
  const allowed = map[group] ?? [];
  return sources.filter((sourceInfo) => allowed.includes(sourceInfo.organization_type));
}

async function saveSourcesToSupabase(sources) {
  if (process.argv.includes("--no-db")) return { skipped: true, reason: "--no-db was specified." };
  const supabase = await supabaseClient();
  if (!supabase) return { skipped: true, reason: "Supabase env vars are missing." };
  let saved = 0;
  const errors = [];
  for (const item of sources) {
    const payload = {
      name: item.source_name,
      url: item.tender_list_url,
      source_type: item.crawler_type,
      ...item
    };
    const { data: existing, error: findError } = await supabase.from("tender_sources").select("id").eq("url", item.tender_list_url).maybeSingle();
    if (findError) {
      errors.push(findError.message);
      break;
    }
    const result = existing
      ? await supabase.from("tender_sources").update(payload).eq("id", existing.id)
      : await supabase.from("tender_sources").insert(payload);
    if (result.error) errors.push(result.error.message);
    else saved += 1;
  }
  return { skipped: false, saved, errors };
}

async function saveCandidatesToSupabase(candidates) {
  if (process.argv.includes("--no-db")) return { skipped: true, reason: "--no-db was specified." };
  const supabase = await supabaseClient();
  if (!supabase) return { skipped: true, reason: "Supabase env vars are missing." };
  let saved = 0;
  let duplicates = 0;
  const errors = [];
  for (const item of candidates) {
    const { data: sourceRow } = await supabase.from("tender_sources").select("id").eq("url", item.source_url).maybeSingle();
    const { data: existingTender } = await supabase.from("tenders").select("id").eq("source_url", item.source_url).maybeSingle();
    const { data: existingCandidate } = await supabase.from("tender_candidates").select("id").eq("source_url", item.source_url).maybeSingle();
    if (existingTender || existingCandidate) {
      duplicates += 1;
      continue;
    }
    const result = await supabase.from("tender_candidates").insert({ ...item, source_id: sourceRow?.id ?? null });
    if (result.error) errors.push(result.error.message);
    else saved += 1;
  }
  return { skipped: false, saved, duplicates, errors };
}

async function supabaseClient() {
  await loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function loadEnv() {
  for (const fileName of [".env.local", ".env"]) {
    try {
      const content = await fs.readFile(path.join(APP_ROOT, fileName), "utf8");
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!match || process.env[match[1]]) continue;
        process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
      }
    } catch {
      // Environment files are optional for local no-DB crawls.
    }
  }
}

function fileType(url) {
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".xls") || lower.endsWith(".xlsx") || lower.endsWith(".xlsm")) return "excel";
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "word";
  if (lower.endsWith(".html") || lower.endsWith(".htm") || lower.endsWith("/")) return "html";
  return "unknown";
}

function sourceNameFromLink(link, parentSource) {
  const text = link.text || path.basename(new URL(link.url).pathname) || parentSource.source_name;
  return cleanText(text).slice(0, 80);
}

function organizationTypeFromUrl(url, text, fallback) {
  const target = `${url} ${text}`;
  if (/atla/.test(target)) return "defense_equipment_agency";
  if (/gsdf/.test(target)) return "ground_self_defense_force";
  if (/msdf/.test(target)) return "maritime_self_defense_force";
  if (/asdf/.test(target)) return "air_self_defense_force";
  if (/\/rdb\//.test(target)) return "defense_bureau";
  if (/nids/.test(target)) return "defense_research";
  if (/ndmc/.test(target)) return "defense_hospital";
  return fallback ?? "other_defense";
}

function priorityFromText(text) {
  return /会計隊|補給処|基地|地方防衛局|オープンカウンタ|入札|公告/.test(text) ? "A" : "B";
}

function prefectureFromText(text, fallback = null) {
  const entries = [
    ["北海道", "北海道"], ["青森", "青森県"], ["岩手", "岩手県"], ["宮城", "宮城県"], ["秋田", "秋田県"], ["山形", "山形県"], ["福島", "福島県"],
    ["茨城", "茨城県"], ["栃木", "栃木県"], ["群馬", "群馬県"], ["埼玉", "埼玉県"], ["千葉", "千葉県"], ["東京", "東京都"], ["神奈川", "神奈川県"],
    ["新潟", "新潟県"], ["富山", "富山県"], ["石川", "石川県"], ["福井", "福井県"], ["山梨", "山梨県"], ["長野", "長野県"], ["岐阜", "岐阜県"], ["静岡", "静岡県"], ["愛知", "愛知県"],
    ["三重", "三重県"], ["滋賀", "滋賀県"], ["京都", "京都府"], ["大阪", "大阪府"], ["兵庫", "兵庫県"], ["奈良", "奈良県"], ["和歌山", "和歌山県"],
    ["鳥取", "鳥取県"], ["島根", "島根県"], ["岡山", "岡山県"], ["広島", "広島県"], ["山口", "山口県"],
    ["徳島", "徳島県"], ["香川", "香川県"], ["愛媛", "愛媛県"], ["高知", "高知県"],
    ["福岡", "福岡県"], ["佐賀", "佐賀県"], ["長崎", "長崎県"], ["熊本", "熊本県"], ["大分", "大分県"], ["宮崎", "宮崎県"], ["鹿児島", "鹿児島県"], ["沖縄", "沖縄県"]
  ];
  return entries.find(([hint]) => text.includes(hint))?.[1] ?? fallback;
}

function regionFromText(text, fallback = "全国") {
  const prefecture = prefectureFromText(text);
  const map = {
    北海道: "北海道",
    青森県: "東北", 岩手県: "東北", 宮城県: "東北", 秋田県: "東北", 山形県: "東北", 福島県: "東北",
    茨城県: "関東", 栃木県: "関東", 群馬県: "関東", 埼玉県: "関東", 千葉県: "関東", 東京都: "関東", 神奈川県: "関東",
    新潟県: "中部", 富山県: "中部", 石川県: "中部", 福井県: "中部", 山梨県: "中部", 長野県: "中部", 岐阜県: "中部", 静岡県: "中部", 愛知県: "中部", 三重県: "中部",
    滋賀県: "近畿", 京都府: "近畿", 大阪府: "近畿", 兵庫県: "近畿", 奈良県: "近畿", 和歌山県: "近畿",
    鳥取県: "中国", 島根県: "中国", 岡山県: "中国", 広島県: "中国", 山口県: "中国",
    徳島県: "四国", 香川県: "四国", 愛媛県: "四国", 高知県: "四国",
    福岡県: "九州", 佐賀県: "九州", 長崎県: "九州", 熊本県: "九州", 大分県: "九州", 宮崎県: "九州", 鹿児島県: "九州",
    沖縄県: "沖縄"
  };
  return prefecture ? map[prefecture] : fallback;
}

function extractTitle(html) {
  return cleanText(stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""));
}

function stripTags(value = "") {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " "));
}

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&times;/g, "×");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanText(value = "") {
  return decodeHtml(value).replace(/\s+/g, " ").trim();
}

function assertOfficialUrl(url) {
  if (!isOfficialUrl(url)) throw new Error(`Non-official URL is blocked: ${url}`);
}

function isOfficialUrl(url) {
  try {
    const host = new URL(url).hostname;
    return OFFICIAL_HOSTS.some((official) => host === official || host.endsWith(`.${official}`));
  } catch {
    return false;
  }
}

function origin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

function uniqueBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    const existing = map.get(key);
    if (!existing) map.set(key, item);
    else if (!existing.last_error_message && item.last_error_message) map.set(key, { ...existing, ...item });
  }
  return [...map.values()];
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const command = process.argv[2] ?? "discover";
  const group = process.argv.find((arg) => arg.startsWith("--group="))?.split("=")[1] ?? "all";

  if (command === "discover") {
    const result = await discover(group);
    console.log(JSON.stringify({
      command,
      group,
      source_count: result.sources.length,
      output: SOURCES_PATH,
      supabase: result.supabase,
      sample: result.sources.slice(0, 10).map((item) => ({ name: item.source_name, url: item.tender_list_url }))
    }, null, 2));
    return;
  }

  if (command === "crawl") {
    const result = await crawl(group);
    console.log(JSON.stringify({
      command,
      group,
      candidate_count: result.candidates.length,
      error_count: result.errors.length,
      output: CANDIDATES_PATH,
      supabase: result.supabase,
      errors: result.errors.slice(0, 10),
      sample: result.candidates.slice(0, 10).map((item) => ({ title: item.title, url: item.source_url }))
    }, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
