import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePropertyAccess } from "../lib/property-access.ts";

const now = new Date("2026-07-28T00:00:00.000Z");
const day = 86_400_000;

function trialInput(endOffsetDays: number) {
  return {
    role: "viewer",
    subscriptionStatus: "trialing",
    trialStartedAt: new Date(now.getTime() - (14 - endOffsetDays) * day).toISOString(),
    trialEndsAt: new Date(now.getTime() + endOffsetDays * day).toISOString(),
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false
  };
}

test("unauthenticated users cannot access property data", () => {
  const result = evaluatePropertyAccess(null, now);
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "not_authenticated");
});

test("new registration receives exactly 14 days of access", () => {
  const result = evaluatePropertyAccess({
    ...trialInput(14),
    trialStartedAt: now.toISOString()
  }, now);
  assert.equal(result.allowed, true);
  assert.equal(result.reason, "trial");
  assert.equal(result.remainingTrialDays, 14);
});

test("trial warning starts with three days remaining", () => {
  const result = evaluatePropertyAccess(trialInput(3), now);
  assert.equal(result.allowed, true);
  assert.equal(result.remainingTrialDays, 3);
  assert.equal(result.showTrialEndingWarning, true);
});

test("final trial day remains usable", () => {
  const result = evaluatePropertyAccess(trialInput(0.5), now);
  assert.equal(result.allowed, true);
  assert.equal(result.remainingTrialDays, 1);
});

test("expired or incomplete trial periods are rejected", () => {
  assert.equal(evaluatePropertyAccess(trialInput(-1), now).allowed, false);
  assert.equal(evaluatePropertyAccess({ ...trialInput(3), trialEndsAt: null }, now).allowed, false);
});

test("active subscription requires a future paid period end", () => {
  const active = {
    role: "viewer",
    subscriptionStatus: "active",
    trialStartedAt: null,
    trialEndsAt: null,
    currentPeriodEnd: new Date(now.getTime() + 30 * day).toISOString(),
    cancelAtPeriodEnd: true
  };
  assert.equal(evaluatePropertyAccess(active, now).allowed, true);
  assert.equal(evaluatePropertyAccess({ ...active, currentPeriodEnd: null }, now).allowed, false);
  assert.equal(evaluatePropertyAccess({ ...active, currentPeriodEnd: new Date(now.getTime() - 1).toISOString() }, now).allowed, false);
});

test("payment and inactive statuses are rejected", () => {
  for (const status of ["past_due", "unpaid", "canceled", "incomplete", "incomplete_expired", "paused", "unknown"]) {
    assert.equal(evaluatePropertyAccess({
      role: "viewer",
      subscriptionStatus: status,
      trialStartedAt: null,
      trialEndsAt: null,
      currentPeriodEnd: new Date(now.getTime() + 30 * day).toISOString(),
      cancelAtPeriodEnd: false
    }, now).allowed, false, status);
  }
});

test("administrator access does not depend on subscription state", () => {
  const result = evaluatePropertyAccess({
    role: "admin",
    subscriptionStatus: "canceled",
    trialStartedAt: null,
    trialEndsAt: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false
  }, now);
  assert.equal(result.allowed, true);
  assert.equal(result.reason, "admin");
});
