#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const url = process.env.TENDER_SUPABASE_URL;
const serviceRoleKey = process.env.TENDER_SUPABASE_SERVICE_ROLE_KEY;
const shouldCommit = process.argv.includes("--commit");
const PAGE_SIZE = 1000;

if (!url || !serviceRoleKey) {
  console.error("TENDER_SUPABASE_URL and TENDER_SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

async function readAll(table, columns, configure) {
  const rows = [];
  for (let page = 0; page < 20; page += 1) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase.from(table).select(columns).range(from, to);
    query = configure(query);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function updateByIds(table, ids, values) {
  let updated = 0;
  for (const chunk of chunks(ids, 200)) {
    if (!chunk.length) continue;
    const { error } = await supabase.from(table).update(values).in("id", chunk);
    if (error) throw new Error(`${table}: ${error.message}`);
    updated += chunk.length;
  }
  return updated;
}

function isQualityTenderRecord(record) {
  const title = normalizeTitle(record?.title);
  const compact = compactTitle(title);
  if (!compact) return false;
  if (isMonthOnlyTitle(compact)) return false;
  if (isDateOnlyTitle(compact)) return false;
  if (/^[\d０-９A-Za-zＡ-Ｚａ-ｚ\-_.\/第号]+$/.test(compact)) return false;
  if (isGuidanceTitle(title, compact)) return false;
  if (isClassificationOnlyTitle(compact)) return false;
  if (compact.length <= 3) return false;
  if (compact.length <= 5 && !hasStrongTitleWord(title)) return false;
  if (looksLikeNavigationTitle(title)) return false;
  if (record?.tender_type === "unknown" && !hasStrongTitleWord(`${title} ${record?.raw_text ?? ""} ${record?.detail_memo ?? ""}`)) return false;
  return true;
}

const CLASSIFICATION_ONLY_TITLES = new Set([
  "公告",
  "入札公告",
  "一般競争入札",
  "一般競争入札公告",
  "公告情報",
  "公告一覧",
  "公示",
  "公募",
  "公募公告",
  "調達",
  "調達情報",
  "調達情報一覧",
  "入札",
  "入札情報",
  "入札情報一覧",
  "契約",
  "契約情報",
  "契約情報一覧",
  "見積",
  "見積依頼",
  "見積合わせ",
  "オープンカウンター",
  "オープンカウンタ",
  "公開見積",
  "定例見積",
  "物品",
  "役務",
  "工事",
  "その他",
  "新着情報",
  "お知らせ",
  "一覧",
  "詳細",
  "PDF",
  "EXCEL",
  "WORD"
]);

const STRONG_TITLE_WORDS = [
  "購入",
  "買入",
  "調達",
  "業務",
  "委託",
  "借上",
  "借上げ",
  "修理",
  "点検",
  "整備",
  "交換",
  "印刷",
  "清掃",
  "警備",
  "糧食",
  "給食",
  "売払",
  "機器",
  "装置",
  "用品",
  "コピー用紙",
  "燃料",
  "軽油",
  "灯油",
  "食器",
  "除草",
  "草刈",
  "草刈り",
  "保守",
  "調査",
  "運搬",
  "処分",
  "洗濯",
  "賃貸借",
  "リース",
  "自動車",
  "車両",
  "電気",
  "空調",
  "給排水",
  "工具",
  "消耗品",
  "修繕",
  "検査",
  "製造"
];

const GUIDANCE_TITLE_PATTERNS = [
  /オープンカウンター方式/,
  /^入札[・･]落札情報はこちら$/,
  /入札情報のページに掲載/,
  /標準契約条項|標準契約書|契約書式|契約様式/,
  /請書条項/,
  /契約条項|契約条項等/,
  /情報の公開|情報の公表|公共調達の適正化/,
  /実施要領|低入札価格調査|特別重点調査|調達時期の目安|標準規格表/,
  /^(?:公表|掲載|案内|一覧)$/,
  /(?:はこちら|こちらをクリック|詳細はこちら|ページに掲載)$/
];

function normalizeTitle(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function compactTitle(value) {
  return value
    .replace(/[\s　]/g, "")
    .replace(/[()（）［］\[\]【】「」『』]/g, "")
    .replace(/[：:;；,，、。]/g, "")
    .trim();
}

function isMonthOnlyTitle(value) {
  return /^(?:令和\d{1,2}年|R\d{1,2}[.\/年]?|20\d{2}年?)?\d{1,2}月(?:分|度)?$/i.test(value);
}

function isDateOnlyTitle(value) {
  return /^(?:令和\d{1,2}年|R\d{1,2}[.\/年]?|20\d{2}年?)?\d{1,2}月\d{1,2}日?$/.test(value)
    || /^(?:20\d{2}|R\d{1,2})[.\/-]\d{1,2}[.\/-]\d{1,2}$/i.test(value)
    || /^\d{1,2}[.\/-]\d{1,2}(?:[.\/-]\d{1,2})?$/.test(value);
}

function isClassificationOnlyTitle(value) {
  const upper = value.toUpperCase();
  if (CLASSIFICATION_ONLY_TITLES.has(value) || CLASSIFICATION_ONLY_TITLES.has(upper)) return true;
  return /^(?:令和\d{1,2}年度|R\d{1,2}年度|20\d{2}年度)?(?:入札公告|公告|公示|公募|調達情報|契約情報|入札情報|見積依頼|オープンカウンター|オープンカウンタ|物品|役務|工事)(?:一覧)?$/i.test(value);
}

function isGuidanceTitle(title, compact) {
  return GUIDANCE_TITLE_PATTERNS.some((pattern) => pattern.test(title) || pattern.test(compact));
}

function hasStrongTitleWord(value) {
  return STRONG_TITLE_WORDS.some((word) => value.includes(word));
}

function looksLikeNavigationTitle(value) {
  if (/^(?:トップ|ホーム|一覧|詳細|戻る|次へ|前へ|こちら|クリック|ダウンロード|PDF|Excel|Word)$/i.test(value)) return true;
  return /(?:トップページ|サイトマップ|お問い合わせ|アクセス|入札結果|契約実績|調達実績|様式|各種様式|ガイドライン|入札説明書等)$/.test(value);
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function projectRef(value) {
  try {
    return new URL(value).hostname.split(".")[0] || "unknown";
  } catch {
    return "unknown";
  }
}

async function main() {
  const publishedTenders = await readAll("tenders", "id,title,agency_name,tender_type,source_url,raw_text,detail_memo,status,updated_at", (query) => (
    query.eq("status", "published").order("updated_at", { ascending: false })
  ));
  const candidates = await readAll("tender_candidates", "id,title,agency_name,tender_type,source_url,raw_text,review_status,admin_note,updated_at", (query) => (
    query.in("review_status", ["pending", "approved"]).order("updated_at", { ascending: false })
  ));

  const guidanceTenders = publishedTenders.filter((tender) => !isQualityTenderRecord(tender));
  const guidanceTenderSourceUrls = new Set(guidanceTenders.map((tender) => tender.source_url).filter(Boolean));
  const guidanceCandidates = candidates.filter((candidate) => (
    !isQualityTenderRecord(candidate) || guidanceTenderSourceUrls.has(candidate.source_url)
  ));

  console.log(JSON.stringify({
    event: "guidance_tender_cleanup_plan",
    dry_run: !shouldCommit,
    project_ref: projectRef(url),
    published_tenders_scanned: publishedTenders.length,
    candidate_rows_scanned: candidates.length,
    guidance_tenders_to_archive: guidanceTenders.length,
    candidates_to_reject: guidanceCandidates.length,
    sample_archived_titles: guidanceTenders.slice(0, 20).map((tender) => tender.title),
    sample_rejected_candidate_titles: guidanceCandidates.slice(0, 20).map((candidate) => candidate.title)
  }, null, 2));

  if (!shouldCommit) {
    console.log("Dry run only. Re-run with --commit to update production tender rows.");
    return;
  }

  const now = new Date().toISOString();
  const archived = await updateByIds("tenders", guidanceTenders.map((tender) => tender.id), {
    status: "archived",
    updated_at: now
  });
  const rejected = await updateByIds("tender_candidates", guidanceCandidates.map((candidate) => candidate.id), {
    review_status: "rejected",
    admin_note: "品質整理: 案内ページ・説明ページ・書式ページに見えるため却下。",
    updated_at: now
  });

  console.log(JSON.stringify({
    event: "guidance_tender_cleanup_result",
    dry_run: false,
    archived_tenders: archived,
    rejected_candidates: rejected
  }, null, 2));
}

await main();
