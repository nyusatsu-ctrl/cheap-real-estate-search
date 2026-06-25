#!/usr/bin/env node
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

loadLocalEnv();

const url = process.env.TENDER_SUPABASE_URL;
const serviceRoleKey = process.env.TENDER_SUPABASE_SERVICE_ROLE_KEY;
const shouldCommit = process.argv.includes("--commit");
const limit = positiveInt(argValue("--limit"), 5000);
const sampleSize = positiveInt(argValue("--sample"), 10);
const PAGE_SIZE = 1000;

if (!url || !serviceRoleKey) {
  console.error("TENDER_SUPABASE_URL and TENDER_SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

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
  "公募に関する公示",
  "PDF",
  "EXCEL",
  "WORD"
]);

const STRONG_TITLE_WORDS = [
  "仕様書",
  "入札説明書",
  "一般競争",
  "指名競争",
  "見積公告",
  "見積依頼",
  "見積合わせ",
  "オープンカウンター",
  "オープンカウンタ",
  "企画競争",
  "購入",
  "買入",
  "調達",
  "納入",
  "納品",
  "履行",
  "開札",
  "参加資格",
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
  "製造",
  "一式",
  "ほか",
  "外",
  "部品",
  "備品",
  "役務",
  "保守点検"
];

const PROCUREMENT_NOTICE_WORDS = [
  "入札公告",
  "公告",
  "一般競争入札",
  "指名競争入札",
  "見積依頼",
  "見積公告",
  "オープンカウンター",
  "オープンカウンタ",
  "公募",
  "企画競争",
  "仕様書",
  "入札説明書",
  "調達"
];

const DEFENSE_CONTEXT_WORDS = [
  "防衛省",
  "自衛隊",
  "陸上自衛隊",
  "海上自衛隊",
  "航空自衛隊",
  "地方防衛局",
  "防衛装備庁",
  "方面会計隊",
  "駐屯地",
  "基地",
  "分屯基地",
  "地方総監部",
  "補給処",
  "mod.go.jp"
];

const GUIDANCE_TITLE_PATTERNS = [
  { code: "open_counter_guidance", pattern: /オープンカウンター方式/ },
  { code: "contract_handbook", pattern: /入札及び契約心得/ },
  { code: "quote_notice_guidance", pattern: /随意契約を前提とした見積依頼/ },
  { code: "table_header_title", pattern: /見積依頼公開日.*見積書提出期限/ },
  { code: "procurement_page_description", pattern: /入札公告[・･]公示等のページです|が実施する入札公告[・･]公示等/ },
  { code: "public_offer_index", pattern: /^公募に関する公示$/ },
  { code: "bid_info_link", pattern: /^入札[・･]落札情報はこちら$/ },
  { code: "listed_on_info_page", pattern: /入札情報のページに掲載/ },
  { code: "standard_contract_terms", pattern: /標準契約条項|標準契約書|契約書式|契約様式/ },
  { code: "purchase_order_terms", pattern: /請書条項/ },
  { code: "contract_terms", pattern: /契約条項|契約条項等/ },
  { code: "information_disclosure", pattern: /情報の公開|情報の公表|公共調達の適正化/ },
  { code: "procurement_guideline", pattern: /実施要領|低入札価格調査|特別重点調査|調達時期の目安|標準規格表/ },
  { code: "procurement_policy", pattern: /調達方針|調達予定のみ|契約制度|入札手続|契約手続|参加手続/ },
  { code: "procurement_spec_form", pattern: /調達要領|指定書|仕様書等|説明書等/ },
  { code: "bid_or_quote_form", pattern: /入札書|見積書|価格調査書|市価調査|車両適否.*調査票/ },
  { code: "forms_or_examples", pattern: /様式|書式|記入例|申請書|委任状|誓約書|チェックリスト/ },
  { code: "news_posting", pattern: /掲載しました|掲載しています|更新しました|更新情報/ },
  { code: "notice_or_sitemap", pattern: /リンク集|サイトマップ|お知らせ|説明|案内図|アクセス|問い合わせ|お問い合わせ/ },
  { code: "generic_publication", pattern: /^(?:公表|掲載|案内|一覧)$/ },
  { code: "navigation_link", pattern: /(?:はこちら|こちらをクリック|詳細はこちら|ページに掲載)$/ }
];

async function main() {
  const [pendingCandidates, tenders] = await Promise.all([
    readAll("tender_candidates", "*, tender_sources(name, source_name, organization_type, base_url)", (query) => (
      query.eq("review_status", "pending").order("fetched_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(limit)
    )),
    readAll("tenders", "id,title,agency_name,deadline_at,source_url,pdf_url,status", (query) => query.order("updated_at", { ascending: false }))
  ]);

  const existing = buildExistingTenderIndex(tenders);
  const classified = pendingCandidates.map((candidate) => classifyWithExisting(normalizeCandidate(candidate), existing));
  const groups = groupClassified(classified);

  const summary = {
    event: shouldCommit ? "tender_candidate_quality_apply_plan" : "tender_candidate_quality_dry_run",
    dry_run: !shouldCommit,
    project_ref: projectRef(url),
    pending_count: pendingCandidates.length,
    existing_tenders_count: tenders.length,
    high_confidence_publish_count: groups.publish.length,
    auto_reject_count: groups.reject.length,
    duplicate_count: groups.duplicate.length,
    hold_count: groups.hold.length,
    samples: {
      publish: sampleRows(groups.publish, sampleSize),
      reject: sampleRows(groups.reject, sampleSize),
      duplicate: sampleRows(groups.duplicate, sampleSize),
      hold: sampleRows(groups.hold, sampleSize)
    }
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!shouldCommit) {
    console.log("Dry run only. Re-run with --commit to publish high-confidence rows and reject clear guidance rows.");
    return;
  }

  const result = await applyClassification(groups, existing);
  console.log(JSON.stringify({
    event: "tender_candidate_quality_apply_result",
    dry_run: false,
    ...result
  }, null, 2));
}

async function applyClassification(groups, existing) {
  const now = new Date().toISOString();
  const rowsToInsert = [];
  const approvedIds = [];
  const duplicateIds = groups.duplicate.map((item) => item.candidate.id);

  for (const item of groups.publish) {
    const duplicateReason = duplicateReasonFor(item.candidate, existing);
    if (duplicateReason) {
      duplicateIds.push(item.candidate.id);
      continue;
    }
    const row = tenderPayloadFromCandidate(item.candidate, now);
    rowsToInsert.push(row);
    approvedIds.push(item.candidate.id);
    addTenderToExistingIndex(existing, row);
  }

  const insertResult = await insertTenderRows(rowsToInsert);
  const successfullyApprovedIds = approvedIds.slice(0, insertResult.inserted_count);
  const failedApprovedIds = approvedIds.slice(insertResult.inserted_count);

  await updateCandidateStatuses(successfullyApprovedIds, "approved", "品質判定: 高確度の案件候補として自動公開。");
  await updateCandidateStatuses(groups.reject.map((item) => item.candidate.id), "rejected", "品質判定: 案内ページ・説明ページ・書式ページに見えるため自動却下。");
  await updateCandidateStatuses(duplicateIds, "duplicate", "品質判定: 既存公開案件または重複候補のため duplicate。");

  return {
    inserted_tenders: insertResult.inserted_count,
    approved_candidates: successfullyApprovedIds.length,
    rejected_candidates: groups.reject.length,
    duplicate_candidates: duplicateIds.length,
    held_candidates: groups.hold.length + failedApprovedIds.length,
    insert_errors: insertResult.errors
  };
}

async function insertTenderRows(rows) {
  let inserted = 0;
  const errors = [];
  for (const chunk of chunks(rows, 100)) {
    const { error } = await supabase.from("tenders").insert(chunk);
    if (!error) {
      inserted += chunk.length;
      continue;
    }

    for (const row of chunk) {
      const single = await supabase.from("tenders").insert(row);
      if (single.error) {
        errors.push({ title: row.title, source_url: row.source_url, message: single.error.message });
      } else {
        inserted += 1;
      }
    }
  }
  return { inserted_count: inserted, errors };
}

async function updateCandidateStatuses(ids, status, note) {
  const now = new Date().toISOString();
  for (const chunk of chunks([...new Set(ids)], 200)) {
    if (!chunk.length) continue;
    const { error } = await supabase.from("tender_candidates").update({
      review_status: status,
      admin_note: note,
      updated_at: now
    }).in("id", chunk);
    if (error) throw new Error(`tender_candidates ${status}: ${error.message}`);
  }
}

function classifyWithExisting(candidate, existing) {
  const duplicateReason = duplicateReasonFor(candidate, existing);
  const quality = assessQuality(candidate);
  if (duplicateReason) {
    return {
      candidate,
      quality: {
        ...quality,
        decision: "duplicate",
        autoPublish: false,
        positiveReasons: quality.positiveReasons,
        negativeReasons: [...quality.negativeReasons, duplicateReason],
        holdReasons: []
      }
    };
  }
  return { candidate, quality };
}

function groupClassified(items) {
  return {
    publish: items.filter((item) => item.quality.decision === "auto_publish"),
    reject: items.filter((item) => item.quality.decision === "auto_reject"),
    duplicate: items.filter((item) => item.quality.decision === "duplicate"),
    hold: items.filter((item) => item.quality.decision === "hold")
  };
}

function assessQuality(candidate) {
  if (candidate.duplicate_candidate_id) {
    return quality("duplicate", 0, [], ["重複候補IDあり"], [], false, false);
  }

  const title = normalizeTitle(candidate.title);
  const compact = compactTitle(title);
  if (!compact) return reject("empty_title", "案件名が空");
  if (isMonthOnlyTitle(compact)) return reject("month_only_title", "月だけのタイトル");
  if (isDateOnlyTitle(compact)) return reject("date_only_title", "日付だけのタイトル");
  if (isNumberOrSymbolOnlyTitle(compact)) return reject("number_or_symbol_only_title", "番号・記号だけのタイトル");
  const guidanceCode = guidanceTitleCode(title);
  if (guidanceCode) return reject(guidanceCode, "案内ページ・説明ページ・書式ページの可能性");
  if (isClassificationOnlyTitle(compact)) return reject("classification_only_title", "分類名だけのタイトル");
  if (compact.length <= 3) return reject("too_short_title", "タイトルが短すぎる");
  if (compact.length <= 5 && !hasStrongTitleWord(title)) return reject("too_short_weak_title", "短く、物品名・役務名の手掛かりが弱い");
  if (looksLikeNavigationTitle(title)) return reject("navigation_title", "一覧・案内リンクの可能性");
  if (candidate.tender_type === "unknown" && !hasStrongTitleWord(`${title} ${candidate.raw_text ?? ""} ${candidate.detail_memo ?? ""}`)) {
    return reject("unknown_weak_title", "分類不明で、物品名・役務名の手掛かりが弱い");
  }

  const scoring = scoreCandidate(candidate, title);
  const holdReasons = holdReasonsFor(candidate, scoring);
  const autoPublish = holdReasons.length === 0 && scoring.score >= 8;
  return quality(autoPublish ? "auto_publish" : "hold", scoring.score, scoring.positiveReasons, scoring.negativeReasons, holdReasons, autoPublish, false);
}

function quality(decision, score, positiveReasons, negativeReasons, holdReasons, autoPublish, autoReject) {
  return { decision, score, positiveReasons, negativeReasons, holdReasons, autoPublish, autoReject };
}

function reject(code, reason) {
  return {
    decision: "auto_reject",
    code,
    score: -10,
    positiveReasons: [],
    negativeReasons: [reason],
    holdReasons: [],
    autoPublish: false,
    autoReject: true
  };
}

function scoreCandidate(candidate, title) {
  let score = 0;
  const positiveReasons = [];
  const negativeReasons = [];
  const text = [
    title,
    candidate.raw_text,
    candidate.ai_summary,
    candidate.detail_memo,
    candidate.agency_name,
    candidate.source_name,
    candidate.organization_type,
    candidate.required_qualification,
    candidate.source_url,
    candidate.pdf_url
  ].filter(Boolean).join(" ");

  const noticeWords = matchedWords(title, PROCUREMENT_NOTICE_WORDS);
  if (noticeWords.length) {
    score += 3;
    positiveReasons.push(`公告・調達語: ${noticeWords.slice(0, 3).join("、")}`);
  }

  const strongTitleWords = matchedWords(title, STRONG_TITLE_WORDS);
  if (strongTitleWords.length) {
    score += 3;
    positiveReasons.push(`物品・役務語: ${strongTitleWords.slice(0, 4).join("、")}`);
  } else {
    const strongTextWords = matchedWords(text, STRONG_TITLE_WORDS);
    if (strongTextWords.length) {
      score += 1;
      positiveReasons.push(`本文の物品・役務語: ${strongTextWords.slice(0, 3).join("、")}`);
    }
  }

  if (/ほか\d+件|外\d+件|一式|[一二三四五六七八九十百千]+式/.test(title)) {
    score += 2;
    positiveReasons.push("数量・一式表現あり");
  }
  const defenseWords = matchedWords(text, DEFENSE_CONTEXT_WORDS);
  if (defenseWords.length || isDefenseOrganizationType(candidate.organization_type)) {
    score += 2;
    positiveReasons.push(`防衛系文脈: ${defenseWords[0] ?? candidate.organization_type ?? "組織区分"}`);
  }
  if (isKnownTenderType(candidate.tender_type)) {
    score += 2;
    positiveReasons.push(`分類: ${candidate.tender_type}`);
  } else {
    score -= 3;
    negativeReasons.push("分類が unknown/construction");
  }
  if (candidate.deadline_at || candidate.bid_at || candidate.published_at) {
    score += 2;
    positiveReasons.push("公告日・締切日・入札日のいずれかあり");
  } else {
    negativeReasons.push("日付情報なし");
  }
  if (candidate.source_url) {
    score += 1;
    positiveReasons.push("公式URLあり");
  } else {
    score -= 5;
    negativeReasons.push("公式URLなし");
  }
  if (candidate.pdf_url || (Array.isArray(candidate.attachments) && candidate.attachments.length > 0)) {
    score += 1;
    positiveReasons.push("PDF/添付URLあり");
  }
  return { score, positiveReasons, negativeReasons };
}

function holdReasonsFor(candidate, scoring) {
  const reasons = [];
  const title = normalizeTitle(candidate.title);
  if (!candidate.source_url) reasons.push("公式URLがありません。");
  if (!isKnownTenderType(candidate.tender_type)) reasons.push("分類が unknown または construction です。");
  if (scoring.score < 8) reasons.push(`品質スコアが自動公開基準未満です（${scoring.score}/8）。`);
  if (!hasStrongTitleWord(title) && matchedWords(title, PROCUREMENT_NOTICE_WORDS).length === 0) {
    reasons.push("案件名に公告語または物品・役務語がありません。");
  }
  if (scoring.negativeReasons.length) reasons.push(...scoring.negativeReasons);
  return [...new Set(reasons)];
}

function tenderPayloadFromCandidate(candidate, now) {
  return {
    source_id: candidate.source_id ?? null,
    source_name: candidate.source_name ?? candidate.tender_sources?.source_name ?? candidate.tender_sources?.name ?? candidate.agency_name,
    organization_type: candidate.organization_type ?? candidate.tender_sources?.organization_type ?? null,
    title: candidate.title,
    agency_name: candidate.agency_name,
    tender_type: toPublishedTenderType(candidate.tender_type),
    region: candidate.region || "全国",
    prefecture: candidate.prefecture || "未設定",
    base_location: candidate.base_location ?? null,
    published_at: candidate.published_at ?? null,
    deadline_at: candidate.deadline_at ?? null,
    bid_at: candidate.bid_at ?? null,
    qualification_required: Boolean(candidate.qualification_required),
    required_qualification: candidate.required_qualification ?? null,
    source_url: candidate.source_url,
    pdf_url: candidate.pdf_url ?? null,
    attachments: Array.isArray(candidate.attachments) ? candidate.attachments : [],
    raw_text: candidate.raw_text ?? null,
    detail_memo: candidate.ai_summary ?? candidate.raw_text ?? null,
    original_label: candidate.original_label ?? null,
    is_admin_verified: true,
    is_new: true,
    is_deadline_soon: isDeadlineSoon(candidate.deadline_at),
    is_defense: isDefenseCandidate(candidate),
    status: "published",
    fetched_at: candidate.fetched_at ?? now,
    created_at: now,
    updated_at: now
  };
}

function normalizeCandidate(candidate) {
  return {
    ...candidate,
    source_name: candidate.source_name ?? candidate.tender_sources?.source_name ?? candidate.tender_sources?.name ?? candidate.agency_name ?? null,
    organization_type: candidate.organization_type ?? candidate.tender_sources?.organization_type ?? null,
    attachments: Array.isArray(candidate.attachments) ? candidate.attachments : []
  };
}

function buildExistingTenderIndex(tenders) {
  const sourceUrls = new Set();
  const pdfUrls = new Set();
  const titleKeys = new Set();
  for (const tender of tenders) {
    addTenderToExistingIndex({ sourceUrls, pdfUrls, titleKeys }, tender);
  }
  return { sourceUrls, pdfUrls, titleKeys };
}

function addTenderToExistingIndex(existing, tender) {
  if (tender.source_url) existing.sourceUrls.add(tender.source_url);
  if (tender.pdf_url) existing.pdfUrls.add(tender.pdf_url);
  const titleKey = tenderTitleKey(tender);
  if (titleKey) existing.titleKeys.add(titleKey);
}

function duplicateReasonFor(candidate, existing) {
  if (candidate.source_url && existing.sourceUrls.has(candidate.source_url)) return "同じ公式URLの公開案件あり";
  if (candidate.pdf_url && existing.pdfUrls.has(candidate.pdf_url)) return "同じPDF URLの公開案件あり";
  const titleKey = tenderTitleKey(candidate);
  if (titleKey && existing.titleKeys.has(titleKey)) return "同じ発注機関・案件名・締切日の公開案件あり";
  return null;
}

function tenderTitleKey(value) {
  if (!value.agency_name || !value.title || !value.deadline_at) return null;
  return `${normalizeTitle(value.agency_name)}|${normalizeTitle(value.title)}|${String(value.deadline_at).slice(0, 10)}`;
}

function sampleRows(items, size) {
  return items.slice(0, size).map(({ candidate, quality }) => ({
    id: candidate.id,
    title: candidate.title,
    url: candidate.source_url,
    agency_name: candidate.agency_name,
    tender_type: candidate.tender_type,
    source_name: candidate.source_name ?? candidate.tender_sources?.source_name ?? candidate.tender_sources?.name ?? null,
    score: quality.score,
    ok: quality.positiveReasons.slice(0, 4),
    ng: quality.negativeReasons.slice(0, 4),
    hold: quality.holdReasons.slice(0, 4)
  }));
}

async function readAll(table, columns, configure) {
  const rows = [];
  for (let page = 0; rows.length < limit && page < 20; page += 1) {
    const from = page * PAGE_SIZE;
    const to = Math.min(from + PAGE_SIZE - 1, limit - 1);
    let query = supabase.from(table).select(columns).range(from, to);
    query = configure(query);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows.slice(0, limit);
}

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

function isNumberOrSymbolOnlyTitle(value) {
  return /^[\d０-９A-Za-zＡ-Ｚａ-ｚ\-_.\/第号]+$/.test(value);
}

function isClassificationOnlyTitle(value) {
  const upper = value.toUpperCase();
  if (CLASSIFICATION_ONLY_TITLES.has(value) || CLASSIFICATION_ONLY_TITLES.has(upper)) return true;
  return /^(?:令和\d{1,2}年度|R\d{1,2}年度|20\d{2}年度)?(?:入札公告|公告|公示|公募|調達情報|契約情報|入札情報|見積依頼|オープンカウンター|オープンカウンタ|物品|役務|工事)(?:一覧)?$/i.test(value);
}

function guidanceTitleCode(value) {
  const compact = compactTitle(value);
  for (const { code, pattern } of GUIDANCE_TITLE_PATTERNS) {
    if (pattern.test(value) || pattern.test(compact)) return code;
  }
  return null;
}

function hasStrongTitleWord(value) {
  return STRONG_TITLE_WORDS.some((word) => value.includes(word));
}

function looksLikeNavigationTitle(value) {
  if (/^(?:トップ|ホーム|一覧|詳細|戻る|次へ|前へ|こちら|クリック|ダウンロード|PDF|Excel|Word)$/i.test(value)) return true;
  return /(?:トップページ|サイトマップ|お問い合わせ|アクセス|入札結果|契約実績|調達実績|様式|各種様式|ガイドライン|入札説明書等)$/.test(value);
}

function matchedWords(value, words) {
  return words.filter((word) => String(value ?? "").includes(word));
}

function isKnownTenderType(value) {
  return Boolean(value && !["unknown", "construction"].includes(value));
}

function isDefenseOrganizationType(value) {
  return Boolean(value && [
    "defense_ministry",
    "defense_equipment_agency",
    "ground_self_defense_force",
    "maritime_self_defense_force",
    "air_self_defense_force",
    "defense_bureau",
    "defense_school",
    "defense_hospital",
    "defense_research",
    "other_defense"
  ].includes(value));
}

function isDefenseCandidate(candidate) {
  const text = [
    candidate.title,
    candidate.agency_name,
    candidate.source_name,
    candidate.organization_type,
    candidate.source_url,
    candidate.pdf_url
  ].filter(Boolean).join(" ");
  return isDefenseOrganizationType(candidate.organization_type) || DEFENSE_CONTEXT_WORDS.some((word) => text.includes(word));
}

function toPublishedTenderType(value) {
  if (value === "services") return "service";
  if (value === "small_discretionary" || value === "open_counter") return "open_counter";
  if (value === "qualification_required") return "unified_qualification";
  if (value === "goods") return "goods";
  return "service";
}

function isDeadlineSoon(value) {
  if (!value) return false;
  const diff = new Date(value).getTime() - Date.now();
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function positiveInt(value, fallback) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? Math.floor(numberValue) : fallback;
}

function argValue(name) {
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  if (match) return match.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function projectRef(value) {
  try {
    return new URL(value).hostname.split(".")[0] || "unknown";
  } catch {
    return "unknown";
  }
}

function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  }
}

await main();
