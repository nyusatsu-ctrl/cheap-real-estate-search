#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

loadLocalEnv();

const url = process.env.TENDER_SUPABASE_URL;
const anonKey = process.env.TENDER_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.TENDER_SUPABASE_SERVICE_ROLE_KEY;
const apply = process.argv.includes("--apply");
const prefix = `E2E_TEST_TENDER_ACCESS_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
const password = `E2e-${Math.random().toString(36).slice(2)}-${Date.now()}!`;

if (!url || !anonKey || !serviceRoleKey) {
  console.error("TENDER_SUPABASE_URL, TENDER_SUPABASE_ANON_KEY and TENDER_SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const service = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

const state = {
  userA: null,
  userB: null,
  accessIds: [],
  eventIds: []
};

const summary = {
  event: "tender_access_e2e",
  mode: apply ? "apply" : "dry_run",
  prefix,
  migration: {
    tender_user_access: false,
    tender_payment_events: false,
    columns: {},
    unique_email_hash_verified: false,
    unique_subscription_verified: false,
    rls_verified: false
  },
  access: {
    trial_created: false,
    trial_days: null,
    expired_updated: false,
    active_updated: false,
    past_due_updated: false,
    canceled_updated: false,
    admin_row_supported: false
  },
  rls: {
    owner_select: false,
    owner_update_blocked: false,
    other_select_blocked: false,
    other_update_blocked: false,
    anonymous_select_blocked: false
  },
  webhook_idempotency: {
    first_insert_ok: false,
    duplicate_insert_blocked: false
  },
  cleanup: {
    access_remaining: null,
    events_remaining: null,
    users_deleted: false
  },
  checks: [],
  warnings: []
};

async function main() {
  await verifyMigrationShape();

  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  await createTestUsers();
  await cleanupByPrefix(prefix);

  const owner = await authedClient(state.userA.email, password);
  const other = await authedClient(state.userB.email, password);
  const anonymous = createClient(url, anonKey, { auth: { persistSession: false } });

  const trial = await createAccessRow(state.userA, "trialing");
  summary.access.trial_created = Boolean(trial.id);
  summary.access.trial_days = daysBetween(trial.trial_started_at, trial.trial_ends_at);
  assert(summary.access.trial_days === 14, "trial length is 14 days");

  summary.rls.owner_select = await ownerCanSelect(owner, trial.id);
  summary.rls.owner_update_blocked = await cannotUpdate(owner, trial.id);
  summary.rls.other_select_blocked = await cannotSelect(other, trial.id);
  summary.rls.other_update_blocked = await cannotUpdate(other, trial.id);
  summary.rls.anonymous_select_blocked = await cannotSelect(anonymous, trial.id);
  summary.migration.rls_verified = Object.values(summary.rls).every(Boolean);

  const duplicateEmail = await service.from("tender_user_access").insert({
    user_id: state.userB.id,
    email: state.userA.email,
    email_hash: emailHash(state.userA.email),
    product_code: "tenders",
    subscription_status: "trialing",
    trial_started_at: new Date().toISOString(),
    trial_ends_at: new Date(Date.now() + 14 * 86_400_000).toISOString()
  });
  summary.migration.unique_email_hash_verified = Boolean(duplicateEmail.error);
  assert(summary.migration.unique_email_hash_verified, "email hash unique constraint blocks repeated trial");

  await setStatus(trial.id, "expired", { trial_ends_at: new Date(Date.now() - 86_400_000).toISOString() });
  summary.access.expired_updated = (await readAccess(trial.id)).subscription_status === "expired";
  await setStatus(trial.id, "active", {
    payment_customer_id: `cus_${prefix}`,
    payment_subscription_id: `sub_${prefix}`,
    current_period_end: new Date(Date.now() + 31 * 86_400_000).toISOString()
  });
  summary.access.active_updated = (await readAccess(trial.id)).subscription_status === "active";
  await setStatus(trial.id, "past_due");
  summary.access.past_due_updated = (await readAccess(trial.id)).subscription_status === "past_due";
  await setStatus(trial.id, "canceled", { cancel_at_period_end: true });
  summary.access.canceled_updated = (await readAccess(trial.id)).subscription_status === "canceled";

  const duplicateSubscription = await service.from("tender_user_access").insert({
    user_id: state.userB.id,
    email: state.userB.email,
    email_hash: emailHash(state.userB.email),
    product_code: "tenders",
    subscription_status: "active",
    payment_customer_id: `cus_duplicate_${prefix}`,
    payment_subscription_id: `sub_${prefix}`
  });
  summary.migration.unique_subscription_verified = Boolean(duplicateSubscription.error);
  assert(summary.migration.unique_subscription_verified, "subscription id unique constraint blocks duplicate billing link");

  const adminRow = await createAccessRow(state.userB, "admin");
  summary.access.admin_row_supported = adminRow.subscription_status === "admin";

  await verifyWebhookIdempotency();

  await cleanupAll();
  await verifyCleanup();
  console.log(JSON.stringify(summary, null, 2));
}

async function verifyMigrationShape() {
  const tableChecks = [
    [
      "tender_user_access",
      "id,user_id,email,email_hash,product_code,subscription_status,trial_started_at,trial_ends_at,current_period_end,cancel_at_period_end,payment_customer_id,payment_subscription_id,created_at,updated_at"
    ],
    ["tender_payment_events", "id,event_id,event_type,user_id,payment_customer_id,payment_subscription_id,payload,processed_at,created_at"]
  ];

  for (const [table, columns] of tableChecks) {
    const { error } = await service.from(table).select(columns).limit(1);
    summary.migration[table] = !error;
    summary.migration.columns[table] = error ? formatError(error) : "ok";
    assert(!error, `${table} columns are available${error ? `: ${formatError(error)}` : ""}`);
  }
}

async function createTestUsers() {
  const users = [];
  for (const label of ["a", "b"]) {
    const email = `${prefix.toLowerCase()}-${label}@example.invalid`;
    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { purpose: "tender_access_e2e" }
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

async function createAccessRow(user, status) {
  const now = new Date();
  const payload = {
    user_id: user.id,
    email: user.email,
    email_hash: emailHash(user.email),
    product_code: "tenders",
    subscription_status: status,
    trial_started_at: status === "trialing" ? now.toISOString() : null,
    trial_ends_at: status === "trialing" ? new Date(now.getTime() + 14 * 86_400_000).toISOString() : null
  };
  const { data, error } = await service.from("tender_user_access").insert(payload).select("*").single();
  assert(!error, `create access row: ${error?.message}`);
  state.accessIds.push(data.id);
  return data;
}

async function ownerCanSelect(client, id) {
  const { data, error } = await client.from("tender_user_access").select("id").eq("id", id);
  assert(!error, `owner selects access row: ${error?.message}`);
  return (data ?? []).length === 1;
}

async function cannotSelect(client, id) {
  const { data, error } = await client.from("tender_user_access").select("id").eq("id", id);
  return Boolean(error) || (data ?? []).length === 0;
}

async function cannotUpdate(client, id) {
  const { error } = await client.from("tender_user_access").update({ cancel_at_period_end: true }).eq("id", id);
  const row = await readAccess(id);
  return Boolean(error) || row.cancel_at_period_end === false;
}

async function setStatus(id, status, patch = {}) {
  const { error } = await service
    .from("tender_user_access")
    .update({ subscription_status: status, ...patch })
    .eq("id", id);
  assert(!error, `set status ${status}: ${error?.message}`);
}

async function readAccess(id) {
  const { data, error } = await service.from("tender_user_access").select("*").eq("id", id).single();
  assert(!error, `read access row: ${error?.message}`);
  return data;
}

async function verifyWebhookIdempotency() {
  const eventId = `evt_${prefix}`;
  const { data, error } = await service
    .from("tender_payment_events")
    .insert({
      event_id: eventId,
      event_type: "checkout.session.completed",
      user_id: state.userA.id,
      payload: { test: true }
    })
    .select("id")
    .single();
  assert(!error, `insert payment event: ${error?.message}`);
  state.eventIds.push(data.id);
  summary.webhook_idempotency.first_insert_ok = true;

  const duplicate = await service.from("tender_payment_events").insert({
    event_id: eventId,
    event_type: "checkout.session.completed",
    user_id: state.userA.id,
    payload: { test: true }
  });
  summary.webhook_idempotency.duplicate_insert_blocked = Boolean(duplicate.error);
  assert(summary.webhook_idempotency.duplicate_insert_blocked, "payment event unique constraint blocks duplicate webhook event");
}

async function cleanupAll() {
  await cleanupByPrefix(prefix);
  for (const user of [state.userA, state.userB].filter(Boolean)) {
    const { error } = await service.auth.admin.deleteUser(user.id);
    if (error) summary.warnings.push(`test auth user cleanup warning: ${error.message}`);
  }
}

async function cleanupByPrefix(value) {
  const accessIds = await idsFrom("tender_user_access", (query) => query.select("id").or(`email.ilike.${value.toLowerCase()}%,payment_customer_id.ilike.%${value}%,payment_subscription_id.ilike.%${value}%`), { tolerateMissing: true });
  const eventIds = await idsFrom("tender_payment_events", (query) => query.select("id").ilike("event_id", `%${value}%`), { tolerateMissing: true });
  if (eventIds.length) await service.from("tender_payment_events").delete().in("id", eventIds);
  if (accessIds.length) await service.from("tender_user_access").delete().in("id", accessIds);
}

async function verifyCleanup() {
  summary.cleanup.access_remaining = await countByPrefix("tender_user_access", "email", prefix.toLowerCase());
  summary.cleanup.events_remaining = await countByPrefix("tender_payment_events", "event_id", `evt_${prefix}`);
  summary.cleanup.users_deleted = true;
  assert(summary.cleanup.access_remaining === 0, "test access rows cleanup complete");
  assert(summary.cleanup.events_remaining === 0, "test payment events cleanup complete");
}

async function idsFrom(table, buildQuery, options = {}) {
  const { data, error } = await buildQuery(service.from(table));
  if (error && options.tolerateMissing && isSchemaError(error)) return [];
  assert(!error, `read ids from ${table}: ${error ? formatError(error) : ""}`);
  return (data ?? []).map((row) => row.id);
}

async function countByPrefix(table, column, value) {
  const { count, error } = await service.from(table).select("id", { count: "exact", head: true }).ilike(column, `${value}%`);
  if (error && isSchemaError(error)) return 0;
  assert(!error, `count ${table} by prefix: ${error ? formatError(error) : ""}`);
  return count ?? 0;
}

function emailHash(email) {
  return crypto.createHash("sha256").update(String(email).trim().toLowerCase()).digest("hex");
}

function daysBetween(start, end) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000);
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
