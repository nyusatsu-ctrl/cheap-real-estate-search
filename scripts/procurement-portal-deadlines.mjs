#!/usr/bin/env node
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  classifyPortalUrl,
  dateOnly,
  fetchPortalDetailHtml,
  normalizePortalDetailUrl,
  parsePortalDetailHtml,
  portalDetailMatch,
  portalDetailSummary,
  procurementItemInfoIdFrom
} from "./procurement-portal-detail.mjs";

loadLocalEnv();

const url = process.env.TENDER_SUPABASE_URL;
const serviceRoleKey = process.env.TENDER_SUPABASE_SERVICE_ROLE_KEY;
const mode = argValue("--mode") ?? "analyze";
const shouldApply = mode === "apply";
const limit = positiveInt(argValue("--limit"), 5000);
const sampleSize = positiveInt(argValue("--sample"), 10);
const concurrency = positiveInt(argValue("--concurrency"), 4);
const fetchTimeoutMs = positiveInt(argValue("--fetch-timeout-ms"), 9000);
const PAGE_SIZE = 1000;

if (!url || !serviceRoleKey) {
  console.error("TENDER_SUPABASE_URL and TENDER_SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

async function main() {
  const targets = await readPortalUnknownTenders(limit);
  const analyses = await mapLimit(targets, concurrency, analyzeTender);
  const conflictById = await findApplyConflicts(analyses.filter((item) => item.updateCandidate));
  for (const analysis of analyses) {
    const conflict = conflictById.get(analysis.row.id);
    if (conflict) {
      analysis.applyConflict = conflict;
      analysis.updateCandidate = false;
      analysis.failureReason = `apply_conflict:${conflict.type}`;
    }
  }

  const updateCandidates = analyses.filter((item) => item.updateCandidate);
  const fetched = analyses.filter((item) => item.fetch.ok);
  const parsed = analyses.filter((item) => item.parsed);
  const matched = analyses.filter((item) => item.match?.confidence === "high");
  const certificate = analyses.filter((item) => item.parsed?.certificateDeadline);
  const bid = analyses.filter((item) => item.parsed?.bidDeadline);
  const publicEndOnly = analyses.filter((item) => item.parsed?.publicEndOnly);

  const summary = {
    event: shouldApply ? "procurement_portal_deadline_apply_plan" : mode === "dry_run" ? "procurement_portal_deadline_dry_run" : "procurement_portal_deadline_analysis",
    dry_run: !shouldApply,
    project_ref: projectRef(url),
    target_total: targets.length,
    url_format_counts: countBy(targets, (row) => classifyPortalUrl(row.source_url)),
    oaa0104_detail_url_count: targets.filter((row) => classifyPortalUrl(row.source_url) === "oaa0104_detail").length,
    procurement_item_info_id_count: targets.filter((row) => Boolean(detailIdFromRow(row))).length,
    search_or_list_url_count: targets.filter((row) => classifyPortalUrl(row.source_url) === "search_or_result_list").length,
    top_page_url_count: targets.filter((row) => classifyPortalUrl(row.source_url) === "top_page").length,
    external_case_number_count: analyses.filter((item) => item.parsed?.procurementCaseNumber).length,
    detail_url_restored_count: analyses.filter((item) => item.detailUrl).length,
    detail_fetch_success_count: fetched.length,
    detail_fetch_failure_count: analyses.filter((item) => item.detailUrl && !item.fetch.ok).length,
    detail_parse_success_count: parsed.length,
    high_match_count: matched.length,
    certificate_deadline_count: certificate.length,
    bid_deadline_count: bid.length,
    public_end_only_count: publicEndOnly.length,
    unresolved_count: analyses.filter((item) => !item.updateCandidate).length,
    update_candidate_count: updateCandidates.length,
    failure_reasons: countBy(analyses.filter((item) => !item.updateCandidate), (item) => item.failureReason ?? "not_update_candidate"),
    duplicate_conflict_count: analyses.filter((item) => item.applyConflict).length,
    representative_examples: {
      url_formats: sampleRows(targets, sampleSize),
      update_candidates: sampleAnalyses(updateCandidates, sampleSize),
      certificate_deadline: sampleAnalyses(certificate, sampleSize),
      bid_deadline: sampleAnalyses(bid, sampleSize),
      public_end_only: sampleAnalyses(publicEndOnly, sampleSize),
      no_detail_url: sampleAnalyses(analyses.filter((item) => item.failureReason === "detail_url_not_found"), sampleSize),
      fetch_failed: sampleAnalyses(analyses.filter((item) => item.failureReason === "detail_fetch_failed"), sampleSize),
      match_failed: sampleAnalyses(analyses.filter((item) => item.failureReason === "title_or_agency_match_not_high"), sampleSize),
      conflicts: sampleAnalyses(analyses.filter((item) => item.applyConflict), sampleSize)
    },
    safety_checks: {
      public_end_not_used_as_deadline: true,
      opening_datetime_only_kept_unknown: true,
      high_confidence_match_required: true,
      archived_tenders: 0,
      existing_deadlines_not_overwritten: true
    }
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!shouldApply) return;

  let updated = 0;
  const errors = [];
  for (const analysis of updateCandidates) {
    const payload = buildUpdatePayload(analysis);
    if (!Object.keys(payload).length) continue;
    const { error } = await supabase
      .from("tenders")
      .update(payload)
      .eq("id", analysis.row.id)
      .is("deadline_at", null)
      .is("bid_at", null);
    if (error) errors.push({ id: analysis.row.id, source_url: analysis.row.source_url, error: error.message });
    else updated += 1;
  }

  console.log(JSON.stringify({
    event: "procurement_portal_deadline_apply_result",
    project_ref: projectRef(url),
    updated_tenders: updated,
    archived_tenders: 0,
    error_count: errors.length,
    errors: errors.slice(0, 10)
  }, null, 2));
}

async function readPortalUnknownTenders(limitRows) {
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
    rows.push(...(data ?? []).filter(isProcurementPortalTender));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows.slice(0, limitRows);
}

function isProcurementPortalTender(row) {
  const haystack = [
    row.source_url,
    row.pdf_url,
    row.source_name,
    row.tender_sources?.name,
    row.tender_sources?.source_name,
    row.tender_sources?.url,
    row.tender_sources?.base_url
  ].filter(Boolean).join(" ");
  return /p-portal\.go\.jp|調達ポータル/.test(haystack);
}

async function analyzeTender(row) {
  const detailUrl = restoreDetailUrl(row);
  const analysis = {
    row,
    detailUrl,
    sourceUrlFormat: classifyPortalUrl(row.source_url),
    fetch: { ok: false, status: null, error: null, finalUrl: null },
    parsed: null,
    match: null,
    updateCandidate: false,
    failureReason: null,
    applyConflict: null
  };

  if (!detailUrl) {
    analysis.failureReason = "detail_url_not_found";
    return analysis;
  }

  const fetched = await fetchPortalDetailHtml(detailUrl, { timeoutMs: fetchTimeoutMs, referer: row.source_url });
  analysis.fetch = { ok: fetched.ok, status: fetched.status, error: fetched.error, finalUrl: fetched.url };
  if (!fetched.ok) {
    analysis.failureReason = "detail_fetch_failed";
    return analysis;
  }

  const parsed = parsePortalDetailHtml(fetched.html, detailUrl);
  analysis.parsed = parsed;
  if (!parsed.title || !parsed.procurementCaseNumber) {
    analysis.failureReason = "detail_parse_missing_required_fields";
    return analysis;
  }

  const match = portalDetailMatch(parsed, row);
  analysis.match = match;
  if (match.confidence !== "high") {
    analysis.failureReason = "title_or_agency_match_not_high";
    return analysis;
  }

  if (!parsed.certificateDeadline && !parsed.bidDeadline) {
    analysis.failureReason = parsed.openingAt ? "opening_datetime_only" : parsed.publicEndOnly ? "public_end_only" : "no_participation_or_bid_deadline";
    return analysis;
  }

  analysis.updateCandidate = true;
  return analysis;
}

function restoreDetailUrl(row) {
  const direct = normalizePortalDetailUrl(row.source_url);
  if (direct) return direct;
  for (const value of [
    row.pdf_url,
    row.raw_text,
    row.detail_memo,
    JSON.stringify(row.attachments ?? [])
  ]) {
    const restored = normalizePortalDetailUrl(value);
    if (restored) return restored;
  }
  return null;
}

function detailIdFromRow(row) {
  return procurementItemInfoIdFrom(row.source_url)
    ?? procurementItemInfoIdFrom(row.pdf_url)
    ?? procurementItemInfoIdFrom(row.raw_text)
    ?? procurementItemInfoIdFrom(row.detail_memo)
    ?? procurementItemInfoIdFrom(JSON.stringify(row.attachments ?? []));
}

async function findApplyConflicts(candidates) {
  const conflictById = new Map();
  for (const analysis of candidates) {
    const deadlineAt = analysis.parsed?.certificateDeadline?.iso ?? null;
    const detailUrl = analysis.detailUrl;
    if (detailUrl && detailUrl !== analysis.row.source_url) {
      const { data, error } = await supabase
        .from("tenders")
        .select("id,source_url")
        .eq("source_url", detailUrl)
        .neq("id", analysis.row.id)
        .limit(3);
      if (error) conflictById.set(analysis.row.id, { type: "source_url_conflict_check_failed", error: error.message });
      else if (data?.length) conflictById.set(analysis.row.id, { type: "source_url_conflict", conflicting_ids: data.map((row) => row.id) });
    }
    if (deadlineAt) {
      const { data, error } = await supabase
        .from("tenders")
        .select("id,title,agency_name,deadline_at,source_url")
        .eq("agency_name", analysis.row.agency_name)
        .eq("title", analysis.row.title)
        .eq("deadline_at", deadlineAt)
        .neq("id", analysis.row.id)
        .limit(3);
      if (error) conflictById.set(analysis.row.id, { type: "deadline_conflict_check_failed", error: error.message });
      else if (data?.length) conflictById.set(analysis.row.id, {
        type: "existing_tender_same_agency_title_deadline",
        deadline_at: deadlineAt,
        conflicting_ids: data.map((row) => row.id)
      });
    }
  }
  return conflictById;
}

function buildUpdatePayload(analysis) {
  const parsed = analysis.parsed;
  const row = analysis.row;
  const deadlineAt = parsed.certificateDeadline?.iso ?? null;
  const bidAt = parsed.bidDeadline?.iso ?? null;
  const payload = {};
  if (deadlineAt) payload.deadline_at = deadlineAt;
  if (bidAt) payload.bid_at = bidAt;
  if (!row.published_at && parsed.publicStartAt) payload.published_at = parsed.publicStartAt;
  if (analysis.detailUrl && analysis.detailUrl !== row.source_url) payload.source_url = analysis.detailUrl;
  const attachments = mergeAttachments(row.attachments, parsed.documents);
  if (attachments.length) payload.attachments = attachments;
  payload.detail_memo = appendPortalMemo(row.detail_memo, parsed);
  payload.is_deadline_soon = isDeadlineSoon(deadlineAt ?? bidAt);
  return payload;
}

function mergeAttachments(existing, documents) {
  const rows = Array.isArray(existing) ? existing : [];
  const map = new Map(rows.filter((item) => item?.url).map((item) => [item.url, item]));
  for (const document of documents ?? []) {
    if (!document.url || map.has(document.url)) continue;
    map.set(document.url, {
      title: document.title,
      url: document.url,
      file_type: fileType(document.url),
      label: document.label,
      source_text: "調達ポータル詳細ページ"
    });
  }
  return [...map.values()];
}

function appendPortalMemo(existing, parsed) {
  const summary = portalDetailSummary(parsed);
  if (!summary) return existing ?? null;
  const current = String(existing ?? "").trim();
  const line = `調達ポータル詳細解析: ${summary}`;
  if (current.includes("調達ポータル詳細解析:")) return current;
  return current ? `${current}\n\n${line}` : line;
}

function fileType(value) {
  const lower = String(value ?? "").toLowerCase().split("?")[0];
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".xls") || lower.endsWith(".xlsx")) return "excel";
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) return "word";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  return "unknown";
}

function isDeadlineSoon(value) {
  if (!value) return false;
  const today = jstDateOnlyTimestamp(new Date());
  const target = jstDateOnlyTimestamp(new Date(value));
  const days = Math.round((target - today) / 86_400_000);
  return days >= 0 && days <= 7;
}

function jstDateOnlyTimestamp(date) {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate());
}

function sampleRows(rows, size) {
  return rows.slice(0, size).map((row) => ({
    id: row.id,
    title: row.title,
    agency_name: row.agency_name,
    source_name: row.source_name ?? row.tender_sources?.source_name ?? row.tender_sources?.name ?? null,
    source_url: row.source_url,
    url_format: classifyPortalUrl(row.source_url),
    procurementItemInfoId: detailIdFromRow(row),
    published_at: row.published_at
  }));
}

function sampleAnalyses(items, size) {
  return items.slice(0, size).map((item) => ({
    id: item.row.id,
    title: item.row.title,
    agency_name: item.row.agency_name,
    source_url: item.row.source_url,
    detail_url: item.detailUrl,
    url_format: item.sourceUrlFormat,
    fetch: item.fetch,
    parsed: item.parsed ? {
      procurementItemInfoId: item.parsed.procurementItemInfoId,
      procurementCaseNumber: item.parsed.procurementCaseNumber,
      title: item.parsed.title,
      agency: item.parsed.agency,
      publicStart: dateOnly(item.parsed.publicStartAt),
      publicEnd: dateOnly(item.parsed.publicEndAt),
      certificateDeadline: item.parsed.certificateDeadline,
      bidDeadline: item.parsed.bidDeadline,
      openingAt: item.parsed.openingAt,
      documentCount: item.parsed.documents.length
    } : null,
    match: item.match,
    updateCandidate: item.updateCandidate,
    failureReason: item.failureReason,
    applyConflict: item.applyConflict
  }));
}

function countBy(items, mapper) {
  const counts = {};
  for (const item of items) {
    const key = mapper(item) ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
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

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function argValue(name) {
  const prefix = `${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
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
