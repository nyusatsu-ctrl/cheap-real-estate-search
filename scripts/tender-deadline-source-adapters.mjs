#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";

loadLocalEnv();

const execFileAsync = promisify(execFile);
const url = process.env.TENDER_SUPABASE_URL;
const serviceRoleKey = process.env.TENDER_SUPABASE_SERVICE_ROLE_KEY;
const mode = argValue("--mode") ?? "analyze";
const shouldApply = mode === "apply";
const limit = positiveInt(argValue("--limit"), 5000);
const sampleSize = positiveInt(argValue("--sample"), 10);
const topSources = positiveInt(argValue("--top-sources"), 20);
const maxLinksPerTender = positiveInt(argValue("--max-links-per-tender"), 6);
const concurrency = positiveInt(argValue("--concurrency"), 3);
const fetchTimeoutMs = positiveInt(argValue("--fetch-timeout-ms"), 9000);
const PAGE_SIZE = 1000;

if (!url || !serviceRoleKey) {
  console.error("TENDER_SUPABASE_URL and TENDER_SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

async function main() {
  const unknownTenders = await readUnknownPublishedTenders(limit);
  const analyses = await mapLimit(unknownTenders, concurrency, analyzeTender);
  const highConfidence = analyses.filter((item) => item.best?.confidence === "high");
  const conflictById = await findDeadlineConflicts(highConfidence);
  const safeHighConfidence = highConfidence.filter((item) => !conflictById.has(item.row.id));
  const duplicateConflict = highConfidence.filter((item) => conflictById.has(item.row.id));
  const mediumConfidence = analyses.filter((item) => item.best?.confidence === "medium");
  const stillUnknown = analyses.filter((item) => !item.best);
  const expiredHighConfidence = safeHighConfidence.filter((item) => deadlineStatus(item.best.deadlineAt) === "expired");

  const summary = {
    event: shouldApply ? "tender_deadline_source_adapter_apply_plan" : mode === "dry_run" ? "tender_deadline_source_adapter_dry_run" : "tender_deadline_source_analysis",
    dry_run: !shouldApply,
    project_ref: projectRef(url),
    unknown_target_total: unknownTenders.length,
    html_fetch_success_count: analyses.filter((item) => item.fetch.htmlSuccess > 0).length,
    html_fetch_failure_count: analyses.filter((item) => item.fetch.htmlAttempts > 0 && item.fetch.htmlSuccess === 0).length,
    pdf_link_found_count: sum(analyses, (item) => item.fetch.pdfLinksFound),
    pdf_fetch_success_count: analyses.filter((item) => item.fetch.pdfSuccess > 0).length,
    pdf_fetch_failure_count: analyses.filter((item) => item.fetch.pdfAttempts > 0 && item.fetch.pdfSuccess === 0).length,
    image_pdf_count: sum(analyses, (item) => item.fetch.imagePdfCount),
    high_confidence_extract_count: highConfidence.length,
    safe_high_confidence_update_count: safeHighConfidence.length,
    duplicate_conflict_count: duplicateConflict.length,
    medium_confidence_count: mediumConfidence.length,
    still_unknown_count: stillUnknown.length,
    expired_after_apply_count: expiredHighConfidence.length,
    source_breakdowns: {
      top_domains: topGroups(groupBy(analyses, (item) => item.domain), topSources),
      top_sources: topGroups(groupBy(analyses, (item) => item.sourceKey), topSources),
      top_agencies: topGroups(groupBy(analyses, (item) => item.agencyKey), topSources),
      medium_by_kind: topGroups(groupBy(mediumConfidence, (item) => item.best?.kind ?? "unknown"), 20),
      failure_reasons: topGroups(groupBy(stillUnknown, (item) => item.failureReason), 20)
    },
    top_source_details: sourceDetails(analyses, topSources),
    samples: {
      high: sampleAnalyses(highConfidence, sampleSize),
      safe_high: sampleAnalyses(safeHighConfidence, sampleSize),
      duplicate_conflict: sampleAnalyses(duplicateConflict, sampleSize).map((sample) => ({
        ...sample,
        duplicate_conflict: conflictById.get(sample.id) ?? null
      })),
      medium: sampleAnalyses(mediumConfidence, sampleSize),
      still_unknown: sampleAnalyses(stillUnknown, sampleSize),
      image_pdf: sampleAnalyses(analyses.filter((item) => item.fetch.imagePdfCount > 0), sampleSize)
    },
    safety_checks: {
      only_high_confidence_will_be_applied: true,
      duplicate_conflicts_skipped: true,
      medium_kept_unknown: true,
      archived_tenders: 0,
      forbidden_labels_not_applied: ["履行期限", "納入期限", "納期", "契約期間", "公告日", "掲載日", "更新日", "質問受付期限", "説明会日時", "開札日時のみ"]
    }
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!shouldApply) return;

  let updated = 0;
  const errors = [];
  const skipped = [];
  for (const analysis of highConfidence) {
    const conflict = conflictById.get(analysis.row.id);
    if (conflict) {
      skipped.push({ id: analysis.row.id, reason: "duplicate_deadline_conflict", conflict });
      continue;
    }
    const deadlineAt = analysis.best.deadlineAt;
    const { error } = await supabase.from("tenders").update({
      deadline_at: deadlineAt,
      bid_at: deadlineAt,
      is_deadline_soon: deadlineStatus(deadlineAt) === "closing_soon"
    }).eq("id", analysis.row.id).is("deadline_at", null).is("bid_at", null);
    if (error) errors.push({ id: analysis.row.id, error: error.message });
    else updated += 1;
  }

  console.log(JSON.stringify({
    event: "tender_deadline_source_adapter_apply_result",
    project_ref: projectRef(url),
    updated_tenders: updated,
    skipped_tenders: skipped.length,
    archived_tenders: 0,
    error_count: errors.length,
    skipped: skipped.slice(0, 10),
    errors: errors.slice(0, 10)
  }, null, 2));
}

async function findDeadlineConflicts(highConfidence) {
  const conflictById = new Map();
  const uniqueChecks = uniqueBy(highConfidence.map((item) => ({
    id: item.row.id,
    title: item.row.title,
    agencyName: item.row.agency_name,
    deadlineAt: item.best?.deadlineAt
  })).filter((item) => item.title && item.agencyName && item.deadlineAt), (item) => `${item.agencyName}\n${item.title}\n${item.deadlineAt}`);

  for (const check of uniqueChecks) {
    const { data, error } = await supabase
      .from("tenders")
      .select("id,title,agency_name,deadline_at,source_url")
      .eq("agency_name", check.agencyName)
      .eq("title", check.title)
      .eq("deadline_at", check.deadlineAt)
      .neq("id", check.id)
      .limit(3);
    if (error) {
      conflictById.set(check.id, { type: "conflict_check_failed", error: error.message });
      continue;
    }
    if (data?.length) {
      conflictById.set(check.id, {
        type: "existing_tender_same_agency_title_deadline",
        deadline_at: check.deadlineAt,
        conflicting_ids: data.map((row) => row.id)
      });
    }
  }

  const grouped = groupBy(highConfidence.filter((item) => item.row.title && item.row.agency_name && item.best?.deadlineAt), (item) => `${item.row.agency_name}\n${item.row.title}\n${item.best.deadlineAt}`);
  for (const groupItems of grouped.values()) {
    if (groupItems.length <= 1) continue;
    for (const item of groupItems.slice(1)) {
      conflictById.set(item.row.id, {
        type: "same_run_same_agency_title_deadline",
        deadline_at: item.best.deadlineAt,
        conflicting_ids: [groupItems[0].row.id]
      });
    }
  }

  return conflictById;
}

async function readUnknownPublishedTenders(limitRows) {
  const rows = [];
  for (let page = 0; rows.length < limitRows && page < 20; page += 1) {
    const from = page * PAGE_SIZE;
    const to = Math.min(from + PAGE_SIZE - 1, limitRows - 1);
    const { data, error } = await supabase
      .from("tenders")
      .select("id,title,agency_name,source_name,original_label,published_at,deadline_at,bid_at,source_url,pdf_url,attachments,raw_text,detail_memo,required_qualification,status,is_deadline_soon,fetched_at,created_at,updated_at,tender_sources(name,source_name,url,tender_list_url,base_url,organization_type,crawler_type,source_format,last_crawled_at,last_error_message)")
      .eq("status", "published")
      .is("deadline_at", null)
      .is("bid_at", null)
      .order("updated_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(`tenders: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows.slice(0, limitRows);
}

async function analyzeTender(row) {
  const domain = hostOf(row.source_url);
  const sourceKey = sourceName(row);
  const agencyKey = row.agency_name || "unknown_agency";
  const fetchStats = {
    htmlAttempts: 0,
    htmlSuccess: 0,
    pdfAttempts: 0,
    pdfSuccess: 0,
    pdfLinksFound: 0,
    imagePdfCount: 0,
    contentTypeMismatch: 0,
    errors: []
  };
  const documents = [{
    url: "db:stored_text",
    type: "db",
    text: [row.title, row.original_label, row.raw_text, row.detail_memo, row.required_qualification].filter(Boolean).join("\n"),
    fetched: true
  }];

  const initialUrls = uniqueUrls([row.source_url, row.pdf_url, ...attachmentUrls(row.attachments)]).slice(0, 4);
  const queuedLinks = [];
  for (const sourceUrl of initialUrls) {
    const fetched = await fetchDocument(sourceUrl, fetchStats, row.source_url);
    if (!fetched) continue;
    documents.push(fetched);
    if (fetched.type === "html") queuedLinks.push(...adapterLinks(fetched.html ?? "", fetched.url, row));
  }

  const related = uniqueUrls(queuedLinks).slice(0, maxLinksPerTender);
  fetchStats.pdfLinksFound = related.filter((link) => fileType(link) === "pdf").length;
  for (const sourceUrl of related) {
    if (initialUrls.includes(sourceUrl)) continue;
    const fetched = await fetchDocument(sourceUrl, fetchStats, row.source_url);
    if (fetched) documents.push(fetched);
  }

  const referenceDate = normalizeIso(row.published_at) ?? normalizeIso(row.fetched_at) ?? normalizeIso(row.created_at) ?? normalizeIso(row.updated_at);
  const candidates = documents.flatMap((document) => extractDeadlineCandidates(document.text, referenceDate, document.url, document.type, row));
  const best = candidates.sort(compareCandidates)[0] ?? null;
  const failureReason = best
    ? null
    : fetchStats.htmlSuccess + fetchStats.pdfSuccess === 0
      ? "html_pdf_fetch_failed"
      : fetchStats.pdfLinksFound > 0 && fetchStats.pdfSuccess === 0
        ? "pdf_links_found_but_pdf_fetch_failed"
        : fetchStats.imagePdfCount > 0
          ? "image_pdf_text_unavailable"
          : "no_high_confidence_deadline_in_fetched_documents";

  return { row, domain, sourceKey, agencyKey, best, candidates, documents: summarizeDocuments(documents), fetch: fetchStats, failureReason };
}

async function fetchDocument(sourceUrl, stats, referer) {
  const guessedType = fileType(sourceUrl);
  if (guessedType === "pdf") stats.pdfAttempts += 1;
  else stats.htmlAttempts += 1;
  try {
    const response = await fetchWithTimeout(sourceUrl, referer);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    const disposition = response.headers.get("content-disposition") ?? "";
    const buffer = Buffer.from(await response.arrayBuffer());
    const detectedType = detectDocumentType(sourceUrl, contentType, disposition, buffer);
    if (guessedType !== detectedType && (guessedType === "pdf" || detectedType === "pdf")) stats.contentTypeMismatch += 1;
    if (detectedType === "pdf") {
      const text = await pdfToText(buffer);
      if (text.length < 80) stats.imagePdfCount += 1;
      else stats.pdfSuccess += 1;
      return { url: sourceUrl, type: "pdf", text, html: null, fetched: true, contentType };
    }
    const html = decodeHtml(buffer, contentType);
    stats.htmlSuccess += 1;
    return { url: sourceUrl, type: "html", text: htmlToText(html), html, fetched: true, contentType };
  } catch (error) {
    stats.errors.push({ url: sourceUrl, type: guessedType, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

async function fetchWithTimeout(sourceUrl, referer) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
  try {
    return await fetch(sourceUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "EcoLoopTenderDeadlineChecker/1.0",
        accept: "text/html,application/pdf,application/octet-stream,*/*;q=0.8",
        ...(referer ? { referer } : {})
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function pdfToText(buffer) {
  const tmpPath = path.join(os.tmpdir(), `tender-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  try {
    await fs.promises.writeFile(tmpPath, buffer);
    const { stdout } = await execFileAsync("pdftotext", ["-layout", tmpPath, "-"], { timeout: Math.max(1000, fetchTimeoutMs) });
    return cleanText(stdout);
  } catch {
    return cleanText(buffer.toString("latin1").replace(/\\([()\\])/g, "$1").replace(/\\[rn]/g, "\n"));
  } finally {
    await fs.promises.rm(tmpPath, { force: true }).catch(() => {});
  }
}

function adapterLinks(html, pageUrl, row) {
  const adapter = selectAdapter(row);
  return adapter.collectLinks(html, pageUrl, row);
}

function selectAdapter(row) {
  const host = hostOf(row.source_url);
  if (host.endsWith("mod.go.jp")) return DEFENSE_SITE_ADAPTER;
  if (host.endsWith("p-portal.go.jp")) return PROCUREMENT_PORTAL_ADAPTER;
  return DEFAULT_ADAPTER;
}

const DEFAULT_ADAPTER = {
  collectLinks(html, pageUrl, row) {
    return collectLinks(html, pageUrl, row, DEFAULT_LINK_PATTERNS);
  }
};

const DEFENSE_SITE_ADAPTER = {
  collectLinks(html, pageUrl, row) {
    return collectLinks(html, pageUrl, row, [
      /公告|入札公告|見積依頼|見積合わせ|オープンカウンター|入札説明書|仕様書|内訳書|参加申請|資格確認|添付|pdf/i,
      /koukoku|nyusatu|nyuusatsu|bid|open|mitumori|mitsumori|anken|kouji|ippan|oc/i
    ], { samePathBias: true });
  }
};

const PROCUREMENT_PORTAL_ADAPTER = {
  collectLinks(html, pageUrl, row) {
    return collectLinks(html, pageUrl, row, [
      /公告|入札説明書|仕様書|調達案件|添付資料|参加申請|資格確認|pdf/i,
      /detail|download|choutatsu|koukoku|setsumei|shiyou|pdf/i
    ]);
  }
};

const DEFAULT_LINK_PATTERNS = [
  /公告|入札|見積|オープンカウンター|仕様書|説明書|添付|調達案件|pdf/i,
  /koukoku|nyusatu|nyuusatsu|bid|open|mitumori|mitsumori|choutatsu|pdf/i
];

function collectLinks(html, pageUrl, row, patterns, options = {}) {
  const titleTokens = titleKeywords(row.title);
  const links = [];
  const page = safeUrl(pageUrl);
  if (!page) return links;
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = match[1] ?? "";
    const href = attrs.match(/\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i)?.slice(1).find(Boolean);
    if (!href || /^javascript:/i.test(href)) continue;
    const linkUrl = safeUrl(href, page.href);
    if (!linkUrl || linkUrl.hostname !== page.hostname) continue;
    const text = cleanText(htmlToText(match[2] ?? ""));
    const target = decodeURIComponentSafe(`${text} ${linkUrl.href}`.normalize("NFKC"));
    const samePath = options.samePathBias && linkUrl.pathname.split("/").slice(0, -1).join("/") === page.pathname.split("/").slice(0, -1).join("/");
    const relevant = patterns.some((pattern) => pattern.test(target)) || titleTokens.some((token) => target.includes(token)) || samePath;
    if (!relevant) continue;
    if (!["html", "pdf"].includes(fileType(linkUrl.href))) continue;
    links.push(linkUrl.href);
  }
  return links;
}

function extractDeadlineCandidates(text, referenceDate, sourceUrl, sourceType, row) {
  const normalized = cleanText(text);
  if (!normalized) return [];
  const candidates = [];
  for (const context of contextWindows(normalized)) {
    if (FORBIDDEN_CONTEXT.test(context)) continue;
    for (const definition of DEADLINE_DEFINITIONS) {
      const labelIndex = context.indexOf(definition.label);
      if (labelIndex < 0) continue;
      const searchText = context.slice(labelIndex);
      if (definition.requiredContext && !definition.requiredContext.test(searchText)) continue;
      for (const date of parseDates(searchText, referenceDate)) {
        if (!isDateCloseToLabel(searchText, definition.label, date.matchedText)) continue;
        candidates.push({
          deadlineAt: date.iso,
          sourceUrl,
          sourceType,
          evidence: context.slice(0, 240),
          label: definition.label,
          kind: definition.kind,
          confidence: definition.confidence,
          priority: adapterPriorityBoost(definition.priority, row, sourceUrl),
          isEstimated: date.isEstimated
        });
      }
    }
  }
  return candidates;
}

function adapterPriorityBoost(priority, row, sourceUrl) {
  const host = hostOf(sourceUrl || row.source_url);
  if (host.endsWith("mod.go.jp")) return priority + 10;
  return priority;
}

const DEADLINE_DEFINITIONS = [
  { label: "競争参加資格確認申請書提出期限", priority: 430, confidence: "high", kind: "participation_application_deadline" },
  { label: "競争参加資格確認資料提出期限", priority: 430, confidence: "high", kind: "participation_application_deadline" },
  { label: "競争参加資格確認申請期限", priority: 425, confidence: "high", kind: "participation_application_deadline" },
  { label: "参加資格確認申請書提出期限", priority: 420, confidence: "high", kind: "participation_application_deadline" },
  { label: "証明書等提出期限", priority: 390, confidence: "high", kind: "certificate_submission_deadline" },
  { label: "証明書等の提出期限", priority: 390, confidence: "high", kind: "certificate_submission_deadline" },
  { label: "資格・実績証明書等の提出期限", priority: 390, confidence: "high", kind: "certificate_submission_deadline" },
  { label: "参加申請期限", priority: 380, confidence: "high", kind: "participation_application_deadline" },
  { label: "参加表明書提出期限", priority: 380, confidence: "high", kind: "participation_application_deadline" },
  { label: "入札書提出期限", priority: 350, confidence: "high", kind: "bid_submission_deadline" },
  { label: "見積書提出期限", priority: 350, confidence: "high", kind: "quote_submission_deadline" },
  { label: "見積書等の提出期限", priority: 345, confidence: "high", kind: "quote_submission_deadline" },
  { label: "見積書等提出期限", priority: 345, confidence: "high", kind: "quote_submission_deadline" },
  { label: "見積提出期限", priority: 340, confidence: "high", kind: "quote_submission_deadline" },
  { label: "企画提案書提出期限", priority: 330, confidence: "high", kind: "proposal_submission_deadline" },
  { label: "提案書提出期限", priority: 325, confidence: "high", kind: "proposal_submission_deadline" },
  { label: "応募締切", priority: 310, confidence: "high", kind: "application_deadline" },
  { label: "申込期限", priority: 300, confidence: "high", kind: "application_deadline" },
  { label: "申込み期限", priority: 300, confidence: "high", kind: "application_deadline" },
  { label: "受付期限", priority: 290, confidence: "high", kind: "reception_deadline" },
  { label: "提出期限", priority: 260, confidence: "high", kind: "submission_deadline", requiredContext: /入札書|見積書|見積書等|提案書|企画提案|参加|資格|証明書|申請|応募|提出書類/ },
  { label: "入札日時", priority: 180, confidence: "medium", kind: "bid_datetime" },
  { label: "見積合わせ日時", priority: 175, confidence: "medium", kind: "quote_matching_datetime" },
  { label: "見積日時", priority: 170, confidence: "medium", kind: "quote_datetime" },
  { label: "開札日時", priority: 90, confidence: "medium", kind: "opening_datetime" }
];

const FORBIDDEN_CONTEXT = /履行期限|履行期間|納入期限|納期|納入期間|契約期間|公告日|公示日|掲載日|公開日|更新日|質問書|質問期限|質問受付|質問回答|質問締切|説明会日時|現場説明/;

function isDateCloseToLabel(context, label, matchedText) {
  const labelIndex = context.indexOf(label);
  const dateIndex = context.indexOf(matchedText, Math.max(0, labelIndex));
  if (labelIndex < 0 || dateIndex < 0) return false;
  const between = context.slice(labelIndex + label.length, dateIndex);
  if (between.length > 70) return false;
  if (containsDateLike(between)) return false;
  if (/までの期間|から|以降|停止等措置|要領|制定|付け|平成\d/.test(between)) return false;
  return true;
}

function contextWindows(text) {
  const lines = text.split(/\n|。|；|;/).map((line) => cleanText(line)).filter(Boolean);
  const contexts = [];
  for (let index = 0; index < lines.length; index += 1) {
    contexts.push(lines[index]);
    if (index + 1 < lines.length) contexts.push(`${lines[index]} ${lines[index + 1]}`);
  }
  return contexts.filter((context) => /\d|令和|平成|R\s*\d/i.test(context));
}

function parseDates(text, referenceDate) {
  const normalized = String(text ?? "").normalize("NFKC");
  const results = [];
  const push = (year, month, day, matchedText, isEstimated = false) => {
    const iso = toIsoDate(year, month, day);
    if (iso) results.push({ iso, matchedText, isEstimated });
  };

  for (const match of normalized.matchAll(/令和\s*(元|\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?(?:\s*[（(][^)）]*[)）])?(?:\s*(?:午前|午後)?\s*\d{1,2}\s*時(?:\s*\d{1,2}\s*分)?|正午)?/g)) {
    const eraYear = match[1] === "元" ? 1 : Number(match[1]);
    push(2018 + eraYear, Number(match[2]), Number(match[3]), match[0]);
  }
  for (const match of normalized.matchAll(/平成\s*(元|\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/g)) {
    const eraYear = match[1] === "元" ? 1 : Number(match[1]);
    push(1988 + eraYear, Number(match[2]), Number(match[3]), match[0]);
  }
  for (const match of normalized.matchAll(/\bR\s*(\d{1,2})[.\/\-年\s]+(\d{1,2})[.\/\-月\s]+(\d{1,2})\b/gi)) {
    push(2018 + Number(match[1]), Number(match[2]), Number(match[3]), match[0]);
  }
  for (const match of normalized.matchAll(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?(?:\s*[（(][^)）]*[)）])?(?:\s*(?:午前|午後)?\s*\d{1,2}\s*時(?:\s*\d{1,2}\s*分)?|正午)?/g)) {
    push(Number(match[1]), Number(match[2]), Number(match[3]), match[0]);
  }
  for (const match of normalized.matchAll(/\b(20\d{2})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/g)) {
    push(Number(match[1]), Number(match[2]), Number(match[3]), match[0]);
  }
  for (const match of normalized.matchAll(/(?<!\d)(\d{1,2})\s*月\s*(\d{1,2})\s*日(?:\s*[（(][^)）]*[)）])?(?:\s*(?:午前|午後)?\s*\d{1,2}\s*時(?:\s*\d{1,2}\s*分)?|正午)?/g)) {
    const inferred = inferYear(Number(match[1]), Number(match[2]), referenceDate);
    if (inferred) push(inferred, Number(match[1]), Number(match[2]), match[0], true);
  }
  for (const match of normalized.matchAll(/(?<!\d)(\d{1,2})[\/.](\d{1,2})(?![\/.\d])/g)) {
    const inferred = inferYear(Number(match[1]), Number(match[2]), referenceDate);
    if (inferred) push(inferred, Number(match[1]), Number(match[2]), match[0], true);
  }
  return uniqueBy(results, (value) => `${value.iso}-${value.matchedText}`);
}

function inferYear(month, day, referenceDate) {
  if (!referenceDate) return null;
  const reference = new Date(referenceDate);
  if (Number.isNaN(reference.getTime())) return null;
  const baseYear = reference.getUTCFullYear();
  const base = Date.UTC(baseYear, reference.getUTCMonth(), reference.getUTCDate());
  const sameYear = Date.UTC(baseYear, month - 1, day);
  const nextYear = Date.UTC(baseYear + 1, month - 1, day);
  const diffDays = Math.round((sameYear - base) / 86_400_000);
  if (diffDays >= -14 && diffDays <= 270) return baseYear;
  const nextDiffDays = Math.round((nextYear - base) / 86_400_000);
  if (nextDiffDays >= 0 && nextDiffDays <= 120) return baseYear + 1;
  return null;
}

function sourceDetails(analyses, limitCount) {
  return topGroups(groupBy(analyses, (item) => item.sourceKey), limitCount).map((group) => {
    const items = analyses.filter((item) => item.sourceKey === group.key);
    const domains = topGroups(groupBy(items, (item) => item.domain), 5);
    const first = items[0]?.row;
    return {
      source: group.key,
      count: group.count,
      domains,
      source_url_sample: first?.source_url ?? null,
      source_type: first?.tender_sources?.source_format ?? null,
      crawler_type: first?.tender_sources?.crawler_type ?? null,
      source_list_url: first?.tender_sources?.tender_list_url ?? first?.tender_sources?.url ?? null,
      html_success: items.filter((item) => item.fetch.htmlSuccess > 0).length,
      html_failed: items.filter((item) => item.fetch.htmlAttempts > 0 && item.fetch.htmlSuccess === 0).length,
      pdf_links_found: sum(items, (item) => item.fetch.pdfLinksFound),
      pdf_success: items.filter((item) => item.fetch.pdfSuccess > 0).length,
      image_pdf: sum(items, (item) => item.fetch.imagePdfCount),
      high: items.filter((item) => item.best?.confidence === "high").length,
      medium: items.filter((item) => item.best?.confidence === "medium").length,
      unknown: items.filter((item) => !item.best).length,
      failure_reasons: topGroups(groupBy(items.filter((item) => !item.best), (item) => item.failureReason), 5),
      examples: sampleAnalyses(items, 3)
    };
  });
}

function sampleAnalyses(items, size) {
  return items.slice(0, size).map((item) => ({
    id: item.row.id,
    title: item.row.title,
    agency_name: item.row.agency_name,
    source_name: item.sourceKey,
    domain: item.domain,
    source_url: item.row.source_url,
    deadline_at: item.best?.deadlineAt ?? null,
    deadline_status: item.best ? deadlineStatus(item.best.deadlineAt) : "unknown",
    confidence: item.best?.confidence ?? null,
    kind: item.best?.kind ?? null,
    extracted_from_url: item.best?.sourceUrl ?? null,
    extracted_from_type: item.best?.sourceType ?? null,
    evidence: item.best?.evidence ?? item.failureReason,
    documents: item.documents,
    fetch: item.fetch
  }));
}

function summarizeDocuments(documents) {
  return documents.map((document) => ({
    url: document.url,
    type: document.type,
    text_length: document.text?.length ?? 0,
    content_type: document.contentType ?? null
  })).slice(0, 10);
}

function topGroups(map, limitCount) {
  return Array.from(map.entries())
    .map(([key, items]) => ({ key, count: items.length }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
    .slice(0, limitCount);
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item) || "unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function compareCandidates(left, right) {
  const confidenceScore = { high: 3, medium: 2, low: 1 };
  return confidenceScore[right.confidence] - confidenceScore[left.confidence]
    || right.priority - left.priority
    || new Date(right.deadlineAt).getTime() - new Date(left.deadlineAt).getTime();
}

function detectDocumentType(sourceUrl, contentType, disposition, buffer) {
  const lowerUrl = String(sourceUrl ?? "").toLowerCase().split("?")[0];
  const lowerType = String(contentType ?? "").toLowerCase();
  const lowerDisposition = String(disposition ?? "").toLowerCase();
  const startsWithPdf = buffer.subarray(0, 5).toString("latin1") === "%PDF-";
  if (startsWithPdf || lowerType.includes("pdf") || lowerDisposition.includes(".pdf") || lowerUrl.endsWith(".pdf")) return "pdf";
  return "html";
}

function fileType(sourceUrl) {
  const lower = String(sourceUrl ?? "").toLowerCase().split("?")[0];
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".html") || lower.endsWith(".htm") || lower.endsWith("/")) return "html";
  return "html";
}

function attachmentUrls(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => item?.url).filter(Boolean);
}

function sourceName(row) {
  return row.source_name || row.tender_sources?.source_name || row.tender_sources?.name || "unknown_source";
}

function hostOf(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "unknown_domain";
  }
}

function safeUrl(value, base) {
  try {
    return new URL(value, base);
  } catch {
    return null;
  }
}

function decodeURIComponentSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function decodeHtml(buffer, contentType) {
  const declared = `${contentType} ${buffer.toString("latin1", 0, Math.min(buffer.length, 2000))}`.match(/charset\s*=\s*["']?([A-Za-z0-9_\-]+)/i)?.[1]?.toLowerCase();
  const encoding = declared && /shift|sjis|windows-31j|euc-jp/i.test(declared) ? "shift_jis" : "utf-8";
  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch {
    return buffer.toString("utf8");
  }
}

function htmlToText(html) {
  return cleanText(String(html ?? "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|li|tr|td|th|div|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))));
}

function cleanText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\r/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function containsDateLike(text) {
  return /令\s*和\s*(?:元|\d{1,2})\s*年\s*\d{1,2}\s*月\s*\d{1,2}|平成\s*(?:元|\d{1,2})\s*年\s*\d{1,2}\s*月\s*\d{1,2}|\bR\s*\d{1,2}[.\/\-年\s]+\d{1,2}[.\/\-月\s]+\d{1,2}\b|20\d{2}\s*年\s*\d{1,2}\s*月\s*\d{1,2}|20\d{2}[\/\-.]\d{1,2}[\/\-.]\d{1,2}|\d{1,2}\s*月\s*\d{1,2}\s*日|\d{1,2}[\/.]\d{1,2}/i.test(text);
}

function titleKeywords(title) {
  return cleanText(title)
    .split(/[、，,。\s・（）()【】「」『』]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .slice(0, 6);
}

function deadlineStatus(value) {
  const days = Math.round((jstDateOnlyTimestamp(new Date(value)) - jstDateOnlyTimestamp(new Date())) / 86_400_000);
  if (days < 0) return "expired";
  if (days <= 7) return "closing_soon";
  return "active";
}

function toIsoDate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day, 14, 59, 59));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString();
}

function normalizeIso(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function jstDateOnlyTimestamp(date) {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate());
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueUrls(values) {
  return uniqueBy(values.filter(Boolean), (value) => value);
}

function sum(items, mapper) {
  return items.reduce((total, item) => total + mapper(item), 0);
}

async function mapLimit(items, limitCount, worker) {
  const results = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limitCount, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  });
  await Promise.all(workers);
  return results;
}

function argValue(name) {
  const prefix = `${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
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
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
