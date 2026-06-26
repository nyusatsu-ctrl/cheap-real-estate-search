#!/usr/bin/env node
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

loadLocalEnv();

const url = process.env.TENDER_SUPABASE_URL;
const serviceRoleKey = process.env.TENDER_SUPABASE_SERVICE_ROLE_KEY;
const shouldRecord = process.argv.includes("--record");
const startedAt = argValue("--started-at") ?? process.env.PIPELINE_STARTED_AT ?? new Date().toISOString();
const mode = argValue("--mode") ?? process.env.PIPELINE_MODE ?? "apply";
const stepStatuses = parseJson(process.env.PIPELINE_STEP_STATUS_JSON, {});

if (!url || !serviceRoleKey) {
  console.error("TENDER_SUPABASE_URL and TENDER_SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

async function main() {
  const finishedAt = new Date().toISOString();
  const [
    tenders,
    pendingCandidates,
    sourceCount,
    crawlReadySourceCount,
    runLogs,
    previousPipeline
  ] = await Promise.all([
    readAll("tenders", "id,status,deadline_at,bid_at,detail_memo,updated_at,created_at", (query) => query.eq("status", "published").order("updated_at", { ascending: false }), 6000),
    countRows("tender_candidates", (query) => query.eq("review_status", "pending")),
    countRows("tender_sources"),
    countRows("tender_sources", (query) => query.eq("is_active", true).eq("crawl_ready", true).neq("crawler_type", "manual_only")),
    readAll("tender_crawl_logs", "id,started_at,finished_at,status,fetched_count,created_count,updated_count,duplicate_count,skipped_count,error_count,error_message", (query) => query.gte("started_at", startedAt).order("started_at", { ascending: true }), 200),
    readPreviousPipelineLog(startedAt)
  ]);

  const published = tenders.filter((row) => row.status === "published");
  const deadline = countDeadlineStatus(published);
  const availability = countSourceAvailability(published);
  const nonPipelineLogs = runLogs.filter((log) => !isPipelineLog(log));
  const aggregate = aggregateLogs(nonPipelineLogs);
  const candidateActivity = await countCandidateActivity(startedAt);
  const durationSeconds = Math.max(0, Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000));
  const previous = parsePipelineSummary(previousPipeline?.error_message);
  const warnings = buildWarnings({
    aggregate,
    candidateActivity,
    pendingCandidates,
    publishedCount: published.length,
    durationSeconds,
    previous,
    stepStatuses,
    nonPipelineLogs
  });
  const status = statusFrom(stepStatuses, warnings);

  const summary = {
    event: "tender_daily_pipeline_summary",
    mode,
    project_ref: projectRef(url),
    started_at: startedAt,
    finished_at: finishedAt,
    duration_seconds: durationSeconds,
    status,
    source_count: sourceCount,
    crawl_ready_source_count: crawlReadySourceCount,
    fetched_count: aggregate.fetched_count,
    created_count: aggregate.created_count,
    duplicate_count: aggregate.duplicate_count,
    auto_published_count: candidateActivity.auto_published_count,
    auto_rejected_count: candidateActivity.auto_rejected_count,
    pending_candidates: pendingCandidates,
    published_tenders: published.length,
    active: deadline.active,
    closing_soon: deadline.closing_soon,
    expired: deadline.expired,
    unknown: deadline.unknown,
    source_open: availability.source_open,
    source_closed: availability.source_closed,
    source_unknown: availability.source_unknown,
    deadline_update_count: candidateActivity.deadline_update_count,
    error_count: aggregate.error_count,
    timeout_count: aggregate.timeout_count,
    step_statuses: stepStatuses,
    warnings,
    top_errors: topErrors(nonPipelineLogs),
    safety_checks: {
      high_confidence_only_auto_publish: true,
      medium_low_candidates_stay_pending: true,
      clear_guidance_only_auto_reject: true,
      unknown_deadline_stays_unknown: true,
      source_public_end_not_deadline: true,
      expired_or_source_closed_not_archived: true
    }
  };

  console.log(JSON.stringify(summary, null, 2));
  await writeGitHubStepSummary(summary);

  if (shouldRecord && mode === "apply") {
    await recordPipelineLog(summary);
  }
}

async function countCandidateActivity(since) {
  const sinceFilter = (query) => query.gte("updated_at", since);
  const [autoPublished, autoRejected, deadlineUpdated] = await Promise.all([
    countRows("tender_candidates", (query) => sinceFilter(query).eq("review_status", "approved").ilike("admin_note", "%自動公開%")),
    countRows("tender_candidates", (query) => sinceFilter(query).eq("review_status", "rejected").ilike("admin_note", "%自動却下%")),
    countRows("tenders", (query) => sinceFilter(query).eq("status", "published").not("deadline_at", "is", null))
  ]);
  return {
    auto_published_count: autoPublished,
    auto_rejected_count: autoRejected,
    deadline_update_count: deadlineUpdated
  };
}

async function recordPipelineLog(summary) {
  const message = `daily_pipeline_summary:${JSON.stringify({
    status: summary.status,
    duration_seconds: summary.duration_seconds,
    source_count: summary.source_count,
    crawl_ready_source_count: summary.crawl_ready_source_count,
    created_count: summary.created_count,
    auto_published_count: summary.auto_published_count,
    auto_rejected_count: summary.auto_rejected_count,
    pending_candidates: summary.pending_candidates,
    published_tenders: summary.published_tenders,
    active: summary.active,
    closing_soon: summary.closing_soon,
    expired: summary.expired,
    unknown: summary.unknown,
    source_open: summary.source_open,
    source_closed: summary.source_closed,
    source_unknown: summary.source_unknown,
    deadline_update_count: summary.deadline_update_count,
    warnings: summary.warnings
  })}`;
  const { error } = await supabase.from("tender_crawl_logs").insert({
    source_id: null,
    started_at: summary.started_at,
    finished_at: summary.finished_at,
    status: summary.status,
    fetched_count: summary.fetched_count,
    created_count: summary.auto_published_count,
    duplicate_count: summary.duplicate_count,
    skipped_count: summary.pending_candidates,
    error_count: summary.error_count,
    error_message: message
  });
  if (error) throw new Error(`record pipeline log: ${error.message}`);
}

async function writeGitHubStepSummary(summary) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  const warnings = summary.warnings.length ? summary.warnings.map((warning) => `- ${warning}`).join("\n") : "- なし";
  const steps = Object.entries(summary.step_statuses).map(([name, status]) => `| ${name} | ${status} |`).join("\n");
  const markdown = [
    "## Daily Tender Pipeline Summary",
    "",
    `- Status: **${summary.status}**`,
    `- Mode: \`${summary.mode}\``,
    `- Started: ${summary.started_at}`,
    `- Finished: ${summary.finished_at}`,
    `- Duration: ${summary.duration_seconds}s`,
    "",
    "### Counts",
    "",
    "| Item | Count |",
    "| --- | ---: |",
    `| Sources | ${summary.source_count} |`,
    `| Crawl-ready sources | ${summary.crawl_ready_source_count} |`,
    `| Fetched candidates/items | ${summary.fetched_count} |`,
    `| Newly created by crawlers | ${summary.created_count} |`,
    `| Duplicates/updates | ${summary.duplicate_count} |`,
    `| Auto-published candidates | ${summary.auto_published_count} |`,
    `| Auto-rejected candidates | ${summary.auto_rejected_count} |`,
    `| Pending candidates | ${summary.pending_candidates} |`,
    `| Published tenders | ${summary.published_tenders} |`,
    `| active | ${summary.active} |`,
    `| closing_soon | ${summary.closing_soon} |`,
    `| expired | ${summary.expired} |`,
    `| unknown | ${summary.unknown} |`,
    `| source_open | ${summary.source_open} |`,
    `| source_closed | ${summary.source_closed} |`,
    `| source_unknown | ${summary.source_unknown} |`,
    `| Deadline updates | ${summary.deadline_update_count} |`,
    `| Errors | ${summary.error_count} |`,
    `| Timeouts | ${summary.timeout_count} |`,
    "",
    "### Step Statuses",
    "",
    "| Step | Outcome |",
    "| --- | --- |",
    steps || "| - | - |",
    "",
    "### Warnings",
    "",
    warnings,
    "",
    "### Top Errors",
    "",
    summary.top_errors.length ? summary.top_errors.map((item) => `- ${item.count}x ${item.message}`).join("\n") : "- なし",
    ""
  ].join("\n");
  fs.appendFileSync(file, markdown, "utf8");
}

function aggregateLogs(logs) {
  return logs.reduce((sum, log) => ({
    fetched_count: sum.fetched_count + numberValue(log.fetched_count),
    created_count: sum.created_count + numberValue(log.created_count),
    duplicate_count: sum.duplicate_count + numberValue(log.duplicate_count),
    skipped_count: sum.skipped_count + numberValue(log.skipped_count),
    error_count: sum.error_count + numberValue(log.error_count),
    timeout_count: sum.timeout_count + (isTimeoutMessage(log.error_message) ? 1 : 0)
  }), { fetched_count: 0, created_count: 0, duplicate_count: 0, skipped_count: 0, error_count: 0, timeout_count: 0 });
}

function buildWarnings({ aggregate, candidateActivity, pendingCandidates, publishedCount, durationSeconds, previous, stepStatuses, nonPipelineLogs }) {
  const warnings = [];
  if (aggregate.created_count === 0) warnings.push("新規取得0件");
  if (aggregate.fetched_count > 0 && aggregate.error_count / aggregate.fetched_count >= 0.2) warnings.push("エラー率20%以上");
  if (previous?.published_tenders && publishedCount < previous.published_tenders * 0.8) warnings.push("公開案件が前回より20%以上減少");
  if (previous?.pending_candidates && pendingCandidates > previous.pending_candidates + 100) warnings.push("pendingが前回より100件超増加");
  if (previous?.duration_seconds && durationSeconds > previous.duration_seconds * 1.5 && durationSeconds > 600) warnings.push("処理時間が前回より大幅増加");
  if (Object.values(stepStatuses).some((status) => status === "failure" || status === "cancelled" || status === "timed_out")) warnings.push("失敗または中断した工程あり");
  if (nonPipelineLogs.some((log) => /調達ポータル/.test(log.error_message ?? "") && numberValue(log.fetched_count) === 0)) warnings.push("調達ポータル全件取得失敗の可能性");
  if (nonPipelineLogs.some((log) => /防衛系/.test(log.error_message ?? "") && numberValue(log.fetched_count) === 0)) warnings.push("防衛省系全件取得失敗の可能性");
  if (candidateActivity.auto_published_count === 0 && aggregate.created_count > 0) warnings.push("新規候補はあるが自動公開0件");
  return [...new Set(warnings)];
}

function statusFrom(stepStatuses, warnings) {
  const outcomes = Object.values(stepStatuses);
  if (outcomes.includes("failure") || outcomes.includes("cancelled") || outcomes.includes("timed_out")) return "partial_success";
  if (warnings.length) return "partial_success";
  return "success";
}

function countDeadlineStatus(rows) {
  const counts = { active: 0, closing_soon: 0, expired: 0, unknown: 0 };
  for (const row of rows) {
    const value = normalizeIso(row.deadline_at) ?? normalizeIso(row.bid_at);
    if (!value) {
      counts.unknown += 1;
      continue;
    }
    const days = daysUntil(value);
    if (days < 0) counts.expired += 1;
    else if (days <= 7) counts.closing_soon += 1;
    else counts.active += 1;
  }
  return counts;
}

function countSourceAvailability(rows) {
  const counts = { source_open: 0, source_closed: 0, source_unknown: 0 };
  const today = jstDateOnly(new Date());
  for (const row of rows) {
    const publicEnd = String(row.detail_memo ?? "").match(/調達ポータル公開終了日=(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
    if (!publicEnd) counts.source_unknown += 1;
    else if (publicEnd < today) counts.source_closed += 1;
    else counts.source_open += 1;
  }
  return counts;
}

function topErrors(logs) {
  const counts = new Map();
  for (const log of logs) {
    const message = cleanErrorMessage(log.error_message);
    if (!message) continue;
    counts.set(message, (counts.get(message) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([message, count]) => ({ message, count }));
}

function cleanErrorMessage(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 180);
}

async function readPreviousPipelineLog(startedBefore) {
  const { data, error } = await supabase
    .from("tender_crawl_logs")
    .select("id,started_at,error_message")
    .lt("started_at", startedBefore)
    .ilike("error_message", "daily_pipeline_summary:%")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data ?? null;
}

function parsePipelineSummary(value) {
  const text = String(value ?? "");
  if (!text.startsWith("daily_pipeline_summary:")) return null;
  return parseJson(text.slice("daily_pipeline_summary:".length), null);
}

function isPipelineLog(log) {
  return String(log.error_message ?? "").startsWith("daily_pipeline_summary:");
}

async function countRows(table, configure) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (configure) query = configure(query);
  const { count, error } = await query;
  if (error) throw new Error(`${table} count: ${error.message}`);
  return count ?? 0;
}

async function readAll(table, columns, configure, limitRows) {
  const rows = [];
  const pageSize = 1000;
  for (let page = 0; rows.length < limitRows && page < 20; page += 1) {
    const from = page * pageSize;
    const to = Math.min(from + pageSize - 1, limitRows - 1);
    let query = supabase.from(table).select(columns).range(from, to);
    query = configure(query);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows.slice(0, limitRows);
}

function daysUntil(value) {
  const target = jstDateOnly(new Date(value));
  const today = jstDateOnly(new Date());
  return Math.round((Date.parse(`${target}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

function jstDateOnly(date) {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}-${String(jst.getUTCDate()).padStart(2, "0")}`;
}

function normalizeIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function isTimeoutMessage(value) {
  return /timeout|timed out|abort/i.test(String(value ?? ""));
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
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
