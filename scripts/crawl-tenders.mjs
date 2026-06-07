import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const APP_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const OUTPUT_PATH = path.join(APP_ROOT, "data", "tender-imports.json");
const PORTAL_ORIGIN = "https://www.p-portal.go.jp";
const SEARCH_PATH = "/pps-web-biz/UAA01/OAA0101";
const POST_PATH = "/pps-web-biz/UAA01/OAA0100";

const DEFAULT_KEYWORDS = [
  "清掃",
  "警備",
  "点検",
  "保守",
  "修繕",
  "草刈",
  "除草",
  "印刷",
  "運搬",
  "廃棄物",
  "パソコン",
  "事務用品"
];

const PREFECTURE_REGIONS = {
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
  新潟県: "中部",
  富山県: "中部",
  石川県: "中部",
  福井県: "中部",
  山梨県: "中部",
  長野県: "中部",
  岐阜県: "中部",
  静岡県: "中部",
  愛知県: "中部",
  三重県: "中部",
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

const PREFECTURE_HINTS = {
  北海道: ["北海道", "札幌", "函館", "旭川", "帯広", "釧路", "小樽", "室蘭", "稚内", "網走", "興部", "浜頓別"],
  青森県: ["青森", "弘前", "八戸"],
  岩手県: ["岩手", "盛岡"],
  宮城県: ["宮城", "仙台"],
  秋田県: ["秋田"],
  山形県: ["山形"],
  福島県: ["福島", "郡山", "いわき"],
  茨城県: ["茨城", "水戸", "土浦"],
  栃木県: ["栃木", "宇都宮"],
  群馬県: ["群馬", "前橋", "高崎"],
  埼玉県: ["埼玉", "さいたま", "川越", "熊谷"],
  千葉県: ["千葉", "成田", "柏"],
  東京都: ["東京", "霞が関", "中央合同庁舎"],
  神奈川県: ["神奈川", "横浜", "川崎"],
  新潟県: ["新潟"],
  富山県: ["富山"],
  石川県: ["石川", "金沢"],
  福井県: ["福井"],
  山梨県: ["山梨", "甲府"],
  長野県: ["長野", "松本"],
  岐阜県: ["岐阜"],
  静岡県: ["静岡", "浜松"],
  愛知県: ["愛知", "名古屋"],
  三重県: ["三重", "津"],
  滋賀県: ["滋賀", "大津"],
  京都府: ["京都"],
  大阪府: ["大阪"],
  兵庫県: ["兵庫", "神戸"],
  奈良県: ["奈良"],
  和歌山県: ["和歌山"],
  鳥取県: ["鳥取"],
  島根県: ["島根", "松江"],
  岡山県: ["岡山"],
  広島県: ["広島"],
  山口県: ["山口", "下関"],
  徳島県: ["徳島"],
  香川県: ["香川", "高松", "丸亀"],
  愛媛県: ["愛媛", "松山"],
  高知県: ["高知"],
  福岡県: ["福岡", "北九州", "博多"],
  佐賀県: ["佐賀"],
  長崎県: ["長崎", "佐世保"],
  熊本県: ["熊本", "八代", "阿蘇", "人吉", "天草"],
  大分県: ["大分", "別府"],
  宮崎県: ["宮崎"],
  鹿児島県: ["鹿児島", "川内"],
  沖縄県: ["沖縄", "那覇"]
};

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&times;/g, "×")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value = "") {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " "));
}

function absoluteUrl(href) {
  if (!href) return "";
  const detailId = href.match(/procurementItemInfoId['"]?,\s*value:['"]?(\d+)/)?.[1];
  if (detailId) return `${PORTAL_ORIGIN}/pps-web-biz/UAA01/OAA0104?procurementItemInfoId=${detailId}&SyFromFlg=1`;
  if (href.startsWith("javascript:")) return `${PORTAL_ORIGIN}${SEARCH_PATH}`;
  return new URL(decodeHtml(href), PORTAL_ORIGIN).toString();
}

function extractCsrf(html) {
  return html.match(/name="_csrf"\s+value="([^"]+)"/)?.[1] ?? "";
}

function extractCookies(response) {
  const header = response.headers.get("set-cookie");
  if (!header) return "";
  return header
    .split(/,\s*(?=[^,]+=)/)
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

async function portalFetch(pathname, options = {}) {
  const response = await fetch(`${PORTAL_ORIGIN}${pathname}`, {
    ...options,
    headers: {
      "User-Agent": "loan-system-tender-crawler/0.1 (+metadata-only; contact: admin)",
      "Accept": "text/html,application/xhtml+xml",
      ...options.headers
    }
  });
  const text = await response.text();
  return { response, text };
}

async function searchPortal(keyword) {
  const initial = await portalFetch(SEARCH_PATH);
  const csrf = extractCsrf(initial.text);
  const cookie = extractCookies(initial.response);
  if (!csrf) throw new Error("Could not find CSRF token on procurement portal search page.");

  const params = new URLSearchParams();
  params.set("_csrf", csrf);
  params.set("OAA0102", "検索");
  params.set("searchConditionBean.cla", "02");
  params.set("searchConditionBean.synonymClassification", "01");
  if (keyword) params.set("searchConditionBean.articleNm", keyword);
  params.set("searchConditionBean.publicStartDateFrom", formatPortalDate(daysAgo(60)));
  params.set("searchConditionBean.procurementClaBean.procurementImplementNotice", "10");
  params.append("searchConditionBean.procurementClaBean.procurementImplementNotice", "14");
  params.append("searchConditionBean.procurementClaBean.procurementImplementNotice", "17");
  params.set("_searchConditionBean.procurementClaBean.procurementImplementNotice", "on");

  const result = await portalFetch(POST_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookie,
      "Referer": `${PORTAL_ORIGIN}${SEARCH_PATH}`
    },
    body: params.toString()
  });

  if (process.argv.includes("--debug-html")) {
    const suffix = keyword ? keyword.replace(/[^\w-]+/g, "_") : "all";
    await fs.writeFile(path.join(APP_ROOT, "data", `tender-debug-${suffix}.html`), result.text);
  }

  const pages = [result.text];
  for (const pagePath of extractPagerPaths(result.text)) {
    const page = await portalFetch(pagePath, {
      headers: {
        "Cookie": cookie,
        "Referer": `${PORTAL_ORIGIN}${POST_PATH}`
      }
    });
    pages.push(page.text);
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  return pages.flatMap((pageHtml) => parsePortalResults(pageHtml, keyword));
}

function extractPagerPaths(html) {
  const paths = new Set();
  for (const match of html.matchAll(/href="([^"]*\/pps-web-biz\/UAA01\/OAA0106\?page=\d+(?:&amp;|&)size=\d+)"/gi)) {
    paths.add(decodeHtml(match[1]));
  }
  paths.delete("/pps-web-biz/UAA01/OAA0106?page=0&size=50");
  return [...paths].sort((a, b) => Number(a.match(/page=(\d+)/)?.[1] ?? 0) - Number(b.match(/page=(\d+)/)?.[1] ?? 0));
}

function parsePortalResults(html, keyword) {
  const tableTenders = parsePortalTableResults(html, keyword);
  if (tableTenders.length > 0) return tableTenders;

  const tenders = [];
  const rowMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];

  for (const row of rowMatches) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) => match[1]);
    if (cells.length < 3) continue;

    const linkMatch = row.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);

    const textCells = cells.map(stripTags).filter(Boolean);
    const linkText = stripTags(linkMatch?.[2] ?? "");
    const title = chooseTitle(textCells, linkText, keyword);
    if (!title || title.includes("調達案件名称") || title.includes("検索")) continue;
    const sourceUrl = absoluteUrl(linkMatch?.[1] ?? "");
    const publishedAt = findJapaneseDate(textCells.join(" ")) ?? null;
    const agency = chooseAgency(textCells, title);
    const deadline = findDeadline(textCells) ?? null;

    tenders.push(normalizeTender({
      title,
      agency_name: agency,
      source_url: sourceUrl || `${PORTAL_ORIGIN}${SEARCH_PATH}`,
      pdf_url: sourceUrl.toLowerCase().includes(".pdf") ? sourceUrl : null,
      published_at: publishedAt,
      deadline_at: deadline,
      bid_at: deadline,
      detail_memo: `調達ポータルで「${keyword}」検索により取得した案件です。正式情報は必ず元ページで確認してください。`,
      is_defense: agency.includes("防衛") || title.includes("防衛")
    }));
  }

  if (tenders.length > 0) return tenders;
  return parsePortalLinksFallback(html, keyword);
}

function parsePortalTableResults(html, keyword) {
  const starts = [...html.matchAll(/<tr class="highlight">/g)].map((match) => match.index ?? 0);
  return starts.map((start, index) => {
    const end = starts[index + 1] ?? html.indexOf("<!--/メイン 検索結果 -->", start);
    return html.slice(start, end > start ? end : undefined);
  }).map((row) => {
    const title = stripTags(extractResultCell(row, "articleNm"));
    const agency = stripTags(extractResultCell(row, "procurementOrgan"));
    const prefecture = stripTags(extractResultCell(row, "receiptAddress"));
    const sourceUrl = absoluteUrl(row.match(/href="([^"]*procurementItemInfoId[^"]*)"/i)?.[1] ?? "");
    const publishedAt = findJapaneseDate(row) ?? null;
    if (!title || !agency || !sourceUrl) return null;

    return normalizeTender({
      title,
      agency_name: agency,
      prefecture: prefecture || null,
      source_url: sourceUrl,
      pdf_url: null,
      published_at: publishedAt,
      deadline_at: null,
      bid_at: null,
      detail_memo: keyword
        ? `調達ポータルで「${keyword}」検索により取得した案件です。正式情報は必ず元ページで確認してください。`
        : "調達ポータルでキーワードを指定せず取得した案件です。正式情報は必ず元ページで確認してください。",
      is_defense: agency.includes("防衛") || title.includes("防衛")
    });
  }).filter(Boolean);
}

function extractResultCell(row, field) {
  return row.match(new RegExp(`id="tri_WAA0101FM01/procurementResultListBean/${field}"[^>]*>([\\s\\S]*?)<\\/td>`, "i"))?.[1] ?? "";
}

function chooseTitle(cells, linkText, keyword) {
  const genericLinkTexts = ["公示本文", "公告本文", "詳細", "表示", "公示", "公告"];
  if (linkText && !genericLinkTexts.includes(linkText) && !linkText.includes("本文")) return linkText;
  const candidates = cells.filter((cell) => {
    if (genericLinkTexts.includes(cell)) return false;
    if (cell.includes("公開") || cell.includes("令和")) return false;
    if (/^\d{4}\/\d{1,2}\/\d{1,2}/.test(cell)) return false;
    if (/^(物品|役務|工事|一般競争|随意契約|公募)$/.test(cell)) return false;
    if (keyword) {
      return cell.includes(keyword) || /清掃|警備|点検|保守|修繕|草刈|除草|印刷|運搬|廃棄物|パソコン|事務用品|役務/.test(cell);
    }
    return cell.length >= 6;
  }).sort((a, b) => b.length - a.length);
  return candidates[0] ?? "";
}

function chooseAgency(cells, title) {
  const agency = cells.find((cell) => {
    if (cell === title || title.includes(cell) || cell.includes(title)) return false;
    if (/清掃|警備|点検|保守|修繕|草刈|除草|印刷|運搬|廃棄物|パソコン|事務用品|役務/.test(cell)) return false;
    return /省|庁|局|署|部|隊|院|府|センター|機構/.test(cell);
  });
  return agency ?? "調達ポータル掲載機関";
}

function parsePortalLinksFallback(html, keyword) {
  return [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({
      title: stripTags(match[2]),
      sourceUrl: absoluteUrl(match[1])
    }))
    .filter((item) => item.title.includes(keyword) && item.title.length >= 3)
    .slice(0, 20)
    .map((item) => normalizeTender({
      title: item.title,
      agency_name: "調達ポータル掲載機関",
      source_url: item.sourceUrl || `${PORTAL_ORIGIN}${SEARCH_PATH}`,
      pdf_url: item.sourceUrl.toLowerCase().includes(".pdf") ? item.sourceUrl : null,
      detail_memo: `調達ポータルで「${keyword}」検索により取得した案件です。正式情報は必ず元ページで確認してください。`,
      is_defense: item.title.includes("防衛")
    }));
}

function findJapaneseDate(text) {
  const match = text.match(/令和\s*(\d+)\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (!match) return null;
  const year = 2018 + Number(match[1]);
  return new Date(Date.UTC(year, Number(match[2]) - 1, Number(match[3]))).toISOString();
}

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function formatPortalDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd}`;
}

function findDeadline(cells) {
  const joined = cells.join(" ");
  const labels = ["提出期限", "公開終了日", "入札日", "見積書"];
  for (const label of labels) {
    const index = joined.indexOf(label);
    if (index >= 0) {
      const date = findJapaneseDate(joined.slice(index, index + 80));
      if (date) return date;
    }
  }
  return null;
}

function normalizeTender(input) {
  const title = input.title.replace(/^【[^】]+】/, "").replace(/^〖[^〗]+〗/, "").trim();
  const tenderType = title.includes("オープンカウンタ") || input.detail_memo.includes("オープンカウンタ") ? "open_counter" : inferTenderType(title);
  const now = new Date().toISOString();
  const prefecture = input.prefecture && PREFECTURE_REGIONS[input.prefecture]
    ? input.prefecture
    : inferPrefecture(`${title} ${input.agency_name} ${input.detail_memo}`);
  const region = PREFECTURE_REGIONS[prefecture] ?? "全国";

  return {
    id: `portal-${hash(`${input.source_url}-${title}`)}`,
    title,
    agency_name: input.agency_name,
    tender_type: tenderType,
    region,
    prefecture,
    published_at: input.published_at ?? null,
    deadline_at: input.deadline_at ?? null,
    bid_at: input.bid_at ?? null,
    qualification_required: true,
    required_qualification: tenderType === "goods" ? "全省庁統一資格 物品の販売" : "全省庁統一資格 役務の提供等",
    source_url: input.source_url,
    pdf_url: input.pdf_url ?? null,
    detail_memo: input.detail_memo,
    is_new: true,
    is_deadline_soon: isDeadlineSoon(input.deadline_at),
    is_defense: Boolean(input.is_defense),
    status: "published",
    fetched_at: now,
    created_at: now,
    updated_at: now,
    tender_sources: { name: "調達ポータル", url: PORTAL_ORIGIN }
  };
}

function inferPrefecture(text) {
  for (const [prefecture, hints] of Object.entries(PREFECTURE_HINTS)) {
    if (hints.some((hint) => text.includes(hint))) return prefecture;
  }
  return "東京都";
}

function inferTenderType(title) {
  const serviceWords = ["役務", "清掃", "警備", "点検", "保守", "修繕", "運搬", "廃棄物", "委託", "管理", "調査", "支援"];
  return serviceWords.some((word) => title.includes(word)) ? "service" : "goods";
}

function isDeadlineSoon(value) {
  if (!value) return false;
  const diff = new Date(value).getTime() - Date.now();
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
}

function hash(value) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = Math.imul(31, h) + value.charCodeAt(i) | 0;
  return Math.abs(h).toString(36);
}

function uniqueBySourceUrl(tenders) {
  const map = new Map();
  for (const tender of tenders) {
    const key = tender.source_url || tender.title;
    if (!map.has(key)) map.set(key, tender);
  }
  return [...map.values()];
}

async function saveLocal(tenders) {
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(tenders, null, 2));
}

async function saveSupabase(tenders) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { saved: 0, skipped: true };

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: source, error: sourceError } = await supabase
    .from("tender_sources")
    .upsert({
      name: "調達ポータル",
      url: PORTAL_ORIGIN,
      source_type: "procurement_portal",
      is_active: true,
      crawl_frequency: "daily",
      last_crawled_at: new Date().toISOString()
    })
    .select("id")
    .single();

  if (sourceError) throw new Error(sourceError.message);

  let saved = 0;
  for (const tender of tenders) {
    const payload = { ...tender, source_id: source.id };
    delete payload.id;
    delete payload.tender_sources;

    const { data: existing, error: findError } = await supabase
      .from("tenders")
      .select("id")
      .eq("source_url", tender.source_url)
      .maybeSingle();
    if (findError) throw new Error(findError.message);

    const result = existing
      ? await supabase.from("tenders").update(payload).eq("id", existing.id)
      : await supabase.from("tenders").insert(payload);
    if (result.error) throw new Error(result.error.message);
    saved += 1;
  }

  return { saved, skipped: false };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const allPortal = args.has("--all-portal");
  const keywords = allPortal
    ? [""]
    : process.argv.find((arg) => arg.startsWith("--keywords="))?.split("=")[1]?.split(",").filter(Boolean) ?? DEFAULT_KEYWORDS;
  const limit = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] ?? "80");

  const collected = [];
  for (const keyword of keywords) {
    const tenders = await searchPortal(keyword);
    collected.push(...tenders);
    await new Promise((resolve) => setTimeout(resolve, 700));
  }

  const tenders = uniqueBySourceUrl(collected).slice(0, limit);
  await saveLocal(tenders);
  const supabaseResult = args.has("--no-db") ? { saved: 0, skipped: true } : await saveSupabase(tenders);

  console.log(JSON.stringify({
    collected: tenders.length,
    output: OUTPUT_PATH,
    supabase: supabaseResult,
    titles: tenders.slice(0, 10).map((tender) => tender.title)
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
