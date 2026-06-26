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
const mode = argValue("--mode") ?? "dry_run";
const shouldApply = mode === "apply";
const limit = positiveInt(argValue("--limit"), 5000);
const sampleSize = positiveInt(argValue("--sample"), 10);
const maxLinksPerTender = positiveInt(argValue("--max-links-per-tender"), 3);
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
  const grouped = groupAnalyses(analyses);
  const highConfidence = grouped.high.filter((item) => item.best?.deadlineAt);
  const expiredHighConfidence = highConfidence.filter((item) => deadlineStatus(item.best.deadlineAt) === "expired");

  const summary = {
    event: shouldApply ? "tender_deadline_refetch_apply_plan" : "tender_deadline_refetch_dry_run",
    dry_run: !shouldApply,
    project_ref: projectRef(url),
    unknown_target_total: unknownTenders.length,
    html_fetch_success_count: analyses.filter((item) => item.fetch.htmlSuccess > 0).length,
    pdf_fetch_success_count: analyses.filter((item) => item.fetch.pdfSuccess > 0).length,
    html_fetch_attempt_count: sum(analyses, (item) => item.fetch.htmlAttempts),
    pdf_fetch_attempt_count: sum(analyses, (item) => item.fetch.pdfAttempts),
    high_confidence_extract_count: grouped.high.length,
    medium_confidence_count: grouped.medium.length,
    low_confidence_count: grouped.low.length,
    still_unknown_count: grouped.unknown.length,
    expired_after_apply_count: expiredHighConfidence.length,
    forbidden_rejected_count: grouped.forbidden.length,
    samples: {
      high: sampleAnalyses(grouped.high, sampleSize),
      medium: sampleAnalyses(grouped.medium, sampleSize),
      low: sampleAnalyses(grouped.low, sampleSize),
      still_unknown: sampleAnalyses(grouped.unknown, sampleSize),
      forbidden_rejected: sampleForbidden(grouped.forbidden, sampleSize)
    },
    safety_checks: {
      only_high_confidence_will_be_applied: true,
      published_at_is_not_used_as_deadline: true,
      forbidden_labels_not_applied: ["履行期限", "納入期限", "納期", "契約期間", "公告日", "掲載日", "更新日", "質問受付期限"],
      archived_tenders: 0
    }
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!shouldApply) return;

  let updated = 0;
  const errors = [];
  for (const analysis of highConfidence) {
    const deadlineAt = analysis.best.deadlineAt;
    const { error } = await supabase.from("tenders").update({
      deadline_at: deadlineAt,
      bid_at: deadlineAt,
      is_deadline_soon: deadlineStatus(deadlineAt) === "closing_soon"
    }).eq("id", analysis.row.id).is("deadline_at", null).is("bid_at", null);
    if (error) {
      errors.push({ id: analysis.row.id, error: error.message });
    } else {
      updated += 1;
    }
  }

  console.log(JSON.stringify({
    event: "tender_deadline_refetch_apply_result",
    project_ref: projectRef(url),
    updated_tenders: updated,
    archived_tenders: 0,
    error_count: errors.length,
    errors: errors.slice(0, 10)
  }, null, 2));
}

async function readUnknownPublishedTenders(limitRows) {
  const rows = [];
  for (let page = 0; rows.length < limitRows && page < 20; page += 1) {
    const from = page * PAGE_SIZE;
    const to = Math.min(from + PAGE_SIZE - 1, limitRows - 1);
    const { data, error } = await supabase
      .from("tenders")
      .select("id,title,agency_name,source_name,original_label,published_at,deadline_at,bid_at,source_url,pdf_url,attachments,raw_text,detail_memo,required_qualification,status,is_deadline_soon,fetched_at,created_at,updated_at")
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
  const fetchStats = { htmlAttempts: 0, htmlSuccess: 0, pdfAttempts: 0, pdfSuccess: 0, errors: [] };
  const documents = [];
  const forbidden = [];
  const baseText = [row.title, row.original_label, row.raw_text, row.detail_memo, row.required_qualification].filter(Boolean).join("\n");
  collectForbiddenContexts(baseText, row.source_url).forEach((item) => forbidden.push(item));
  documents.push({
    url: "db:stored_text",
    type: "db",
    text: baseText,
    fetched: Boolean(baseText.trim())
  });

  const initialUrls = uniqueUrls([
    row.source_url,
    row.pdf_url,
    ...attachmentUrls(row.attachments)
  ]).slice(0, 4);

  const queued = [];
  for (const sourceUrl of initialUrls) {
    const fetched = await fetchDocument(sourceUrl, fetchStats);
    if (fetched) {
      documents.push(fetched);
      collectForbiddenContexts(fetched.text, fetched.url).forEach((item) => forbidden.push(item));
      if (fetched.type === "html") {
        queued.push(...relatedLinks(fetched.html ?? "", fetched.url, row));
      }
    }
  }

  for (const sourceUrl of uniqueUrls(queued).slice(0, maxLinksPerTender)) {
    if (initialUrls.includes(sourceUrl)) continue;
    const fetched = await fetchDocument(sourceUrl, fetchStats);
    if (fetched) {
      documents.push(fetched);
      collectForbiddenContexts(fetched.text, fetched.url).forEach((item) => forbidden.push(item));
    }
  }

  const referenceDate = normalizeIso(row.published_at) ?? normalizeIso(row.fetched_at) ?? normalizeIso(row.created_at) ?? normalizeIso(row.updated_at);
  const candidates = documents.flatMap((document) => extractDeadlineCandidates(document.text, referenceDate, document.url, document.type));
  const sorted = candidates.sort(compareCandidates);
  const best = sorted[0] ?? null;
  const confidence = best?.confidence ?? null;
  const failureReason = best
    ? null
    : fetchStats.htmlSuccess + fetchStats.pdfSuccess === 0
      ? "元HTML/PDFを取得できず、保存済みテキストにも参加・提出期限がありませんでした。"
      : "取得できたHTML/PDF内でhigh confidenceの参加・提出期限を特定できませんでした。";

  return { row, candidates: sorted, best, confidence, forbidden, fetch: fetchStats, failureReason };
}

async function fetchDocument(sourceUrl, stats) {
  const type = fileType(sourceUrl);
  if (type === "pdf") stats.pdfAttempts += 1;
  else stats.htmlAttempts += 1;
  try {
    const response = await fetchWithTimeout(sourceUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    const buffer = Buffer.from(await response.arrayBuffer());
    const detectedType = type === "pdf" || contentType.includes("pdf") ? "pdf" : "html";
    if (detectedType === "pdf") {
      const text = await pdfToText(buffer);
      stats.pdfSuccess += 1;
      return { url: sourceUrl, type: "pdf", text, html: null, fetched: true };
    }
    const html = decodeHtml(buffer, contentType);
    stats.htmlSuccess += 1;
    return { url: sourceUrl, type: "html", text: htmlToText(html), html, fetched: true };
  } catch (error) {
    stats.errors.push({
      url: sourceUrl,
      type,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

async function fetchWithTimeout(sourceUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
  try {
    return await fetch(sourceUrl, {
      signal: controller.signal,
      headers: {
        "user-agent": "EcoLoopTenderDeadlineChecker/1.0",
        accept: "text/html,application/pdf,*/*;q=0.8"
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
    const { stdout } = await execFileAsync("pdftotext", ["-layout", tmpPath, "-"], {
      timeout: Math.max(1000, fetchTimeoutMs)
    });
    const text = cleanText(stdout);
    if (text) return text;
  } catch {
    // Fall back to a low-fidelity PDF string extraction below.
  } finally {
    await fs.promises.rm(tmpPath, { force: true }).catch(() => {});
  }
  return cleanText(buffer.toString("latin1").replace(/\\([()\\])/g, "$1").replace(/\\[rn]/g, "\n"));
}

function extractDeadlineCandidates(text, referenceDate, sourceUrl, sourceType) {
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
          priority: definition.priority,
          isEstimated: date.isEstimated
        });
      }
    }
  }
  return candidates;
}

const DEADLINE_DEFINITIONS = [
  { label: "競争参加資格確認申請書提出期限", priority: 400, confidence: "high", kind: "participation_application_deadline" },
  { label: "競争参加資格確認資料提出期限", priority: 400, confidence: "high", kind: "participation_application_deadline" },
  { label: "競争参加資格確認申請期限", priority: 395, confidence: "high", kind: "participation_application_deadline" },
  { label: "参加資格確認申請書提出期限", priority: 390, confidence: "high", kind: "participation_application_deadline" },
  { label: "参加申請期限", priority: 380, confidence: "high", kind: "participation_application_deadline" },
  { label: "参加表明書提出期限", priority: 380, confidence: "high", kind: "participation_application_deadline" },
  { label: "入札書提出期限", priority: 330, confidence: "high", kind: "bid_submission_deadline" },
  { label: "見積書提出期限", priority: 330, confidence: "high", kind: "quote_submission_deadline" },
  { label: "見積提出期限", priority: 325, confidence: "high", kind: "quote_submission_deadline" },
  { label: "企画提案書提出期限", priority: 320, confidence: "high", kind: "proposal_submission_deadline" },
  { label: "提案書提出期限", priority: 315, confidence: "high", kind: "proposal_submission_deadline" },
  { label: "応募締切", priority: 300, confidence: "high", kind: "application_deadline" },
  { label: "申込期限", priority: 295, confidence: "high", kind: "application_deadline" },
  { label: "申込み期限", priority: 295, confidence: "high", kind: "application_deadline" },
  { label: "受付期限", priority: 285, confidence: "high", kind: "reception_deadline" },
  { label: "提出期限", priority: 260, confidence: "high", kind: "submission_deadline", requiredContext: /入札書|見積書|見積書等|提案書|企画提案|参加|資格|証明書|申請|応募|提出書類/ },
  { label: "入札日時", priority: 180, confidence: "medium", kind: "bid_datetime" },
  { label: "見積合わせ日時", priority: 175, confidence: "medium", kind: "quote_matching_datetime" },
  { label: "見積日時", priority: 170, confidence: "medium", kind: "quote_datetime" },
  { label: "開札日時", priority: 120, confidence: "medium", kind: "opening_datetime" }
];

const FORBIDDEN_CONTEXT = /履行期限|履行期間|納入期限|納期|納入期間|契約期間|公告日|公示日|掲載日|公開日|更新日|質問書|質問期限|質問受付|質問回答|質問締切/;

function isDateCloseToLabel(context, label, matchedText) {
  const labelIndex = context.indexOf(label);
  const dateIndex = context.indexOf(matchedText, Math.max(0, labelIndex));
  if (labelIndex < 0 || dateIndex < 0) return false;
  const between = context.slice(labelIndex + label.length, dateIndex);
  if (between.length > 70) return false;
  if (/までの期間|から|以降|停止等措置|要領|制定|付け|平成\d/.test(between)) return false;
  return true;
}

function collectForbiddenContexts(text, sourceUrl) {
  const normalized = cleanText(text);
  const rows = [];
  for (const context of contextWindows(normalized)) {
    if (!FORBIDDEN_CONTEXT.test(context)) continue;
    if (!parseDates(context, null).length) continue;
    rows.push({ sourceUrl, evidence: context.slice(0, 220) });
  }
  return rows;
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

function relatedLinks(html, pageUrl, row) {
  const titleTokens = titleKeywords(row.title);
  const links = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = match[1] ?? "";
    const href = attrs.match(/\bhref\s*=\s*["']?([^"'\s>]+)/i)?.[1];
    if (!href) continue;
    let linkUrl;
    try {
      linkUrl = new URL(href, pageUrl);
      const page = new URL(pageUrl);
      if (linkUrl.hostname !== page.hostname) continue;
    } catch {
      continue;
    }
    const text = cleanText(htmlToText(match[2] ?? ""));
    const target = `${text} ${linkUrl.href}`.normalize("NFKC");
    const relevant = /公告|入札|見積|オープンカウンター|仕様書|説明書|添付|調達案件|pdf|koukoku|nyusatu|bid|open|mitumori|choutatsu/i.test(target)
      || titleTokens.some((token) => target.includes(token));
    if (!relevant) continue;
    if (!["html", "pdf"].includes(fileType(linkUrl.href))) continue;
    links.push(linkUrl.href);
  }
  return links;
}

function attachmentUrls(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => item?.url).filter(Boolean);
}

function compareCandidates(left, right) {
  const confidenceScore = { high: 3, medium: 2, low: 1 };
  return confidenceScore[right.confidence] - confidenceScore[left.confidence]
    || right.priority - left.priority
    || new Date(right.deadlineAt).getTime() - new Date(left.deadlineAt).getTime();
}

function groupAnalyses(analyses) {
  return {
    high: analyses.filter((item) => item.best?.confidence === "high"),
    medium: analyses.filter((item) => item.best?.confidence === "medium"),
    low: analyses.filter((item) => item.best?.confidence === "low"),
    unknown: analyses.filter((item) => !item.best),
    forbidden: analyses.flatMap((item) => item.forbidden.map((forbidden) => ({ row: item.row, forbidden })))
  };
}

function sampleAnalyses(items, size) {
  return items.slice(0, size).map((item) => ({
    id: item.row.id,
    title: item.row.title,
    agency_name: item.row.agency_name,
    source_url: item.row.source_url,
    deadline_at: item.best?.deadlineAt ?? null,
    deadline_status: item.best ? deadlineStatus(item.best.deadlineAt) : "unknown",
    confidence: item.best?.confidence ?? null,
    kind: item.best?.kind ?? null,
    extracted_from_url: item.best?.sourceUrl ?? null,
    extracted_from_type: item.best?.sourceType ?? null,
    evidence: item.best?.evidence ?? item.failureReason,
    fetch: item.fetch
  }));
}

function sampleForbidden(items, size) {
  return items.slice(0, size).map((item) => ({
    id: item.row.id,
    title: item.row.title,
    agency_name: item.row.agency_name,
    source_url: item.forbidden.sourceUrl,
    rejected_evidence: item.forbidden.evidence,
    reason: "履行期限・納入期限・公告日・質問期限などは参加期限として採用しません。"
  }));
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

function titleKeywords(title) {
  return cleanText(title)
    .split(/[、，,。\s・（）()【】「」『』]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .slice(0, 6);
}

function fileType(sourceUrl) {
  const lower = String(sourceUrl ?? "").toLowerCase().split("?")[0];
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".html") || lower.endsWith(".htm") || lower.endsWith("/")) return "html";
  return "html";
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

function argValue(name) {
  const prefix = `${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function projectRef(value) {
  try {
    return new URL(value).hostname.split(".")[0];
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
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
