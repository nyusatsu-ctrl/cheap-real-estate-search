#!/usr/bin/env node
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

loadLocalEnv();

const url = process.env.TENDER_SUPABASE_URL;
const serviceRoleKey = process.env.TENDER_SUPABASE_SERVICE_ROLE_KEY;
const mode = argValue("--mode") ?? (process.argv.includes("--commit") ? "apply" : "dry_run");
const shouldCommit = mode === "apply";
const limit = positiveInt(argValue("--limit"), 5000);
const sampleSize = positiveInt(argValue("--sample"), 10);
const PAGE_SIZE = 1000;

if (!url || !serviceRoleKey) {
  console.error("TENDER_SUPABASE_URL and TENDER_SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

async function main() {
  const [publishedTenders, candidates] = await Promise.all([
    readAll("tenders", "id,title,agency_name,source_name,original_label,published_at,deadline_at,bid_at,source_url,pdf_url,raw_text,detail_memo,required_qualification,status,is_deadline_soon,fetched_at,created_at,updated_at", (query) => (
      query.eq("status", "published").order("updated_at", { ascending: false })
    ), limit),
    readAll("tender_candidates", "id,title,agency_name,source_name,original_label,published_at,deadline_at,bid_at,source_url,pdf_url,raw_text,ai_summary,required_qualification,review_status,fetched_at,created_at,updated_at", (query) => (
      query.order("updated_at", { ascending: false })
    ), limit)
  ]);

  const now = new Date();
  const classifiedTenders = publishedTenders.map((row) => ({ row, deadline: assessTenderDeadline(row, now) }));
  const classifiedCandidates = candidates.map((row) => ({ row, deadline: assessTenderDeadline(row, now) }));
  const tenderSummary = summarize(classifiedTenders);
  const candidateSummary = summarize(classifiedCandidates);
  const tendersToUpdate = classifiedTenders.filter(({ row, deadline }) => needsTenderUpdate(row, deadline));
  const candidatesToUpdate = classifiedCandidates.filter(({ row, deadline }) => !row.deadline_at && deadline.deadlineAt);

  const summary = {
    event: shouldCommit ? "tender_deadline_apply_plan" : "tender_deadline_dry_run",
    dry_run: !shouldCommit,
    project_ref: projectRef(url),
    published_tenders_scanned: publishedTenders.length,
    candidates_scanned: candidates.length,
    published_deadline_classification: tenderSummary,
    candidate_deadline_classification: candidateSummary,
    deadline_update_candidates: tendersToUpdate.length,
    candidate_deadline_update_candidates: candidatesToUpdate.length,
    expired_not_archived_count: classifiedTenders.filter(({ deadline }) => deadline.status === "expired").length,
    samples: {
      extracted_deadline: sampleRows(classifiedTenders.filter(({ deadline }) => deadline.deadlineAt), sampleSize),
      expired: sampleRows(classifiedTenders.filter(({ deadline }) => deadline.status === "expired"), sampleSize),
      unknown: sampleRows(classifiedTenders.filter(({ deadline }) => deadline.status === "unknown"), sampleSize)
    }
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!shouldCommit) return;

  let updatedTenders = 0;
  let updatedCandidates = 0;
  for (const { row, deadline } of tendersToUpdate) {
    const patch = {};
    if (!row.deadline_at && deadline.deadlineAt) patch.deadline_at = deadline.deadlineAt;
    const shouldBeSoon = deadline.status === "closing_soon";
    if (Boolean(row.is_deadline_soon) !== shouldBeSoon) patch.is_deadline_soon = shouldBeSoon;
    if (!Object.keys(patch).length) continue;
    const { error } = await supabase.from("tenders").update(patch).eq("id", row.id);
    if (error) throw new Error(`tenders update ${row.id}: ${error.message}`);
    updatedTenders += 1;
  }

  for (const { row, deadline } of candidatesToUpdate) {
    const { error } = await supabase.from("tender_candidates").update({ deadline_at: deadline.deadlineAt }).eq("id", row.id);
    if (error) throw new Error(`tender_candidates update ${row.id}: ${error.message}`);
    updatedCandidates += 1;
  }

  console.log(JSON.stringify({
    event: "tender_deadline_apply_result",
    project_ref: projectRef(url),
    updated_tenders: updatedTenders,
    updated_candidates: updatedCandidates,
    archived_tenders: 0,
    note: "期限切れでもstatus変更やarchived化は行っていません。"
  }, null, 2));
}

function needsTenderUpdate(row, deadline) {
  if (!row.deadline_at && deadline.deadlineAt) return true;
  return Boolean(row.is_deadline_soon) !== (deadline.status === "closing_soon");
}

function summarize(items) {
  const counts = { active: 0, closing_soon: 0, expired: 0, unknown: 0, archived: 0 };
  for (const { deadline } of items) counts[deadline.status] += 1;
  const extracted = items.length - counts.unknown;
  return {
    ...counts,
    extraction_success_rate: items.length ? Number((extracted / items.length).toFixed(3)) : 0
  };
}

function sampleRows(items, size) {
  return items.slice(0, size).map(({ row, deadline }) => ({
    id: row.id,
    title: row.title,
    agency_name: row.agency_name,
    deadline_at: deadline.deadlineAt,
    status: deadline.status,
    source: deadline.source,
    reason: deadline.reason ?? deadline.failureReason
  }));
}

async function readAll(table, columns, configure, limitRows) {
  const rows = [];
  for (let page = 0; rows.length < limitRows && page < 20; page += 1) {
    const from = page * PAGE_SIZE;
    const to = Math.min(from + PAGE_SIZE - 1, limitRows - 1);
    let query = supabase.from(table).select(columns).range(from, to);
    query = configure(query);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows.slice(0, limitRows);
}

function assessTenderDeadline(input, now = new Date()) {
  if (input.status === "archived") {
    return {
      status: "archived",
      deadlineAt: input.deadline_at ?? null,
      daysUntil: null,
      label: "非表示・終了扱い",
      source: "status",
      reason: "案件自体が archived です。",
      failureReason: null
    };
  }

  const extracted = extractTenderDeadline(input);
  if (!extracted) {
    return {
      status: "unknown",
      deadlineAt: null,
      daysUntil: null,
      label: "期限不明",
      source: null,
      reason: null,
      failureReason: "deadline_at / bid_at / 公告テキストから参加期限を特定できませんでした。"
    };
  }

  const daysUntil = daysUntilDate(extracted.iso, now);
  const status = daysUntil < 0 ? "expired" : daysUntil <= 7 ? "closing_soon" : "active";
  return {
    status,
    deadlineAt: extracted.iso,
    daysUntil,
    label: deadlineStatusLabel(status, daysUntil),
    source: extracted.source,
    reason: extracted.reason,
    failureReason: null
  };
}

function extractTenderDeadline(input) {
  const existingDeadline = normalizeIso(input.deadline_at);
  if (existingDeadline) {
    return { iso: existingDeadline, source: "deadline_at", reason: "DBの締切日を使用しました。", score: 120 };
  }

  const existingBid = normalizeIso(input.bid_at);
  if (existingBid) {
    return { iso: existingBid, source: "bid_at", reason: "DBの入札日・見積期限を使用しました。", score: 110 };
  }

  const referenceDate = normalizeIso(input.published_at) ?? normalizeIso(input.fetched_at) ?? normalizeIso(input.created_at) ?? normalizeIso(input.updated_at);
  const text = [
    input.title,
    input.original_label,
    input.raw_text,
    input.detail_memo,
    input.ai_summary,
    input.required_qualification
  ].filter(Boolean).join(" ");

  const candidates = [];
  candidates.push(...labeledDateCandidates(text, referenceDate));
  candidates.push(...nearDeadlineWordCandidates(text, referenceDate));
  return candidates.sort((a, b) => b.score - a.score || new Date(b.iso).getTime() - new Date(a.iso).getTime())[0] ?? null;
}

const DEADLINE_LABELS = [
  { label: "競争参加資格確認申請書提出期限" },
  { label: "競争参加資格確認資料提出期限" },
  { label: "競争参加資格確認申請期限" },
  { label: "参加資格確認申請書提出期限" },
  { label: "参加申請期限" },
  { label: "参加表明書提出期限" },
  { label: "入札書提出期限" },
  { label: "見積書提出期限" },
  { label: "見積提出期限" },
  { label: "企画提案書提出期限" },
  { label: "提案書提出期限" },
  { label: "応募締切" },
  { label: "申込期限" },
  { label: "申込み期限" },
  { label: "受付期限" },
  { label: "提出期限", requiredContext: /入札書|見積書|見積書等|提案書|企画提案|参加|資格|証明書|申請|応募|提出書類/ },
  { label: "入札日時" },
  { label: "見積合わせ日時" },
  { label: "見積日時" },
  { label: "開札日時" }
];

const FORBIDDEN_DEADLINE_CONTEXT = /履行期限|履行期間|納入期限|納期|納入期間|契約期間|公告日|公示日|掲載日|公開日|更新日|質問書|質問期限|質問受付|質問回答|質問締切/;

function labeledDateCandidates(text, referenceDate) {
  const candidates = [];
  for (const definition of DEADLINE_LABELS) {
    for (const index of allIndexes(text, definition.label)) {
      const windowText = text.slice(index, index + 140);
      if (definition.requiredContext && !definition.requiredContext.test(windowText)) continue;
      if (FORBIDDEN_DEADLINE_CONTEXT.test(windowText)) continue;
      for (const date of parseDates(windowText, referenceDate)) {
        if (!isDateCloseToLabel(windowText, definition.label, date.matchedText)) continue;
        candidates.push({
          iso: date.iso,
          source: `text:${definition.label}`,
          reason: `${definition.label} の近くから期限日を抽出しました。`,
          score: definition.label.includes("開札") ? 80 : definition.label.includes("入札日時") || definition.label.includes("見積合わせ日時") || definition.label.includes("見積日時") ? 90 : 120
        });
      }
    }
  }
  return candidates;
}

function isDateCloseToLabel(context, label, matchedText) {
  const labelIndex = context.indexOf(label);
  const dateIndex = context.indexOf(matchedText, Math.max(0, labelIndex));
  if (labelIndex < 0 || dateIndex < 0) return false;
  const between = context.slice(labelIndex + label.length, dateIndex);
  if (between.length > 70) return false;
  if (/までの期間|から|以降|停止等措置|要領|制定|付け|平成\d/.test(between)) return false;
  return true;
}

function nearDeadlineWordCandidates(text, referenceDate) {
  const candidates = [];
  for (const date of parseDates(text, referenceDate)) {
    const index = text.indexOf(date.matchedText);
    const nearby = text.slice(Math.max(0, index - 35), Math.min(text.length, index + date.matchedText.length + 35));
    if (FORBIDDEN_DEADLINE_CONTEXT.test(nearby)) continue;
    if (!/入札書|見積書|提案書|参加申請|資格確認|応募|申込|受付|提出期限|締切/.test(nearby)) continue;
    candidates.push({
      iso: date.iso,
      source: "text:near_deadline_word",
      reason: "参加・入札書・見積書・提出期限などの語の近くから日付を抽出しました。",
      score: 60
    });
  }
  return candidates;
}

function parseDates(text, referenceDate) {
  const normalized = String(text ?? "").normalize("NFKC");
  const results = [];
  const push = (year, month, day, matchedText) => {
    const iso = toIsoDate(year, month, day);
    if (iso) results.push({ iso, matchedText });
  };

  for (const match of normalized.matchAll(/令和\s*(元|\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/g)) {
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

  for (const match of normalized.matchAll(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/g)) {
    push(Number(match[1]), Number(match[2]), Number(match[3]), match[0]);
  }

  for (const match of normalized.matchAll(/\b(20\d{2})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/g)) {
    push(Number(match[1]), Number(match[2]), Number(match[3]), match[0]);
  }

  for (const match of normalized.matchAll(/(?<!\d)(\d{1,2})\s*月\s*(\d{1,2})\s*日/g)) {
    const inferred = inferYear(Number(match[1]), Number(match[2]), referenceDate);
    if (inferred) push(inferred, Number(match[1]), Number(match[2]), match[0]);
  }

  for (const match of normalized.matchAll(/(?<!\d)(\d{1,2})[\/.](\d{1,2})(?![\/.\d])/g)) {
    const inferred = inferYear(Number(match[1]), Number(match[2]), referenceDate);
    if (inferred) push(inferred, Number(match[1]), Number(match[2]), match[0]);
  }

  return uniqueDates(results);
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
  if (diffDays >= -30 && diffDays <= 370) return baseYear;
  const nextDiffDays = Math.round((nextYear - base) / 86_400_000);
  if (nextDiffDays >= 0 && nextDiffDays <= 370) return baseYear + 1;
  return null;
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

function daysUntilDate(value, now) {
  return Math.round((jstDateOnlyTimestamp(new Date(value)) - jstDateOnlyTimestamp(now)) / 86_400_000);
}

function jstDateOnlyTimestamp(date) {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate());
}

function deadlineStatusLabel(status, daysUntil) {
  if (status === "archived") return "非表示・終了扱い";
  if (status === "unknown") return "期限不明";
  if (status === "expired") return "期限切れ";
  if (status === "closing_soon") {
    if (daysUntil === 0) return "本日締切";
    if (daysUntil === 1) return "明日締切";
    return `締切まで${daysUntil}日`;
  }
  return `締切まで${daysUntil}日`;
}

function allIndexes(text, search) {
  const indexes = [];
  let index = text.indexOf(search);
  while (index >= 0) {
    indexes.push(index);
    index = text.indexOf(search, index + search.length);
  }
  return indexes;
}

function uniqueDates(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = `${value.iso}-${value.matchedText}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
