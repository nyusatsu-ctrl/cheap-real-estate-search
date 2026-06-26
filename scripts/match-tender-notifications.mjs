#!/usr/bin/env node
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

loadLocalEnv();

const url = process.env.TENDER_SUPABASE_URL;
const serviceRoleKey = process.env.TENDER_SUPABASE_SERVICE_ROLE_KEY;
const mode = argValue("--mode") ?? process.env.PIPELINE_MODE ?? "dry_run";
const since = argValue("--since") ?? process.env.PIPELINE_STARTED_AT ?? hoursAgoIso(numberArg("--lookback-hours", 24));
const limit = numberArg("--limit", 1000);
const sampleSize = numberArg("--sample", 10);
const targetTenderId = argValue("--tender-id");
const shouldRecordLog = !process.argv.includes("--no-log");
const startedAt = new Date().toISOString();

if (!url || !serviceRoleKey) {
  console.error("TENDER_SUPABASE_URL and TENDER_SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

async function main() {
  const summary = {
    event: "tender_notifications_match",
    mode,
    since,
    started_at: startedAt,
    finished_at: null,
    status: "success",
    eligible_tender_count: 0,
    active_rule_count: 0,
    target_user_count: 0,
    matched_count: 0,
    created_count: 0,
    duplicate_skipped_count: 0,
    email_outbox_pending_count: 0,
    error_count: 0,
    setup_required: false,
    tender_id: targetTenderId ?? null,
    errors: [],
    samples: []
  };

  const rulesResult = await readActiveRules();
  if (rulesResult.setupRequired) {
    summary.status = "partial_success";
    summary.setup_required = true;
    summary.error_count = 1;
    summary.errors.push(rulesResult.error ?? "notification schema is not ready");
    summary.finished_at = new Date().toISOString();
    await maybeRecordLog(summary);
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  if (rulesResult.error) {
    throw new Error(rulesResult.error);
  }

  const rules = rulesResult.rules;
  summary.active_rule_count = rules.length;
  summary.target_user_count = new Set(rules.map((rule) => rule.user_id)).size;

  const tenders = await readNewPublishedTenders(since, limit, targetTenderId);
  summary.eligible_tender_count = tenders.length;

  const matches = [];
  for (const tender of tenders) {
    for (const rule of rules) {
      if (!matchesRule(tender, rule)) continue;
      matches.push({
        user_id: rule.user_id,
        notification_rule_id: rule.id,
        tender_id: tender.id,
        match_reason: matchReason(tender, rule)
      });
      if (summary.samples.length < sampleSize) {
        summary.samples.push({
          rule: rule.name ?? "通知条件",
          tender: tender.title,
          agency: tender.agency_name,
          reason: matchReason(tender, rule)
        });
      }
    }
  }

  summary.matched_count = matches.length;

  if (matches.length === 0 || mode === "dry_run") {
    summary.finished_at = new Date().toISOString();
    await maybeRecordLog(summary);
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const existing = await readExistingEvents(matches);
  const newEvents = matches.filter((match) => !existing.has(eventKey(match)));
  summary.duplicate_skipped_count = matches.length - newEvents.length;

  const insertedEvents = [];
  for (const chunk of chunks(newEvents, 200)) {
    const { data, error } = await supabase
      .from("tender_notification_events")
      .insert(chunk)
      .select("id,user_id,notification_rule_id,tender_id");
    if (error) {
      summary.status = "partial_success";
      summary.error_count += 1;
      summary.errors.push(`events insert: ${error.message}`);
      continue;
    }
    insertedEvents.push(...(data ?? []));
  }

  summary.created_count = insertedEvents.length;
  summary.duplicate_skipped_count += Math.max(0, newEvents.length - insertedEvents.length);

  const emailRows = buildEmailOutboxRows(insertedEvents, rules, tenders);
  if (emailRows.length) {
    for (const chunk of chunks(emailRows, 200)) {
      const { error } = await supabase.from("tender_notification_email_outbox").insert(chunk);
      if (error) {
        summary.status = "partial_success";
        summary.error_count += 1;
        summary.errors.push(`email outbox insert: ${error.message}`);
      } else {
        summary.email_outbox_pending_count += chunk.length;
      }
    }
  }

  await touchMatchedRules(insertedEvents);
  summary.finished_at = new Date().toISOString();
  await maybeRecordLog(summary);
  console.log(JSON.stringify(summary, null, 2));
}

async function readActiveRules() {
  const { data, error } = await supabase
    .from("tender_notifications")
    .select("*")
    .eq("is_active", true)
    .is("deleted_at", null)
    .or("app_enabled.eq.true,email_enabled.eq.true")
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      rules: [],
      setupRequired: isSchemaError(error),
      error: error.message
    };
  }

  return {
    rules: (data ?? []).map(normalizeRule),
    setupRequired: false,
    error: null
  };
}

async function readNewPublishedTenders(sinceIso, maxRows, tenderId) {
  let query = supabase
    .from("tenders")
    .select("*, tender_sources(name, url, source_name, organization_type, base_url)")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  query = tenderId
    ? query.eq("id", tenderId).limit(1)
    : query.gte("created_at", sinceIso).limit(maxRows);

  const { data, error } = await query;

  if (error) throw new Error(`tenders: ${error.message}`);
  return (data ?? []).filter(isNotificationEligibleTender);
}

async function readExistingEvents(matches) {
  const keys = new Set();
  const userIds = unique(matches.map((match) => match.user_id));
  const ruleIds = unique(matches.map((match) => match.notification_rule_id));
  const tenderIds = unique(matches.map((match) => match.tender_id));
  if (!userIds.length || !ruleIds.length || !tenderIds.length) return keys;

  for (const tenderChunk of chunks(tenderIds, 200)) {
    const { data, error } = await supabase
      .from("tender_notification_events")
      .select("user_id,notification_rule_id,tender_id")
      .in("user_id", userIds)
      .in("notification_rule_id", ruleIds)
      .in("tender_id", tenderChunk);
    if (error) throw new Error(`existing notification events: ${error.message}`);
    for (const row of data ?? []) keys.add(eventKey(row));
  }
  return keys;
}

function buildEmailOutboxRows(insertedEvents, rules, tenders) {
  const ruleMap = new Map(rules.map((rule) => [rule.id, rule]));
  const tenderMap = new Map(tenders.map((tender) => [tender.id, tender]));
  return insertedEvents
    .map((event) => {
      const rule = ruleMap.get(event.notification_rule_id);
      const tender = tenderMap.get(event.tender_id);
      if (!rule?.email_enabled || !tender) return null;
      return {
        user_id: event.user_id,
        notification_event_id: event.id,
        tender_id: event.tender_id,
        notification_rule_id: event.notification_rule_id,
        status: "pending",
        provider: null,
        subject: `新着官公庁案件: ${tender.title}`.slice(0, 180),
        scheduled_at: new Date().toISOString()
      };
    })
    .filter(Boolean);
}

async function touchMatchedRules(insertedEvents) {
  const ruleIds = unique(insertedEvents.map((event) => event.notification_rule_id));
  if (!ruleIds.length) return;
  const now = new Date().toISOString();
  for (const id of ruleIds) {
    await supabase.from("tender_notifications").update({ last_matched_at: now }).eq("id", id);
  }
}

async function maybeRecordLog(summary) {
  if (mode !== "apply" || !shouldRecordLog) return;
  const { error } = await supabase.from("tender_crawl_logs").insert({
    source_id: null,
    started_at: summary.started_at,
    finished_at: summary.finished_at ?? new Date().toISOString(),
    status: summary.status,
    fetched_count: summary.eligible_tender_count,
    created_count: summary.created_count,
    duplicate_count: summary.duplicate_skipped_count,
    skipped_count: Math.max(0, summary.matched_count - summary.created_count),
    error_count: summary.error_count,
    error_message: `tender_notifications_summary:${JSON.stringify({
      status: summary.status,
      active_rule_count: summary.active_rule_count,
      target_user_count: summary.target_user_count,
      eligible_tender_count: summary.eligible_tender_count,
      matched_count: summary.matched_count,
      created_count: summary.created_count,
      duplicate_skipped_count: summary.duplicate_skipped_count,
      email_outbox_pending_count: summary.email_outbox_pending_count,
      error_count: summary.error_count,
      setup_required: summary.setup_required,
      errors: summary.errors.slice(0, 5)
    })}`
  });
  if (error) {
    console.error(`Could not record tender notification log: ${error.message}`);
  }
}

function normalizeRule(row) {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: row.name ?? "通知条件",
    region: blankToNull(row.region),
    prefecture: blankToNull(row.prefecture),
    tender_type: normalizeTenderType(row.tender_type),
    participation_condition: blankToNull(row.participation_condition),
    keyword: blankToNull(row.keyword),
    exclude_keyword: blankToNull(row.exclude_keyword),
    agency_name: blankToNull(row.agency_name),
    defense_only: Boolean(row.defense_only),
    open_counter_only: Boolean(row.open_counter_only),
    qualification_required_only: Boolean(row.qualification_required_only),
    deadline_soon_only: Boolean(row.deadline_soon_only),
    min_days_until_deadline: Math.max(0, Number(row.min_days_until_deadline ?? 0) || 0),
    include_unknown_deadline: row.include_unknown_deadline !== false,
    email_enabled: Boolean(row.email_enabled),
    app_enabled: row.app_enabled !== false,
    is_active: row.is_active !== false,
    deleted_at: row.deleted_at ?? null
  };
}

function isNotificationEligibleTender(tender) {
  if (tender.status !== "published") return false;
  if (isQualityNg(tender)) return false;
  const deadline = assessDeadline(tender);
  const availability = assessAvailability(tender);
  if (deadline.status === "archived" || deadline.status === "expired") return false;
  if (availability.status === "source_closed") return false;
  return deadline.status === "active" || deadline.status === "closing_soon" || deadline.status === "unknown";
}

function matchesRule(tender, rule) {
  if (!rule.is_active || rule.deleted_at) return false;
  if (!rule.app_enabled && !rule.email_enabled) return false;

  const deadline = assessDeadline(tender);
  const availability = assessAvailability(tender);
  if (deadline.status === "expired" || deadline.status === "archived") return false;
  if (availability.status === "source_closed") return false;

  if (deadline.status === "unknown" && !rule.include_unknown_deadline) return false;
  if (deadline.daysUntil !== null && rule.min_days_until_deadline > 0 && deadline.daysUntil < rule.min_days_until_deadline) return false;
  if (rule.deadline_soon_only && deadline.status !== "closing_soon") return false;

  if (rule.region && rule.region !== "全国" && normalizeRegion(tender) !== rule.region) return false;
  if (rule.prefecture && tender.prefecture !== rule.prefecture) return false;
  if (rule.tender_type && normalizeTenderType(tender.tender_type) !== rule.tender_type) return false;
  if (rule.open_counter_only && normalizeTenderType(tender.tender_type) !== "open_counter") return false;
  if (rule.qualification_required_only && !tender.qualification_required) return false;
  if (rule.participation_condition && !matchesParticipationCondition(tender, rule.participation_condition)) return false;
  if (rule.defense_only && !isDefenseLike(tender)) return false;
  if (rule.agency_name && !String(tender.agency_name ?? "").includes(rule.agency_name)) return false;

  const haystack = searchHaystack(tender);
  if (rule.keyword && !splitKeywords(rule.keyword).every((keyword) => haystack.includes(keyword))) return false;
  if (rule.exclude_keyword && splitKeywords(rule.exclude_keyword).some((keyword) => haystack.includes(keyword))) return false;

  return true;
}

function matchReason(tender, rule) {
  const reasons = [];
  const deadline = assessDeadline(tender);
  const availability = assessAvailability(tender);
  if (rule.keyword) reasons.push(`キーワード: ${rule.keyword}`);
  if (rule.agency_name) reasons.push(`発注機関: ${rule.agency_name}`);
  if (rule.prefecture) reasons.push(`都道府県: ${rule.prefecture}`);
  if (rule.region) reasons.push(`地域: ${rule.region}`);
  if (rule.tender_type) reasons.push(`案件区分: ${rule.tender_type}`);
  if (rule.defense_only) reasons.push("防衛省・自衛隊のみ");
  if (deadline.status === "unknown") reasons.push(availability.status === "source_open" ? "期限不明・公式ページ掲載中" : "期限不明");
  if (deadline.daysUntil !== null) reasons.push(`締切まで${deadline.daysUntil}日`);
  return reasons.join(" / ") || "通知条件に一致";
}

function assessDeadline(tender) {
  const value = normalizeIso(tender.deadline_at) ?? normalizeIso(tender.bid_at);
  if (!value) return { status: "unknown", daysUntil: null, deadlineAt: null };
  const days = daysUntil(value);
  if (days < 0) return { status: "expired", daysUntil: days, deadlineAt: value };
  if (days <= 7) return { status: "closing_soon", daysUntil: days, deadlineAt: value };
  return { status: "active", daysUntil: days, deadlineAt: value };
}

function assessAvailability(tender) {
  const publicEnd = String(tender.detail_memo ?? "").match(/調達ポータル公開終了日=(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
  if (!publicEnd) return { status: "source_unknown", sourcePublishedUntil: null };
  return publicEnd < jstDateOnly(new Date())
    ? { status: "source_closed", sourcePublishedUntil: publicEnd }
    : { status: "source_open", sourcePublishedUntil: publicEnd };
}

function matchesParticipationCondition(tender, condition) {
  const required = String(tender.required_qualification ?? "");
  if (condition === "not_required") return normalizeTenderType(tender.tender_type) === "open_counter" || !tender.qualification_required;
  if (condition === "unified_qualification") return normalizeTenderType(tender.tender_type) === "unified_qualification" || /全省庁|統一資格/.test(required);
  if (condition === "area_specified") return Boolean(tender.qualification_required) && /地域|エリア|参加地域/.test(required);
  return Boolean(tender.qualification_required) && !/全省庁|統一資格|地域|エリア|参加地域/.test(required);
}

function isDefenseLike(tender) {
  return Boolean(tender.is_defense)
    || /防衛省|自衛隊|防衛装備庁|地方防衛局|駐屯地|基地|方面会計隊|mod\.go\.jp/.test(searchHaystack(tender));
}

function isQualityNg(tender) {
  const title = normalizeText(tender.title);
  if (!title || title.length <= 3) return true;
  return [
    /^オープンカウンター方式(?:とは|について)?$/,
    /^入札[・･]落札情報はこちら$/,
    /入札情報のページに掲載/,
    /標準契約条項|標準契約書|契約書式|契約様式/,
    /請書条項/,
    /契約条項|契約条項等|特約条項|特別条項|特殊条項|契約不適合/,
    /情報の公開|情報の公表|公共調達の適正化/,
    /調達方針|調達予定のみ|契約制度|入札手続|契約手続|参加手続/,
    /様式|書式|記入例|申請書|委任状|誓約書|チェックリスト/,
    /リンク集|サイトマップ|お知らせ|説明|案内図|アクセス|問い合わせ|お問い合わせ/,
    /^(?:公表|掲載|案内|一覧)$/
  ].some((pattern) => pattern.test(title));
}

function searchHaystack(tender) {
  return [
    tender.title,
    tender.agency_name,
    tender.region,
    tender.prefecture,
    tender.detail_memo,
    tender.raw_text,
    tender.required_qualification,
    tender.source_name,
    tender.tender_sources?.source_name,
    tender.tender_sources?.name
  ].filter(Boolean).join(" ");
}

function splitKeywords(value) {
  return String(value ?? "")
    .split(/[\s,、]+/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function normalizeTenderType(value) {
  if (value === "services") return "service";
  return blankToNull(value);
}

function normalizeRegion(tender) {
  return tender.region || "全国";
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, "").trim();
}

function eventKey(value) {
  return `${value.user_id}:${value.notification_rule_id}:${value.tender_id}`;
}

function blankToNull(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
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

function hoursAgoIso(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function isSchemaError(error) {
  const text = `${error.code ?? ""} ${error.message ?? ""}`;
  return /PGRST|relation|column|schema cache|does not exist|Could not find/i.test(text);
}

function numberArg(name, fallback) {
  const value = Number(argValue(name));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function argValue(name) {
  const prefix = `${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
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

main().catch(async (error) => {
  const summary = {
    event: "tender_notifications_match",
    mode,
    since,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: "partial_success",
    eligible_tender_count: 0,
    active_rule_count: 0,
    target_user_count: 0,
    matched_count: 0,
    created_count: 0,
    duplicate_skipped_count: 0,
    email_outbox_pending_count: 0,
    error_count: 1,
    setup_required: isSchemaError(error),
    tender_id: targetTenderId ?? null,
    errors: [error.message],
    samples: []
  };
  await maybeRecordLog(summary);
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
});
