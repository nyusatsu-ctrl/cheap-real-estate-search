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
  procurementItemInfoIdFrom,
  sourceAvailabilityFromPublicEnd
} from "./procurement-portal-detail.mjs";

loadLocalEnv();

const url = process.env.TENDER_SUPABASE_URL;
const serviceRoleKey = process.env.TENDER_SUPABASE_SERVICE_ROLE_KEY;
const mode = argValue("--mode") ?? "dry_run";
const shouldApply = mode === "apply";
const limit = positiveInt(argValue("--limit"), 5000);
const sampleSize = positiveInt(argValue("--sample"), 10);
const concurrency = positiveInt(argValue("--concurrency"), 4);
const fetchTimeoutMs = positiveInt(argValue("--fetch-timeout-ms"), 9000);
const PAGE_SIZE = 1000;
const TODAY = jstDateOnly(new Date());

if (!url || !serviceRoleKey) {
  console.error("TENDER_SUPABASE_URL and TENDER_SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

async function main() {
  const rows = await readPublishedTenders(limit);
  const analyses = await mapLimit(rows.filter(isProcurementPortalTender), concurrency, analyzePortalTender);
  const allAnalyses = mergeAnalyses(rows, analyses);
  const updateCandidates = analyses.filter((item) => item.updateCandidate);
  const unknownRows = allAnalyses.filter((item) => item.deadlineStatus === "unknown");
  const portalUnknownRows = unknownRows.filter((item) => item.isPortal);

  const summary = {
    event: shouldApply ? "procurement_portal_availability_apply_plan" : "procurement_portal_availability_dry_run",
    dry_run: !shouldApply,
    project_ref: projectRef(url),
    all_public_tenders: rows.length,
    deadline_status_counts: countBy(allAnalyses, (item) => item.deadlineStatus),
    source_availability_counts: countBy(allAnalyses, (item) => item.projectedAvailability.status),
    source_closed_count: allAnalyses.filter((item) => item.projectedAvailability.status === "source_closed").length,
    additional_hidden_from_normal_count: allAnalyses.filter((item) => wouldBeNormallyVisible(item.deadlineStatus, item.currentAvailability.status) && item.projectedAvailability.status === "source_closed").length,
    listed_but_deadline_unknown_count: allAnalyses.filter((item) => item.deadlineStatus === "unknown" && item.projectedAvailability.status === "source_open").length,
    source_and_deadline_unknown_count: allAnalyses.filter((item) => item.deadlineStatus === "unknown" && item.projectedAvailability.status === "source_unknown").length,
    unknown_analysis: {
      unknown_total: unknownRows.length,
      procurement_portal_unknown_count: portalUnknownRows.length,
      portal_public_end_known_count: portalUnknownRows.filter((item) => item.projectedAvailability.publicEnd).length,
      public_end_before_count: portalUnknownRows.filter((item) => item.projectedAvailability.publicEnd && item.projectedAvailability.publicEnd < TODAY).length,
      public_end_today_count: portalUnknownRows.filter((item) => item.projectedAvailability.publicEnd === TODAY).length,
      public_end_future_count: portalUnknownRows.filter((item) => item.projectedAvailability.publicEnd && item.projectedAvailability.publicEnd > TODAY).length,
      public_end_unknown_count: portalUnknownRows.filter((item) => !item.projectedAvailability.publicEnd).length,
      non_portal_unknown_count: unknownRows.filter((item) => !item.isPortal).length
    },
    portal_detail_fetch: {
      attempted_count: analyses.filter((item) => item.detailUrl).length,
      success_count: analyses.filter((item) => item.fetch.ok).length,
      failure_count: analyses.filter((item) => item.detailUrl && !item.fetch.ok).length,
      retry_attempt_rows: analyses.filter((item) => (item.fetch.attempts ?? 1) > 1).length,
      http_409_rows: analyses.filter((item) => item.fetch.status === 409).length,
      failure_reasons: countBy(analyses.filter((item) => item.failureReason), (item) => item.failureReason)
    },
    update_candidate_count: updateCandidates.length,
    deadline_updates: 0,
    archived_tenders: 0,
    representative_examples: {
      source_closed: sampleAnalyses(allAnalyses.filter((item) => item.projectedAvailability.status === "source_closed"), sampleSize),
      source_open_deadline_unknown: sampleAnalyses(allAnalyses.filter((item) => item.deadlineStatus === "unknown" && item.projectedAvailability.status === "source_open"), sampleSize),
      source_unknown_deadline_unknown: sampleAnalyses(allAnalyses.filter((item) => item.deadlineStatus === "unknown" && item.projectedAvailability.status === "source_unknown"), sampleSize),
      public_end_before: sampleAnalyses(portalUnknownRows.filter((item) => item.projectedAvailability.publicEnd && item.projectedAvailability.publicEnd < TODAY), sampleSize),
      public_end_today: sampleAnalyses(portalUnknownRows.filter((item) => item.projectedAvailability.publicEnd === TODAY), sampleSize),
      public_end_future: sampleAnalyses(portalUnknownRows.filter((item) => item.projectedAvailability.publicEnd && item.projectedAvailability.publicEnd > TODAY), sampleSize),
      public_end_unknown: sampleAnalyses(portalUnknownRows.filter((item) => !item.projectedAvailability.publicEnd), sampleSize),
      update_candidates: sampleAnalyses(updateCandidates, sampleSize),
      fetch_failed: sampleAnalyses(analyses.filter((item) => item.failureReason === "detail_fetch_failed"), sampleSize)
    },
    safety_checks: {
      public_end_not_written_to_deadline_at_or_bid_at: true,
      source_closed_not_archived: true,
      high_confidence_match_required: true,
      deadline_unknown_label_kept: true
    }
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!shouldApply) return;

  let updated = 0;
  const errors = [];
  for (const analysis of updateCandidates) {
    const { error } = await supabase
      .from("tenders")
      .update({ detail_memo: analysis.nextDetailMemo, updated_at: new Date().toISOString() })
      .eq("id", analysis.row.id);
    if (error) {
      errors.push({ id: analysis.row.id, title: analysis.row.title, error: error.message });
    } else {
      updated += 1;
    }
  }

  console.log(JSON.stringify({
    event: "procurement_portal_availability_apply_result",
    project_ref: projectRef(url),
    updated_tenders: updated,
    deadline_updates: 0,
    archived_tenders: 0,
    error_count: errors.length,
    errors: errors.slice(0, 10)
  }, null, 2));
}

async function readPublishedTenders(limitRows) {
  const rows = [];
  for (let page = 0; rows.length < limitRows && page < 20; page += 1) {
    const from = page * PAGE_SIZE;
    const to = Math.min(from + PAGE_SIZE - 1, limitRows - 1);
    const { data, error } = await supabase
      .from("tenders")
      .select("id,title,agency_name,source_name,original_label,published_at,deadline_at,bid_at,source_url,pdf_url,attachments,raw_text,detail_memo,required_qualification,status,is_deadline_soon,fetched_at,created_at,updated_at,tender_sources(name,source_name,url,tender_list_url,base_url,organization_type,crawler_type,source_format,last_crawled_at,last_error_message)")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(`tenders: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows.slice(0, limitRows);
}

async function analyzePortalTender(row) {
  const detailUrl = restoreDetailUrl(row);
  const base = baseAnalysis(row, true);
  const analysis = {
    ...base,
    detailUrl,
    fetch: { ok: false, status: null, error: null, finalUrl: null, attempts: 0 },
    parsed: null,
    match: null,
    updateCandidate: false,
    nextDetailMemo: row.detail_memo ?? null,
    failureReason: null
  };

  if (!detailUrl) {
    analysis.failureReason = "detail_url_not_found";
    return analysis;
  }

  const fetched = await fetchPortalDetailHtml(detailUrl, { timeoutMs: fetchTimeoutMs, referer: row.source_url, retries: 3 });
  analysis.fetch = {
    ok: fetched.ok,
    status: fetched.status,
    error: fetched.error,
    finalUrl: fetched.url,
    attempts: fetched.attempts ?? 1
  };
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

  const publicEnd = dateOnly(parsed.publicEndAt);
  if (!publicEnd) {
    analysis.failureReason = "public_end_not_found";
    return analysis;
  }

  analysis.projectedAvailability = sourceAvailability(publicEnd);
  analysis.nextDetailMemo = appendAvailabilityMemo(row.detail_memo, parsed);
  analysis.updateCandidate = analysis.nextDetailMemo !== (row.detail_memo ?? null);
  if (!analysis.updateCandidate) analysis.failureReason = "availability_already_saved";
  return analysis;
}

function mergeAnalyses(rows, portalAnalyses) {
  const byId = new Map(portalAnalyses.map((item) => [item.row.id, item]));
  return rows.map((row) => byId.get(row.id) ?? baseAnalysis(row, false));
}

function baseAnalysis(row, isPortal = isProcurementPortalTender(row)) {
  const currentAvailability = existingAvailability(row.detail_memo);
  return {
    row,
    isPortal,
    deadlineStatus: deadlineStatus(row),
    currentAvailability,
    projectedAvailability: currentAvailability,
    detailUrl: null,
    fetch: { ok: false, status: null, error: null, finalUrl: null, attempts: 0 },
    parsed: null,
    match: null,
    updateCandidate: false,
    nextDetailMemo: row.detail_memo ?? null,
    failureReason: null
  };
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

function appendAvailabilityMemo(existing, parsed) {
  const publicEnd = dateOnly(parsed.publicEndAt);
  if (!publicEnd) return existing ?? null;
  const current = String(existing ?? "").trim();
  const summary = portalDetailSummary(parsed);
  const line = summary
    ? `調達ポータル詳細解析: ${summary}`
    : `調達ポータル掲載状態: 調達ポータル公開終了日=${publicEnd}`;
  if (current.includes(`調達ポータル公開終了日=${publicEnd}`)) return current || null;
  return current ? `${current}\n\n${line}` : line;
}

function deadlineStatus(row) {
  if (row.status === "archived") return "archived";
  const value = normalizeIso(row.deadline_at) ?? normalizeIso(row.bid_at);
  if (!value) return "unknown";
  const days = daysUntil(value);
  if (days < 0) return "expired";
  if (days <= 7) return "closing_soon";
  return "active";
}

function existingAvailability(detailMemo) {
  const publicEnd = String(detailMemo ?? "").match(/調達ポータル公開終了日=(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
  return sourceAvailability(publicEnd);
}

function sourceAvailability(publicEnd) {
  const assessed = sourceAvailabilityFromPublicEnd(publicEnd);
  return {
    status: assessed.status,
    publicEnd: assessed.publicEnd
  };
}

function wouldBeNormallyVisible(deadline, sourceStatus) {
  return deadline !== "expired" && deadline !== "archived" && sourceStatus !== "source_closed";
}

function normalizeIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function daysUntil(value) {
  const target = jstDateOnly(new Date(value));
  const today = TODAY;
  return Math.round((Date.parse(`${target}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

function jstDateOnly(date) {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}-${String(jst.getUTCDate()).padStart(2, "0")}`;
}

function sampleAnalyses(items, size) {
  return items.slice(0, size).map((item) => ({
    id: item.row.id,
    title: item.row.title,
    agency_name: item.row.agency_name,
    source_name: item.row.source_name ?? item.row.tender_sources?.source_name ?? item.row.tender_sources?.name ?? null,
    source_url: item.row.source_url,
    url_format: classifyPortalUrl(item.row.source_url),
    procurementItemInfoId: detailIdFromRow(item.row),
    deadline_status: item.deadlineStatus,
    current_source_availability: item.currentAvailability,
    projected_source_availability: item.projectedAvailability,
    fetch: item.fetch,
    parsed: item.parsed ? {
      procurementItemInfoId: item.parsed.procurementItemInfoId,
      procurementCaseNumber: item.parsed.procurementCaseNumber,
      title: item.parsed.title,
      agency: item.parsed.agency,
      publicStart: dateOnly(item.parsed.publicStartAt),
      publicEnd: dateOnly(item.parsed.publicEndAt),
      certificateDeadline: item.parsed.certificateDeadline?.iso ?? null,
      bidDeadline: item.parsed.bidDeadline?.iso ?? null
    } : null,
    match: item.match,
    updateCandidate: item.updateCandidate,
    failureReason: item.failureReason
  }));
}

function detailIdFromRow(row) {
  return procurementItemInfoIdFrom(row.source_url)
    ?? procurementItemInfoIdFrom(row.pdf_url)
    ?? procurementItemInfoIdFrom(row.raw_text)
    ?? procurementItemInfoIdFrom(row.detail_memo)
    ?? procurementItemInfoIdFrom(JSON.stringify(row.attachments ?? []));
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
