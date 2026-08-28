import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildEvidenceHash,
  generateOpaqueToken,
  hashOtp,
  identityNamesMatch,
  isValidOpaqueToken,
  isValidOtp,
  maskEmail,
  secureHexEqual,
  sha256,
  stableJson
} from "../lib/econtracts/crypto.ts";
import {
  PURCHASE_INTENT_IMPORTANT_ITEMS,
  VEHICLE_CONFIRMATION_IMPORTANT_ITEMS,
  buildPurchaseIntentDocument,
  buildVehicleConfirmationDocument
} from "../lib/econtracts/templates.ts";
import {
  ECONTRACT_REQUIRED_CONFIG_KEYS,
  evaluateEcontractFeatureGate,
  getEcontractAvailability,
  getOtpChallengeAvailability,
  validateConsentIds,
  validateVehicleConfirmationTerms
} from "../lib/econtracts/rules.ts";
import type { EcontractCustomerSnapshot, VehicleConfirmationTerms } from "../lib/econtracts/types.ts";

const customer: EcontractCustomerSnapshot = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "山田 太郎",
  kana: "ヤマダ タロウ",
  email: "taro.yamada@example.com",
  phone: "090-0000-0000",
  postalCode: "100-0001",
  address: "東京都千代田区"
};

const vehicleTerms: VehicleConfirmationTerms = {
  vehicleType: "car",
  maker: "トヨタ",
  model: "プリウス",
  grade: "S",
  modelCode: "ZVW50",
  firstRegistration: "2022年3月",
  mileage: 25000,
  chassisNumber: "ZVW50-1234567",
  chassisNumberStatus: "confirmed",
  vehiclePrice: 1_800_000,
  fees: 200_000,
  totalPrice: 2_000_000,
  downPayment: 200_000,
  tradeInAmount: 0,
  financedAmount: 1_800_000,
  installmentCount: 60,
  firstPaymentAmount: 35_000,
  monthlyPayment: 33_000,
  bonusPayment: "なし",
  deliveryMethod: "店頭納車",
  deliveryEstimate: "2026年10月上旬",
  warranty: "6か月または5,000km",
  specialTerms: "現状販売ではありません",
  auctionPurchase: true
};

const completeFeatureEnvironment = {
  ECONTRACT_ENABLED: "true",
  ECONTRACT_BASE_URL: "https://contracts.example.com",
  ECONTRACT_RESEND_API_KEY: "resend-test-key",
  ECONTRACT_EMAIL_FROM: "contracts@example.com",
  ECONTRACT_OTP_PEPPER: "otp-test-pepper"
};

test("e-contract feature gate is disabled unless explicitly true with all dedicated settings", () => {
  assert.equal(evaluateEcontractFeatureGate({}).enabled, false);
  assert.equal(evaluateEcontractFeatureGate({ ...completeFeatureEnvironment, ECONTRACT_ENABLED: "false" }).enabled, false);
  assert.equal(evaluateEcontractFeatureGate({ ...completeFeatureEnvironment, ECONTRACT_ENABLED: "TRUE" }).enabled, false);
  const incomplete = evaluateEcontractFeatureGate({ ...completeFeatureEnvironment, ECONTRACT_OTP_PEPPER: " " });
  assert.equal(incomplete.explicitlyEnabled, true);
  assert.equal(incomplete.enabled, false);
  assert.deepEqual(incomplete.missingKeys, ["ECONTRACT_OTP_PEPPER"]);
  assert.equal(evaluateEcontractFeatureGate(completeFeatureEnvironment).enabled, true);
  assert.deepEqual(ECONTRACT_REQUIRED_CONFIG_KEYS, [
    "ECONTRACT_BASE_URL",
    "ECONTRACT_RESEND_API_KEY",
    "ECONTRACT_EMAIL_FROM",
    "ECONTRACT_OTP_PEPPER"
  ]);
});

test("URL tokens have 256-bit entropy shape and only hashes need persistence", () => {
  const tokens = new Set(Array.from({ length: 200 }, generateOpaqueToken));
  assert.equal(tokens.size, 200);
  for (const token of tokens) {
    assert.equal(isValidOpaqueToken(token), true);
    assert.equal(token.length, 43);
    assert.match(sha256(token), /^[0-9a-f]{64}$/);
  }
  assert.equal(isValidOpaqueToken("short-or-guessable"), false);
});

test("OTP values are validated and stored as keyed hashes", () => {
  const hash = hashOtp("contract-1", "123456", "test-pepper");
  const same = hashOtp("contract-1", "123456", "test-pepper");
  const wrong = hashOtp("contract-1", "654321", "test-pepper");
  const otherContract = hashOtp("contract-2", "123456", "test-pepper");
  assert.equal(isValidOtp("123456"), true);
  assert.equal(isValidOtp("12345"), false);
  assert.equal(secureHexEqual(hash, same), true);
  assert.equal(secureHexEqual(hash, wrong), false);
  assert.equal(secureHexEqual(hash, otherContract), false);
  assert.equal(hash.includes("123456"), false);
});

test("expired and cancelled links are rejected while signed controls stay readable", () => {
  const now = Date.parse("2026-08-28T00:00:00.000Z");
  assert.equal(getEcontractAvailability("sent", "2026-08-27T23:59:59.000Z", now), "expired");
  assert.equal(getEcontractAvailability("sent", "not-a-date", now), "expired");
  assert.equal(getEcontractAvailability("cancelled", "2026-08-29T00:00:00.000Z", now), "cancelled");
  assert.equal(getEcontractAvailability("signed", "2026-08-01T00:00:00.000Z", now), "signed");
});

test("OTP expiry, invalidation, verification and attempt lock are distinct", () => {
  const now = Date.parse("2026-08-28T00:00:00.000Z");
  const pending = { invalidated_at: null, verified_at: null, expires_at: "2026-08-28T00:10:00.000Z", attempt_count: 0, max_attempts: 5 };
  assert.equal(getOtpChallengeAvailability(null, now), "missing");
  assert.equal(getOtpChallengeAvailability({ ...pending, expires_at: "2026-08-27T23:59:59.000Z" }, now), "expired");
  assert.equal(getOtpChallengeAvailability({ ...pending, attempt_count: 5 }, now), "locked");
  assert.equal(getOtpChallengeAvailability({ ...pending, invalidated_at: "2026-08-27T23:55:00.000Z" }, now), "invalidated");
  assert.equal(getOtpChallengeAvailability({ ...pending, verified_at: "2026-08-27T23:55:00.000Z" }, now), "verified");
  assert.equal(getOtpChallengeAvailability(pending, now), "pending");
});

test("identity matching tolerates harmless Japanese spacing but rejects another customer", () => {
  assert.equal(identityNamesMatch("山田　太郎", "山田 太郎"), true);
  assert.equal(identityNamesMatch("ﾔﾏﾀﾞ ﾀﾛｳ", "ヤマダタロウ"), true);
  assert.equal(identityNamesMatch("山田 次郎", "山田 太郎"), false);
  assert.equal(maskEmail("taro.yamada@example.com"), "ta********@example.com");
});

test("stage-one snapshot contains all required legal and business concepts", () => {
  const document = buildPurchaseIntentDocument(customer, "car");
  const unreachableCancellation = PURCHASE_INTENT_IMPORTANT_ITEMS.find((item) => item.id === "unreachable_cancellation");
  assert.equal(PURCHASE_INTENT_IMPORTANT_ITEMS.length, 8);
  assert.equal(
    unreachableCancellation?.text,
    "当社が記録が残る方法で最終連絡を行い、その最終連絡後3営業日以内に回答がない場合、個別事情を確認した上で申込者都合のキャンセルとして扱うことがあると理解しました。"
  );
  assert.match(
    document.text,
    /記録が残る方法で最終連絡を行い、その最終連絡後3営業日以内に回答がない場合、個別事情を確認した上で申込者都合のキャンセルとして扱うことがあります。/
  );
  assert.doesNotMatch(document.text, /最後の連絡または回答から3営業日/);
  assert.doesNotMatch(unreachableCancellation?.text ?? "", /所定期間/);
  for (const phrase of [
    "一般的・汎用的なローン承認を意味するものではなく",
    "他店で同一条件の可決が得られる保証はなく",
    "1か月以上",
    "一律30日",
    "3営業日",
    "3万円を基準",
    "平均的な損害",
    "同一損害を重ねて請求しません",
    "個別車両購入確認書"
  ]) assert.match(document.text, new RegExp(phrase));
  assert.equal(document.html.includes(customer.name), true);
  assert.match(sha256(document.text), /^[0-9a-f]{64}$/);
});

test("stage-two snapshot records vehicle, payment, procurement and separate-contract terms", () => {
  const document = buildVehicleConfirmationDocument(customer, vehicleTerms);
  assert.equal(VEHICLE_CONFIRMATION_IMPORTANT_ITEMS.length, 6);
  for (const phrase of ["ZVW50-1234567", "2,000,000円", "60回", "店頭納車", "オークション仕入れ", "落札、仕入、陸送、登録準備", "置き換えるものではありません"]) {
    assert.match(document.text, new RegExp(phrase));
  }
  const changed = buildVehicleConfirmationDocument(customer, { ...vehicleTerms, totalPrice: 2_100_000 });
  assert.notEqual(sha256(document.text), sha256(changed.text));
});

test("customer-controlled values are HTML escaped in immutable snapshots", () => {
  const attacked = buildPurchaseIntentDocument({ ...customer, name: "<script>alert(1)</script>" }, "bike");
  assert.equal(attacked.html.includes("<script>"), false);
  assert.equal(attacked.html.includes("&lt;script&gt;"), true);
});

test("all individual consents are required and duplicate IDs do not bypass the gate", () => {
  const expected = PURCHASE_INTENT_IMPORTANT_ITEMS.map((item) => item.id);
  assert.equal(validateConsentIds(expected, expected), true);
  assert.equal(validateConsentIds(expected, expected.slice(1)), false);
  assert.equal(validateConsentIds(expected, Array(expected.length).fill(expected[0])), false);
  assert.equal(validateConsentIds(expected, [...expected, "unexpected"]), false);
});

test("vehicle conditions reject inconsistent totals and accept a complete stage-two contract", () => {
  assert.deepEqual(validateVehicleConfirmationTerms(vehicleTerms), []);
  const errors = validateVehicleConfirmationTerms({ ...vehicleTerms, totalPrice: 9, financedAmount: 9, installmentCount: 0, deliveryMethod: "" });
  assert.ok(errors.some((error) => error.includes("支払総額")));
  assert.ok(errors.some((error) => error.includes("支払回数")));
  assert.ok(errors.some((error) => error.includes("納車方法")));
});

test("evidence hashes are canonical and change if signed evidence changes", () => {
  assert.equal(stableJson({ b: 2, a: 1 }), stableJson({ a: 1, b: 2 }));
  const base = { documentHash: "abc", signedAt: "2026-08-28T00:00:00.000Z", consents: ["a", "b"] };
  assert.equal(buildEvidenceHash(base), buildEvidenceHash({ signedAt: base.signedAt, consents: base.consents, documentHash: base.documentHash }));
  assert.notEqual(buildEvidenceHash(base), buildEvidenceHash({ ...base, signedAt: "2026-08-28T00:00:01.000Z" }));
});

test("migration enforces RLS, no direct browser grants, active uniqueness and immutability", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260828083618_create_sales_econtracts.sql", import.meta.url), "utf8");
  for (const table of ["sales_econtracts", "sales_econtract_access_sessions", "sales_econtract_verifications", "sales_econtract_events"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`, "i"));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated, service_role`, "i"));
  }
  assert.match(sql, /sales_econtracts_one_active_kind_uidx/);
  assert.match(sql, /issued sales e-contract snapshots are immutable/);
  assert.match(sql, /signed sales e-contract evidence is immutable/);
  assert.match(sql, /verified sales e-contract verification evidence is immutable/);
  assert.match(sql, /sales_econtract_complete_otp_verification/);
  assert.match(sql, /sales_econtract_verifications_access_session_idx/);
  assert.match(sql, /access_session_id uuid not null references public\.sales_econtract_access_sessions/);
  assert.match(sql, /sales e-contract events are append-only/);
  assert.match(sql, /grant select, insert, update on table public\.sales_econtracts to service_role/i);
  assert.match(sql, /grant select, insert on table public\.sales_econtract_events to service_role/i);
  assert.doesNotMatch(sql, /grant\s+all\s+on\s+table\s+public\.sales_econtract/i);
  assert.doesNotMatch(sql, /grant\s+[^;]*(?:delete|truncate)[^;]*on\s+table\s+public\.sales_econtracts\s+to\s+service_role/i);
  assert.doesNotMatch(sql, /grant\s+[^;]*(?:delete|truncate)[^;]*on\s+table\s+public\.sales_econtract_verifications\s+to\s+service_role/i);
  assert.doesNotMatch(sql, /grant\s+[^;]*(?:update|delete|truncate)[^;]*on\s+table\s+public\.sales_econtract_events\s+to\s+service_role/i);
  assert.doesNotMatch(sql, /grant\s+(?:select|insert|update|delete|all).*\s+to\s+(?:anon|authenticated)/i);
});

test("applied e-contract schemas get an exact service role privilege repair", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260828140700_restrict_sales_econtract_service_role_privileges.sql", import.meta.url), "utf8");
  for (const table of ["sales_econtracts", "sales_econtract_access_sessions", "sales_econtract_verifications", "sales_econtract_events"]) {
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from service_role`, "i"));
  }
  assert.match(sql, /grant select, insert, update on table public\.sales_econtracts to service_role/i);
  assert.match(sql, /grant select, insert, update, delete on table public\.sales_econtract_access_sessions to service_role/i);
  assert.match(sql, /grant select, insert, update on table public\.sales_econtract_verifications to service_role/i);
  assert.match(sql, /grant select, insert on table public\.sales_econtract_events to service_role/i);
  assert.doesNotMatch(sql, /grant\s+[^;]*(?:truncate|references|trigger)[^;]*to\s+service_role/i);
});

test("public signing is token- and identity-session-bound while admin views are role-bound", async () => {
  const [server, customerActions, adminPage, adminActions] = await Promise.all([
    readFile(new URL("../lib/econtracts/server.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/econtracts/[token]/actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/econtracts/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/sales-contracts/econtract-actions.ts", import.meta.url), "utf8")
  ]);
  assert.match(server, /\.eq\("link_token_hash", sha256\(token\)\)/);
  assert.match(server, /\.eq\("econtract_id", econtractId\)[\s\S]*\.eq\("delivery_revision", deliveryRevision\)[\s\S]*\.eq\("session_token_hash", sha256\(rawSession\)\)/);
  assert.match(server, /getLatestVerification\([\s\S]*options: \{ accessSessionId\?: string; includeInvalidated\?: boolean \}/);
  assert.match(customerActions, /getLatestVerification\(econtract\.id, econtract\.delivery_revision, \{ includeInvalidated: true \}\)/);
  assert.match(customerActions, /getLatestVerification\(econtract\.id, econtract\.delivery_revision, \{ accessSessionId: accessSession\.id \}\)/);
  assert.match(customerActions, /p_access_session_id: accessSession\.id/);
  assert.match(adminActions, /Number\.isSafeInteger\(parsed\)/);
  assert.match(customerActions, /\.eq\("status", "verified"\)\.is\("signed_at", null\)/);
  assert.match(adminPage, /await requireAdmin\(\)/);
  assert.match(adminActions, /const admin = await requireAdmin\(\)/);
  assert.doesNotMatch(adminActions, /\.from\("sales_contracts"\)\.update\(/);
});

test("disabled gate blocks public, admin, email, OTP and database entry points without legacy fallbacks", async () => {
  const [server, email, customerActions, customerPage, customerPrintPage, adminActions, adminPage, adminPrintPage, adminCard] = await Promise.all([
    readFile(new URL("../lib/econtracts/server.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/econtracts/email.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/econtracts/[token]/actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/econtracts/[token]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/econtracts/[token]/print/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/sales-contracts/econtract-actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/econtracts/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/econtracts/[id]/print/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/econtracts/EcontractAdminCard.tsx", import.meta.url), "utf8")
  ]);

  assert.match(server, /ECONTRACT_ENABLED: process\.env\.ECONTRACT_ENABLED/);
  assert.match(server, /requireEcontractServiceClient\(\) \{\n  requireEcontractFeatureEnabled\(\);/);
  assert.match(server, /findEcontractByToken\(token: string\) \{\n  if \(!isEcontractFeatureEnabled\(\)\) return null;/);
  assert.match(email, /if \(!isEcontractFeatureEnabled\(\)\) return null;/);
  assert.match(email, /if \(!isEcontractFeatureEnabled\(\)\) \{[\s\S]*return \{ ok: false/);
  assert.doesNotMatch(email, /DIAGNOSIS_|NEXT_PUBLIC_APP_URL|VERCEL_PROJECT_PRODUCTION_URL/);
  assert.doesNotMatch(customerActions, /DIAGNOSIS_|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(customerActions, /return process\.env\.ECONTRACT_OTP_PEPPER\?\.trim\(\) \|\| null;/);
  for (const action of [
    "confirmEcontractIdentityAction",
    "sendEcontractOtpAction",
    "verifyEcontractOtpAction",
    "signEcontractAction"
  ]) {
    assert.match(customerActions, new RegExp(`export async function ${action}\\(formData: FormData\\) \\{\\n  requirePublicEcontractFeature\\(\\);`));
  }
  assert.match(customerActions, /if \(!isEcontractFeatureEnabled\(\)\) notFound\(\);/);
  assert.match(customerPage, /if \(!econtract\) notFound\(\);/);
  assert.match(customerPrintPage, /if \(!contract \|\| contract\.status !== "signed"\) notFound\(\);/);
  for (const action of [
    "issuePurchaseIntentEcontractAction",
    "issueVehicleConfirmationEcontractAction",
    "resendEcontractAction",
    "cancelEcontractAction"
  ]) {
    assert.match(adminActions, new RegExp(`export async function ${action}\\(formData: FormData\\)[\\s\\S]*?requireAdminEcontractFeature\\(contractId\\);`));
  }
  assert.match(adminActions, /requireEcontractFeatureEnabled\(\);/);
  for (const adminSurface of [adminPage, adminPrintPage, adminCard]) {
    assert.match(adminSurface, /電子契約機能は現在無効です|ECONTRACT_DISABLED_MESSAGE/);
  }
});
