#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

loadLocalEnv();

const url = process.env.TENDER_SUPABASE_URL;
const anonKey = process.env.TENDER_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TENDER_SUPABASE_SERVICE_ROLE_KEY;
const productionBaseUrl = process.env.PRODUCTION_BASE_URL ?? "https://cheap-real-estate-search.vercel.app";
const apply = process.argv.includes("--apply");
const prefix = `E2E_TEST_TENDER_NOTIFICATION_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
const password = `E2e-${Math.random().toString(36).slice(2)}-${Date.now()}!`;

if (!url || !anonKey || !serviceRoleKey) {
  console.error("TENDER_SUPABASE_URL, TENDER_SUPABASE_ANON_KEY and TENDER_SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const service = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

const state = {
  userA: null,
  userB: null,
  ruleIds: [],
  eventIds: [],
  outboxIds: [],
  tenderIds: []
};

const summary = {
  event: "tender_notification_e2e",
  mode: apply ? "apply" : "dry_run",
  prefix,
  migration: {
    tables: {},
    columns: {},
    unique_constraint_verified: false,
    updated_at_triggers_verified: false,
    rls_verified: false,
    catalog_introspection: "not_available_via_postgrest"
  },
  selected_tender: null,
  notification: {
    created_count: 0,
    duplicate_skipped_count: 0,
    unread_before_read: 0,
    unread_after_read: 0,
    unread_after_mark_all: 0,
    deleted_count: 0,
    email_outbox_pending_count: 0,
    email_sent_count: 0
  },
  negative_cases: {
    rule_off_created_count: 0,
    exclude_keyword_created_count: 0,
    expired_created_count: 0,
    source_closed_created_count: 0
  },
  rls: {
    owner_rule_select: false,
    other_rule_select_blocked: false,
    anonymous_rule_select_blocked: false,
    owner_event_select: false,
    other_event_select_blocked: false,
    other_event_update_blocked: false
  },
  cleanup: {
    test_rules_remaining: null,
    test_events_remaining: null,
    test_outbox_remaining: null,
    test_tenders_remaining: null,
    test_users_deleted: false,
    active_rule_count_before: null,
    active_rule_count_after: null
  },
  checks: [],
  warnings: []
};

async function main() {
  await cleanupByPrefix(prefix);
  summary.cleanup.active_rule_count_before = await countActiveRules();
  await verifyMigrationShape();

  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const tender = await chooseEligibleTender();
  summary.selected_tender = {
    id: tender.id,
    deadline_status: deadlineStatus(tender).status,
    source_availability: sourceAvailability(tender).status,
    detail_http_ok: await checkTenderDetail(tender.id)
  };
  assert(summary.selected_tender.detail_http_ok, "selected tender detail is reachable");

  await createTestUsers();
  const owner = await authedClient(state.userA.email, password);
  const other = await authedClient(state.userB.email, password);
  const anonymous = createClient(url, anonKey, { auth: { persistSession: false } });

  const rule = await createRuleAsOwner(owner, tender, {
    name: `${prefix}_MAIN`,
    keyword: tender.title,
    email_enabled: true,
    is_active: true
  });
  summary.rls.owner_rule_select = await ownerCanSelectRule(owner, rule.id);
  summary.rls.other_rule_select_blocked = await otherCannotSelectRule(other, rule.id);
  summary.rls.anonymous_rule_select_blocked = await anonymousCannotSelectRule(anonymous, rule.id);

  const originalUpdatedAt = rule.updated_at;
  await sleep(1100);
  await updateRuleAsOwner(owner, rule.id, { name: `${prefix}_MAIN_UPDATED` });
  const updatedRule = await serviceSelectSingle("tender_notifications", "id,updated_at", rule.id);
  summary.migration.updated_at_triggers_verified = new Date(updatedRule.updated_at).getTime() > new Date(originalUpdatedAt).getTime();

  const firstMatch = runMatcher(tender.id);
  summary.notification.created_count = firstMatch.created_count;
  summary.notification.email_outbox_pending_count = firstMatch.email_outbox_pending_count;
  assert(firstMatch.created_count === 1, "first match creates exactly one notification");
  assert(firstMatch.matched_count === 1, "first match has exactly one match");

  const event = await readSingleEvent(rule.id, tender.id);
  state.eventIds.push(event.id);
  summary.event_user_matches_rule_user = event.user_id === state.userA.id;
  summary.event_rule_matches = event.notification_rule_id === rule.id;
  summary.event_tender_matches = event.tender_id === tender.id;
  assert(summary.event_user_matches_rule_user, "event user_id matches test user");
  assert(summary.event_rule_matches, "event notification_rule_id matches rule");
  assert(summary.event_tender_matches, "event tender_id matches selected tender");
  assert(Boolean(event.match_reason), "match reason is saved");

  const outbox = await readOutboxForEvent(event.id);
  state.outboxIds.push(...outbox.map((row) => row.id));
  summary.notification.email_outbox_pending_count = outbox.filter((row) => row.status === "pending").length;
  summary.notification.email_sent_count = outbox.filter((row) => row.status === "sent" || row.sent_at).length;
  assert(summary.notification.email_outbox_pending_count === 1, "email outbox has one pending row");
  assert(summary.notification.email_sent_count === 0, "real email sent count is zero");

  summary.rls.owner_event_select = await ownerCanSelectEvent(owner, event.id);
  summary.rls.other_event_select_blocked = await otherCannotSelectEvent(other, event.id);
  summary.rls.other_event_update_blocked = await otherCannotUpdateEvent(other, event.id);
  summary.migration.rls_verified = Object.values(summary.rls).every(Boolean);

  summary.notification.unread_before_read = await countUnreadEvents(state.userA.id);
  await markEventRead(owner, event.id);
  summary.notification.unread_after_read = await countUnreadEvents(state.userA.id);
  await resetEventUnread(event.id);
  await markAllRead(owner);
  summary.notification.unread_after_mark_all = await countUnreadEvents(state.userA.id);

  const secondMatch = runMatcher(tender.id);
  summary.notification.duplicate_skipped_count = secondMatch.duplicate_skipped_count;
  assert(secondMatch.created_count === 0, "second match creates zero notifications");
  assert(secondMatch.duplicate_skipped_count === 1, "second match skips one duplicate");

  const duplicateAttempt = await service.from("tender_notification_events").insert({
    user_id: state.userA.id,
    notification_rule_id: rule.id,
    tender_id: tender.id,
    match_reason: "duplicate constraint test"
  });
  summary.migration.unique_constraint_verified = Boolean(duplicateAttempt.error);
  assert(summary.migration.unique_constraint_verified, "unique constraint rejects duplicate event");

  await service.from("tender_notifications").update({ is_active: false }).eq("id", rule.id);
  summary.negative_cases.rule_off_created_count = runMatcher(tender.id).created_count;

  const excludeRule = await createRuleAsOwner(owner, tender, {
    name: `${prefix}_EXCLUDE`,
    keyword: tender.title,
    exclude_keyword: tender.title,
    email_enabled: false,
    is_active: true
  });
  summary.negative_cases.exclude_keyword_created_count = runMatcher(tender.id).created_count;

  const expiredTender = await createSyntheticTender(`${prefix}_EXPIRED`, { expired: true });
  const sourceClosedTender = await createSyntheticTender(`${prefix}_SOURCE_CLOSED`, { sourceClosed: true });
  await createRuleAsOwner(owner, expiredTender, {
    name: `${prefix}_EXPIRED_RULE`,
    keyword: expiredTender.title,
    email_enabled: false,
    is_active: true
  });
  await createRuleAsOwner(owner, sourceClosedTender, {
    name: `${prefix}_SOURCE_CLOSED_RULE`,
    keyword: sourceClosedTender.title,
    email_enabled: false,
    is_active: true
  });
  summary.negative_cases.expired_created_count = runMatcher(expiredTender.id).created_count;
  summary.negative_cases.source_closed_created_count = runMatcher(sourceClosedTender.id).created_count;
  assert(summary.negative_cases.rule_off_created_count === 0, "inactive rule creates zero notifications");
  assert(summary.negative_cases.exclude_keyword_created_count === 0, "exclude keyword creates zero notifications");
  assert(summary.negative_cases.expired_created_count === 0, "expired tender creates zero notifications");
  assert(summary.negative_cases.source_closed_created_count === 0, "source_closed tender creates zero notifications");

  await deleteEventAsOwner(owner, event.id);
  summary.notification.deleted_count = (await readActiveEventsByIds([event.id])).length === 0 ? 1 : 0;
  await softDeleteRuleAsOwner(owner, rule.id);
  await softDeleteRuleAsOwner(owner, excludeRule.id);

  await cleanupAll();
  await verifyCleanup();
  console.log(JSON.stringify(summary, null, 2));
}

async function verifyMigrationShape() {
  const tableChecks = [
    ["tender_notifications", "id,user_id,name,keyword,exclude_keyword,agency_name,participation_condition,min_days_until_deadline,include_unknown_deadline,is_active,last_matched_at,deleted_at,email_enabled,app_enabled,updated_at"],
    ["tender_notification_events", "id,user_id,notification_rule_id,tender_id,match_reason,is_read,read_at,deleted_at,created_at,updated_at"],
    ["tender_notification_email_outbox", "id,user_id,notification_event_id,tender_id,notification_rule_id,status,provider,subject,error_message,scheduled_at,sent_at,created_at,updated_at"]
  ];
  for (const [table, columns] of tableChecks) {
    const { error } = await service.from(table).select(columns).limit(1);
    summary.migration.tables[table] = !error;
    summary.migration.columns[table] = error ? formatError(error) : "ok";
    assert(!error, `${table} columns are available${error ? `: ${formatError(error)}` : ""}`);
  }
}

async function chooseEligibleTender() {
  const { data, error } = await service
    .from("tenders")
    .select("*, tender_sources(name, url, source_name, organization_type, base_url)")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(1000);
  assert(!error, `read tenders: ${error?.message}`);
  const tender = (data ?? []).find((row) => isNotificationEligible(row) && !isQualityNg(row));
  assert(tender, "eligible public tender exists");
  return tender;
}

async function createTestUsers() {
  const users = [];
  for (const label of ["a", "b"]) {
    const email = `${prefix.toLowerCase()}-${label}@example.invalid`;
    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { purpose: "tender_notification_e2e" }
    });
    assert(!error, `create test auth user ${label}: ${error?.message}`);
    users.push({ id: data.user.id, email });
  }
  state.userA = users[0];
  state.userB = users[1];
}

async function authedClient(email, pass) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: pass });
  assert(!error, `sign in test user: ${error?.message}`);
  return client;
}

async function createRuleAsOwner(client, tender, overrides) {
  const payload = {
    user_id: state.userA.id,
    name: overrides.name,
    keyword: overrides.keyword,
    exclude_keyword: overrides.exclude_keyword ?? null,
    agency_name: tender.agency_name,
    region: tender.region,
    prefecture: tender.prefecture,
    tender_type: tender.tender_type,
    participation_condition: tender.qualification_required ? "other_conditions" : "not_required",
    defense_only: Boolean(tender.is_defense),
    open_counter_only: tender.tender_type === "open_counter",
    qualification_required_only: false,
    deadline_soon_only: false,
    min_days_until_deadline: 0,
    include_unknown_deadline: true,
    app_enabled: true,
    email_enabled: Boolean(overrides.email_enabled),
    is_active: Boolean(overrides.is_active)
  };
  const { data, error } = await client.from("tender_notifications").insert(payload).select("*").single();
  assert(!error, `create notification rule: ${error?.message}`);
  state.ruleIds.push(data.id);
  return data;
}

async function updateRuleAsOwner(client, id, patch) {
  const { error } = await client.from("tender_notifications").update(patch).eq("id", id);
  assert(!error, `owner updates rule: ${error?.message}`);
}

async function ownerCanSelectRule(client, id) {
  const { data, error } = await client.from("tender_notifications").select("id").eq("id", id);
  assert(!error, `owner selects rule: ${error?.message}`);
  return (data ?? []).length === 1;
}

async function otherCannotSelectRule(client, id) {
  const { data, error } = await client.from("tender_notifications").select("id").eq("id", id);
  return Boolean(error) || (data ?? []).length === 0;
}

async function anonymousCannotSelectRule(client, id) {
  const { data, error } = await client.from("tender_notifications").select("id").eq("id", id);
  return Boolean(error) || (data ?? []).length === 0;
}

async function ownerCanSelectEvent(client, id) {
  const { data, error } = await client.from("tender_notification_events").select("id").eq("id", id);
  assert(!error, `owner selects event: ${error?.message}`);
  return (data ?? []).length === 1;
}

async function otherCannotSelectEvent(client, id) {
  const { data, error } = await client.from("tender_notification_events").select("id").eq("id", id);
  return Boolean(error) || (data ?? []).length === 0;
}

async function otherCannotUpdateEvent(client, id) {
  const { error } = await client.from("tender_notification_events").update({ is_read: true }).eq("id", id);
  const event = await serviceSelectSingle("tender_notification_events", "id,is_read", id);
  return Boolean(error) || event.is_read === false;
}

async function markEventRead(client, id) {
  const { error } = await client.from("tender_notification_events").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id);
  assert(!error, `mark event read: ${error?.message}`);
}

async function markAllRead(client) {
  const { error } = await client
    .from("tender_notification_events")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", state.userA.id)
    .eq("is_read", false);
  assert(!error, `mark all read: ${error?.message}`);
}

async function deleteEventAsOwner(client, id) {
  const { error } = await client.from("tender_notification_events").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  assert(!error, `soft delete event: ${error?.message}`);
}

async function softDeleteRuleAsOwner(client, id) {
  const { error } = await client.from("tender_notifications").update({ deleted_at: new Date().toISOString(), is_active: false }).eq("id", id);
  assert(!error, `soft delete rule: ${error?.message}`);
}

async function resetEventUnread(id) {
  const { error } = await service.from("tender_notification_events").update({ is_read: false, read_at: null }).eq("id", id);
  assert(!error, `reset event unread: ${error?.message}`);
}

async function countUnreadEvents(userId) {
  const { count, error } = await service
    .from("tender_notification_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)
    .is("deleted_at", null);
  assert(!error, `count unread events: ${error?.message}`);
  return count ?? 0;
}

async function readSingleEvent(ruleId, tenderId) {
  const { data, error } = await service
    .from("tender_notification_events")
    .select("*")
    .eq("notification_rule_id", ruleId)
    .eq("tender_id", tenderId)
    .eq("user_id", state.userA.id)
    .single();
  assert(!error, `read created event: ${error?.message}`);
  return data;
}

async function readOutboxForEvent(eventId) {
  const { data, error } = await service.from("tender_notification_email_outbox").select("*").eq("notification_event_id", eventId);
  assert(!error, `read outbox: ${error?.message}`);
  return data ?? [];
}

async function readActiveEventsByIds(ids) {
  if (!ids.length) return [];
  const { data, error } = await service.from("tender_notification_events").select("id").in("id", ids).is("deleted_at", null);
  assert(!error, `read active events: ${error?.message}`);
  return data ?? [];
}

async function createSyntheticTender(title, { expired = false, sourceClosed = false }) {
  const now = new Date();
  const deadline = expired ? new Date(now.getTime() - 86_400_000).toISOString() : null;
  const detailMemo = sourceClosed ? "調達ポータル公開終了日=2000-01-01" : null;
  const { data, error } = await service
    .from("tenders")
    .insert({
      title,
      agency_name: "E2Eテスト機関",
      tender_type: "goods",
      region: "全国",
      prefecture: "未設定",
      published_at: now.toISOString(),
      deadline_at: deadline,
      bid_at: null,
      qualification_required: false,
      required_qualification: null,
      source_url: `${productionBaseUrl}/tenders/e2e-${encodeURIComponent(title)}`,
      pdf_url: null,
      detail_memo: detailMemo,
      is_admin_verified: true,
      is_new: true,
      is_deadline_soon: false,
      is_defense: false,
      status: "published",
      fetched_at: now.toISOString()
    })
    .select("*")
    .single();
  assert(!error, `create synthetic tender: ${error?.message}`);
  state.tenderIds.push(data.id);
  return data;
}

function runMatcher(tenderId) {
  const result = spawnSync(process.execPath, [
    "scripts/match-tender-notifications.mjs",
    "--mode=apply",
    `--tender-id=${tenderId}`,
    "--no-log",
    "--sample=5"
  ], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(`notification matcher failed: ${result.stderr || result.stdout}`);
  }
  const parsed = parseJsonFromOutput(result.stdout);
  assert(parsed, "notification matcher returns JSON summary");
  return parsed;
}

async function serviceSelectSingle(table, columns, id) {
  const { data, error } = await service.from(table).select(columns).eq("id", id).single();
  assert(!error, `${table} select single: ${error?.message}`);
  return data;
}

async function checkTenderDetail(id) {
  try {
    const response = await fetch(`${productionBaseUrl}/tenders/${id}`, { redirect: "manual" });
    return response.status === 200;
  } catch {
    return false;
  }
}

async function countActiveRules() {
  const { count, error } = await service
    .from("tender_notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .is("deleted_at", null);
  if (error) return null;
  return count ?? 0;
}

async function cleanupAll() {
  await cleanupByPrefix(prefix);
  for (const user of [state.userA, state.userB].filter(Boolean)) {
    const { error } = await service.auth.admin.deleteUser(user.id);
    if (error) summary.warnings.push(`test auth user cleanup warning: ${error.message}`);
  }
}

async function cleanupByPrefix(value) {
  const ruleIds = await idsFrom("tender_notifications", (query) => query.select("id").ilike("name", `${value}%`), { tolerateMissing: true });
  const tenderIds = await idsFrom("tenders", (query) => query.select("id").ilike("title", `${value}%`), { tolerateMissing: true });
  const userIds = [state.userA?.id, state.userB?.id].filter(Boolean);

  if (ruleIds.length || userIds.length) {
    let outboxQuery = service.from("tender_notification_email_outbox").delete();
    if (ruleIds.length && userIds.length) outboxQuery = outboxQuery.or(`notification_rule_id.in.(${ruleIds.join(",")}),user_id.in.(${userIds.join(",")})`);
    else if (ruleIds.length) outboxQuery = outboxQuery.in("notification_rule_id", ruleIds);
    else outboxQuery = outboxQuery.in("user_id", userIds);
    await outboxQuery;
  }
  if (ruleIds.length || userIds.length) {
    let eventQuery = service.from("tender_notification_events").delete();
    if (ruleIds.length && userIds.length) eventQuery = eventQuery.or(`notification_rule_id.in.(${ruleIds.join(",")}),user_id.in.(${userIds.join(",")})`);
    else if (ruleIds.length) eventQuery = eventQuery.in("notification_rule_id", ruleIds);
    else eventQuery = eventQuery.in("user_id", userIds);
    await eventQuery;
  }
  if (ruleIds.length) await service.from("tender_notifications").delete().in("id", ruleIds);
  if (tenderIds.length) await service.from("tenders").delete().in("id", tenderIds);
}

async function verifyCleanup() {
  summary.cleanup.test_rules_remaining = await countByPrefix("tender_notifications", "name");
  summary.cleanup.test_tenders_remaining = await countByPrefix("tenders", "title");
  const userIds = [state.userA?.id, state.userB?.id].filter(Boolean);
  summary.cleanup.test_events_remaining = userIds.length ? await countIn("tender_notification_events", "user_id", userIds) : 0;
  summary.cleanup.test_outbox_remaining = userIds.length ? await countIn("tender_notification_email_outbox", "user_id", userIds) : 0;
  summary.cleanup.active_rule_count_after = await countActiveRules();
  summary.cleanup.test_users_deleted = true;
  assert(summary.cleanup.test_rules_remaining === 0, "test rules cleanup complete");
  assert(summary.cleanup.test_events_remaining === 0, "test events cleanup complete");
  assert(summary.cleanup.test_outbox_remaining === 0, "test outbox cleanup complete");
  assert(summary.cleanup.test_tenders_remaining === 0, "test tenders cleanup complete");
  assert(summary.cleanup.active_rule_count_before === summary.cleanup.active_rule_count_after, "active rule count restored");
}

async function idsFrom(table, buildQuery, options = {}) {
  const { data, error } = await buildQuery(service.from(table));
  if (error && options.tolerateMissing && isSchemaError(error)) return [];
  assert(!error, `read ids from ${table}: ${error ? formatError(error) : ""}`);
  return (data ?? []).map((row) => row.id);
}

async function countByPrefix(table, column) {
  const { count, error } = await service.from(table).select("id", { count: "exact", head: true }).ilike(column, `${prefix}%`);
  if (error && isSchemaError(error)) return 0;
  assert(!error, `count ${table} by prefix: ${error ? formatError(error) : ""}`);
  return count ?? 0;
}

async function countIn(table, column, values) {
  const { count, error } = await service.from(table).select("id", { count: "exact", head: true }).in(column, values);
  if (error && isSchemaError(error)) return 0;
  assert(!error, `count ${table} in ${column}: ${error ? formatError(error) : ""}`);
  return count ?? 0;
}

function isNotificationEligible(tender) {
  if (tender.status !== "published") return false;
  const deadline = deadlineStatus(tender);
  const availability = sourceAvailability(tender);
  if (deadline.status === "expired" || availability.status === "source_closed") return false;
  return deadline.status === "active" || deadline.status === "closing_soon" || deadline.status === "unknown";
}

function deadlineStatus(tender) {
  const value = normalizeIso(tender.deadline_at) ?? normalizeIso(tender.bid_at);
  if (!value) return { status: "unknown", daysUntil: null };
  const days = daysUntil(value);
  if (days < 0) return { status: "expired", daysUntil: days };
  if (days <= 7) return { status: "closing_soon", daysUntil: days };
  return { status: "active", daysUntil: days };
}

function sourceAvailability(tender) {
  const publicEnd = String(tender.detail_memo ?? "").match(/調達ポータル公開終了日=(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
  if (!publicEnd) return { status: "source_unknown" };
  return publicEnd < jstDateOnly(new Date()) ? { status: "source_closed" } : { status: "source_open" };
}

function isQualityNg(tender) {
  const title = String(tender.title ?? "").replace(/\s+/g, "").trim();
  if (!title || title.length <= 3) return true;
  return [
    /^オープンカウンター方式(?:とは|について)?$/,
    /^入札[・･]落札情報はこちら$/,
    /入札情報のページに掲載/,
    /標準契約条項|契約条項|請書条項|特約条項|特別条項/,
    /情報の公開|情報の公表|公共調達の適正化/,
    /様式|書式|記入例|リンク集|サイトマップ|お知らせ|説明|案内図/,
    /^(?:公表|掲載|案内|一覧)$/
  ].some((pattern) => pattern.test(title));
}

function normalizeIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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

function parseJsonFromOutput(value) {
  const trimmed = String(value ?? "").trim();
  const start = trimmed.lastIndexOf("\n{");
  const jsonText = start >= 0 ? trimmed.slice(start + 1) : trimmed;
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function formatError(error) {
  return [
    error.code ? `code=${error.code}` : null,
    error.message ? `message=${error.message}` : null,
    error.details ? `details=${error.details}` : null,
    error.hint ? `hint=${error.hint}` : null
  ].filter(Boolean).join(" ");
}

function isSchemaError(error) {
  const text = formatError(error);
  return /PGRST|schema cache|does not exist|Could not find|relation|column/i.test(text);
}

function assert(condition, message) {
  if (!condition) {
    summary.checks.push({ ok: false, message });
    throw new Error(message);
  }
  summary.checks.push({ ok: true, message });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  summary.error = error.message;
  try {
    await cleanupAll();
    await verifyCleanup();
  } catch (cleanupError) {
    summary.cleanup_error = cleanupError.message;
  }
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
});
