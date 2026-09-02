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
  ECONTRACT_DOCUMENT_TITLE,
  ECONTRACT_IMPORTANT_ITEMS,
  buildEcontractDocument
} from "../lib/econtracts/templates.ts";
import { buildEcontractLinkEmailContent } from "../lib/econtracts/email-content.ts";
import {
  ECONTRACT_REQUIRED_CONFIG_KEYS,
  canIssueLoanEcontract,
  evaluateEcontractFeatureGate,
  getEcontractAvailability,
  getEcontractStatusLabel,
  getOtpChallengeAvailability,
  validateConsentIds
} from "../lib/econtracts/rules.ts";
import type { EcontractCustomerSnapshot } from "../lib/econtracts/types.ts";
import { getAdminLoginPresentation } from "../lib/admin-login-presentation.ts";
import { isKnownAdminTestRecipient } from "../lib/econtracts/test-recipient.ts";

const customer: EcontractCustomerSnapshot = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "山田 太郎",
  kana: "ヤマダ タロウ",
  email: "taro.yamada@example.com",
  phone: "090-0000-0000",
  postalCode: "100-0001",
  address: "東京都千代田区"
};

const completeFeatureEnvironment = {
  ECONTRACT_ENABLED: "true",
  ECONTRACT_BASE_URL: "https://contracts.example.com",
  ECONTRACT_RESEND_API_KEY: "test-only",
  ECONTRACT_EMAIL_FROM: "contracts@example.com",
  ECONTRACT_OTP_PEPPER: "test-only"
};

test("loan contracts are eligible before screening without depending on approval state", () => {
  assert.equal(canIssueLoanEcontract({ contractType: "loan" }), true);
  assert.equal(canIssueLoanEcontract({ contractType: "cash" }), false);
  assert.equal(canIssueLoanEcontract({ contractType: "lease" }), false);
  assert.equal(canIssueLoanEcontract({ contractType: null }), false);
});

test("contract login branding covers sales and e-contract routes without changing diagnosis or GPS", async () => {
  for (const redirectTo of [
    "/admin/sales-contracts",
    "/admin/sales-contracts/id?tab=econtract",
    "/admin/econtracts/id",
    "/admin/econtracts/id/print"
  ]) {
    const presentation = getAdminLoginPresentation(redirectTo);
    assert.equal(presentation.kind, "contract");
    assert.equal(presentation.systemName, "契約管理システム");
    assert.equal(presentation.description, "契約台帳・電子契約・顧客情報を管理するアカウントでログインしてください。");
    assert.equal(presentation.metadataTitle, "管理者ログイン｜株式会社エコループ｜契約管理システム");
  }
  assert.equal(getAdminLoginPresentation("/admin/diagnoses").kind, "diagnosis");
  assert.equal(getAdminLoginPresentation("/admin/gps").kind, "gps");
  assert.equal(getAdminLoginPresentation("/admin/sales-contracts-other").kind, "diagnosis");

  const [loginPage, appHeader, globalStyles] = await Promise.all([
    readFile(new URL("../app/admin/login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/AppHeader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8")
  ]);
  assert.match(loginPage, /logoSrc="\/brand\/ecoloop-logo\.png"/);
  assert.match(loginPage, /openGraph:/);
  assert.match(loginPage, /twitter:/);
  assert.match(loginPage, /株式会社エコループ｜契約管理システム/);
  assert.match(appHeader, /useSearchParams/);
  assert.match(appHeader, /isSalesAdmin \|\| isContractLogin/);
  assert.match(appHeader, /pathname\.startsWith\("\/admin\/econtracts"\)/);
  assert.doesNotMatch(globalStyles, /data-admin-login-system="contract"/);
});

test("feature gate remains fail closed and dedicated", () => {
  assert.equal(evaluateEcontractFeatureGate({}).enabled, false);
  assert.equal(evaluateEcontractFeatureGate({ ...completeFeatureEnvironment, ECONTRACT_ENABLED: "false" }).enabled, false);
  assert.equal(evaluateEcontractFeatureGate({ ...completeFeatureEnvironment, ECONTRACT_ENABLED: "TRUE" }).enabled, false);
  assert.equal(evaluateEcontractFeatureGate({ ...completeFeatureEnvironment, ECONTRACT_OTP_PEPPER: " " }).enabled, false);
  assert.equal(evaluateEcontractFeatureGate(completeFeatureEnvironment).enabled, true);
  assert.deepEqual(ECONTRACT_REQUIRED_CONFIG_KEYS, [
    "ECONTRACT_BASE_URL",
    "ECONTRACT_RESEND_API_KEY",
    "ECONTRACT_EMAIL_FROM",
    "ECONTRACT_OTP_PEPPER"
  ]);
});

test("the formal one-stage document has the exact title and nine individual checks", () => {
  const expectedItems = [
    "本契約を締結してもローン審査の可決が保証されるものではなく、審査結果により購入手続を継続できない場合があることを理解しました。",
    "私は株式会社エコループから自動車またはバイクを購入する意思があり、車両探索その他の購入準備を依頼します。",
    "現時点で個別車両が未確定の場合があり、私が承認していない特定車両を一方的に購入させられるものではないことを理解しました。",
    "特定車両が提示された後、LINE、SMS、メールその他記録が残る方法で私が購入手続を承認した場合、株式会社エコループが落札・仕入・陸送・登録準備等へ進むことを理解しました。",
    "特定車両決定後は通常の売買契約書・注文書・割賦契約書等で条件を確認し、本契約と同じ電子契約を再度締結する必要は原則としてないことを理解しました。",
    "購入を中止する場合は連絡を途絶させず、株式会社エコループへ連絡します。",
    "最終確認後3営業日以内に回答がない場合、個別事情を確認した上で購入手続が停止・終了される場合があることを理解しました。ただし、回答しなかったことだけで特定車両の購入を承諾したことにはならないことを理解しました。",
    "自己都合による購入中止で株式会社エコループに損害または費用が生じた場合、3万円を一つの基準として費用が算定される場合がありますが、一律3万円ではなく、消費者契約法その他の法令上認められる範囲に限られることを理解しました。",
    "本契約を電子的方法で締結し、認証結果・締結日時その他の電子契約記録が証跡として保存されることに同意します。"
  ];
  const document = buildEcontractDocument(customer);
  assert.equal(document.title, ECONTRACT_DOCUMENT_TITLE);
  assert.equal(document.title, "自社ローン審査申込・購入手続継続確認契約書");
  assert.deepEqual(ECONTRACT_IMPORTANT_ITEMS.map((item) => item.text), expectedItems);
  assert.equal(new Set(ECONTRACT_IMPORTANT_ITEMS.map((item) => item.id)).size, 9);
  for (let article = 1; article <= 13; article += 1) assert.match(document.text, new RegExp(`第${article}条`));
  for (const phrase of [
    "本契約は特定の車両についての最終売買契約そのものではありませんが",
    "本契約の締結は、ローン審査の可決、特定の利用条件または融資実行を意味するものではありません。",
    "車両決定まで1か月以上を要する場合があります。",
    "その最終確認後3営業日以内に回答がなく",
    "3万円を無条件または一律に請求するものではありません。",
    "同一の損害または費用を重複して請求することはありません。",
    "本人に送信された認証コードを入力し"
  ]) assert.match(document.text, new RegExp(phrase));
  assert.doesNotMatch(document.text, /個別車両購入確認書を別途締結/);
  assert.doesNotMatch(document.text, /第2契約/);
  assert.doesNotMatch(document.text, /ローン審査が可決となった後/);
  assert.match(sha256(document.text), /^[0-9a-f]{64}$/);
});

test("customer-controlled document values are escaped", () => {
  const attacked = buildEcontractDocument({ ...customer, name: "<script>alert(1)</script>" });
  assert.equal(attacked.html.includes("<script>"), false);
  assert.equal(attacked.html.includes("&lt;script&gt;"), true);
});

test("all nine consents are mandatory and duplicate IDs cannot bypass signing", () => {
  const expected = ECONTRACT_IMPORTANT_ITEMS.map((item) => item.id);
  assert.equal(validateConsentIds(expected, expected), true);
  assert.equal(validateConsentIds(expected, expected.slice(1)), false);
  assert.equal(validateConsentIds(expected, Array(expected.length).fill(expected[0])), false);
  assert.equal(validateConsentIds(expected, [...expected, "unexpected"]), false);
});

test("token, OTP, identity, expiry and evidence primitives remain enforced", () => {
  const token = generateOpaqueToken();
  assert.equal(isValidOpaqueToken(token), true);
  assert.equal(token.length, 43);
  assert.equal(isValidOtp("123456"), true);
  assert.equal(isValidOtp("12345"), false);
  const otpHash = hashOtp("contract-1", "123456", "test-pepper");
  assert.equal(secureHexEqual(otpHash, hashOtp("contract-1", "123456", "test-pepper")), true);
  assert.equal(secureHexEqual(otpHash, hashOtp("contract-1", "654321", "test-pepper")), false);
  assert.equal(identityNamesMatch("山田　太郎", "山田 太郎"), true);
  assert.equal(identityNamesMatch("山田 次郎", "山田 太郎"), false);
  assert.equal(maskEmail(customer.email), "ta********@example.com");

  const now = Date.parse("2026-08-28T00:00:00.000Z");
  assert.equal(getEcontractAvailability("sent", "2026-08-27T23:59:59.000Z", now), "expired");
  assert.equal(getEcontractStatusLabel("sent", "2026-08-27T23:59:59.000Z", now), "期限切れ");
  assert.equal(getEcontractStatusLabel("opened", "2026-08-29T00:00:00.000Z", now), "本人確認／OTP待ち");
  const pending = { invalidated_at: null, verified_at: null, expires_at: "2026-08-28T00:10:00.000Z", attempt_count: 0, max_attempts: 5 };
  assert.equal(getOtpChallengeAvailability(null, now), "missing");
  assert.equal(getOtpChallengeAvailability({ ...pending, attempt_count: 5 }, now), "locked");
  assert.equal(getOtpChallengeAvailability(pending, now), "pending");

  assert.equal(stableJson({ b: 2, a: 1 }), stableJson({ a: 1, b: 2 }));
  assert.notEqual(buildEvidenceHash({ signedAt: "a" }), buildEvidenceHash({ signedAt: "b" }));
});

test("pre-screening candidate sync is server-revalidated, idempotent and never sends mail or creates an e-contract", async () => {
  const [candidateRoute, candidateParser, baseMigration, preScreeningMigration, gasServer, gasUi, salesActions, salesForm] = await Promise.all([
    readFile(new URL("../app/api/sales-contracts/econtract-candidate/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/econtracts/candidate.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260828234610_single_stage_econtract_candidate.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260902002625_allow_preapproval_econtract_candidates.sql", import.meta.url), "utf8"),
    readFile(new URL("../gas-src/CustomerService.js", import.meta.url), "utf8"),
    readFile(new URL("../gas-src/Index.html", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/sales-contracts/actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/sales-contracts/SalesContractForm.tsx", import.meta.url), "utf8")
  ]);
  assert.match(candidateRoute, /if \(!isEcontractFeatureEnabled\(\)\)/);
  assert.match(candidateRoute, /normalizeEcontractCandidatePayload/);
  assert.match(candidateRoute, /timingSafeEqual/);
  assert.match(candidateRoute, /upsert_sales_econtract_candidate/);
  assert.doesNotMatch(candidateRoute, /sendEcontract|Resend|sales_econtracts/);
  assert.match(candidateParser, /canIssueLoanEcontract/);
  assert.match(candidateParser, /sourceSystem: "gas_loan_review"/);
  assert.match(candidateParser, /applicationType: "pre_screening"/);
  assert.match(candidateParser, /financeCompany: "premium" \| "ast" \| null/);
  assert.match(candidateParser, /approvalStatus: "unrequested" \| "pending" \| "approved" \| "guarantor_required" \| "rejected"/);

  assert.match(baseMigration, /sales_contracts_gas_source_row_key_active_uidx/);
  assert.match(baseMigration, /sales_contracts_gas_source_row_number_active_uidx/);
  assert.match(preScreeningMigration, /alter column finance_company drop not null/);
  assert.match(preScreeningMigration, /v_application_type is distinct from 'pre_screening'/);
  assert.match(preScreeningMigration, /v_finance_company is null and v_approval_status <> 'unrequested'/);
  assert.match(preScreeningMigration, /pg_advisory_xact_lock/g);
  assert.match(preScreeningMigration, /sc\.source_row_key = v_source_row_key\s+or sl\.application_number = v_application_number/);
  assert.match(preScreeningMigration, /return jsonb_build_object\('contract_id', v_existing_contract_id, 'created', false\)/);
  for (const table of ["sales_customers", "sales_contracts", "sales_vehicles", "sales_loans", "sales_audit_logs"]) {
    assert.match(preScreeningMigration, new RegExp(`insert into public\\.${table}`));
  }
  assert.doesNotMatch(preScreeningMigration, /insert into public\.sales_econtracts/);
  assert.match(preScreeningMigration, /'emailSent', false/);
  assert.match(preScreeningMigration, /'econtractCreated', false/);
  assert.match(preScreeningMigration, /grant execute on function public\.upsert_sales_econtract_candidate\(jsonb\) to service_role/);
  assert.doesNotMatch(preScreeningMigration, /grant execute[^;]+to (?:anon|authenticated)/);

  const syncFunction = gasServer.slice(gasServer.indexOf("function syncEcontractCandidate"), gasServer.indexOf("function getEcontractEligibility_"));
  assert.match(syncFunction, /findCurrentRowNumber_/);
  assert.match(syncFunction, /getEcontractEligibility_/);
  assert.match(syncFunction, /applicationType: 'pre_screening'/);
  assert.match(syncFunction, /approvalStatus: eligibility\.approvalStatus/);
  assert.match(syncFunction, /WEBAPP_ECONTRACT_CANDIDATE_API_URL/);
  assert.doesNotMatch(syncFunction, /GmailApp|sendEmail|電子契約をメール送信/);
  assert.match(gasUi, /isEcontractEligible\(customer\).*data-econtract-sync/s);
  assert.match(gasUi, /\.syncEcontractCandidate\(\{ rowNumber: customer\.rowNumber, rowKey: customer\.rowKey \}\)/);
  assert.match(gasUi, /String\(customer\.applicationType \|\| ''\)\.trim\(\) === '仮審査申込'/);
  assert.doesNotMatch(gasUi, /電子契約はプレミアまたはアストで可決済み/);
  assert.match(salesActions, /const isLoanReviewCandidate = sourceSystem === "gas_loan_review"/);
  assert.match(salesActions, /financeCompany \|\| isLoanReviewCandidate/);
  assert.match(salesActions, /getLoanPayload\(formData, financeCompany \|\| null, installmentCount\)/);
  assert.match(salesForm, /const isLoanReviewImport = sourceSystemValue === "gas_loan_review"/);
});

test("new operations issue one kind only, block signed reissue and revalidate resend", async () => {
  const [actions, card] = await Promise.all([
    readFile(new URL("../app/admin/sales-contracts/econtract-actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/econtracts/EcontractAdminCard.tsx", import.meta.url), "utf8")
  ]);
  assert.match(actions, /export async function issueEcontractAction/);
  assert.doesNotMatch(actions, /issueVehicleConfirmationEcontractAction|buildVehicleConfirmationDocument/);
  assert.match(actions, /requireEligibleSource\(source, contractId\)/g);
  assert.match(actions, /contract_kind !== "purchase_intent"/);
  assert.match(actions, /contractKind: "purchase_intent"/);
  assert.match(actions, /status === "signed"/);
  assert.match(actions, /締結済みの電子契約があるため、新しい電子契約は発行できません/);
  assert.match(card, /電子契約をメール送信/);
  assert.match(card, /審査前契約フロー/);
  assert.doesNotMatch(actions, /プレミアまたはアストで可決済み/);
  assert.doesNotMatch(card, /審査可決後|プレミアまたはアストで可決済み/);
  assert.doesNotMatch(card, /第1契約|第2契約|issueVehicleConfirmation/);
  assert.match(card, /過去の電子契約証跡/);
});

test("administrator test delivery reuses the formal email and contract content", () => {
  const shared = {
    customerName: customer.name,
    documentTitle: ECONTRACT_DOCUMENT_TITLE,
    managementNumber: "TEST-PREVIEW-APPLICATION-1"
  };
  const customerDelivery = buildEcontractLinkEmailContent({
    ...shared,
    signingUrl: "https://contracts.example.com/econtracts/customer-token"
  });
  const administratorDelivery = buildEcontractLinkEmailContent({
    ...shared,
    signingUrl: "https://contracts.example.com/admin/econtracts/test-preview/contract-1"
  });

  assert.equal(administratorDelivery.subject, customerDelivery.subject);
  assert.equal(administratorDelivery.subject, `【株式会社エコループ】${ECONTRACT_DOCUMENT_TITLE}のご確認`);
  assert.equal(
    administratorDelivery.text.replace(administratorDelivery.text.match(/https:\/\/[^\s]+/)?.[0] ?? "", "URL"),
    customerDelivery.text.replace(customerDelivery.text.match(/https:\/\/[^\s]+/)?.[0] ?? "", "URL")
  );
  assert.match(administratorDelivery.html, /admin\/econtracts\/test-preview\/contract-1/);
});

test("administrator test recipient matching safely supports plus aliases and normalized registered admins", () => {
  const currentAdmin = { id: "admin-1", email: "admin+gps@example.com" };
  assert.equal(isKnownAdminTestRecipient("admin+gps@example.com", currentAdmin), true);
  assert.equal(isKnownAdminTestRecipient(" ADMIN+GPS@EXAMPLE.COM ", currentAdmin), true);
  assert.equal(
    isKnownAdminTestRecipient("second+sales@example.com", currentAdmin, ["Second+Sales@Example.com"]),
    true
  );
  assert.equal(isKnownAdminTestRecipient("customer@example.com", currentAdmin, ["admin@example.com"]), false);
  assert.equal(isKnownAdminTestRecipient("", currentAdmin, ["admin@example.com"]), false);
});

test("administrator test send is read-only and cannot create formal evidence or change customer status", async () => {
  const [testAction, previewLoader, previewPage, card, email] = await Promise.all([
    readFile(new URL("../app/admin/sales-contracts/econtract-test-actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/econtracts/test-preview.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/econtracts/test-preview/[contractId]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/econtracts/EcontractAdminCard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/econtracts/email.ts", import.meta.url), "utf8")
  ]);

  assert.match(testAction, /await requireAdmin\(\)/);
  assert.match(testAction, /loadEcontractTestPreview\(contractId\)/);
  assert.match(testAction, /isAuthorizedAdminTestRecipient\(testRecipient, admin\)/);
  assert.match(testAction, /testRecipient === preview\.customer\.email/);
  assert.match(testAction, /sendEcontractTestPreviewEmail\(\{\s*testRecipient,/);
  assert.match(email, /sendEcontractTestPreviewEmail[\s\S]*to: input\.testRecipient[\s\S]*buildEcontractLinkEmailContent\(input\)/);
  assert.match(email, /\[econtract-email\] resend request failed/);
  assert.match(email, /apiKeyFormatValid/);
  assert.doesNotMatch(email, /console\.(?:log|info|warn|error)\([^\n]*(?:apiKey|testRecipient|input\.to)/);

  for (const source of [testAction, previewLoader]) {
    assert.doesNotMatch(source, /sales_econtracts|sales_econtract_access_sessions|sales_econtract_verifications|sales_econtract_events/);
    assert.doesNotMatch(source, /\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/);
  }
  assert.match(previewLoader, /\.from\("sales_contracts"\)[\s\S]*\.select\("\*"\)/);
  assert.match(previewLoader, /\.from\("profiles"\)[\s\S]*\.select\("email"\)[\s\S]*\.eq\("role", "admin"\)/);
  assert.doesNotMatch(previewLoader, /\.eq\("email", normalizedRecipient\)/);
  assert.match(previewLoader, /canIssueLoanEcontract/);
  assert.match(previewPage, /テストプレビュー・契約は成立しません/g);
  assert.match(previewPage, /preview\.document\.importantItems\.map/);
  assert.doesNotMatch(previewPage, /EcontractSigningForm|sendEcontractOtpAction|verifyEcontractOtpAction|signEcontractAction/);
  assert.match(card, /電子契約をメール送信/);
  assert.match(card, /管理者へテスト送信/g);
  assert.match(card, /sendAdminEcontractTestEmailAction/);
});

test("OTP verification and all-consent checks still gate signing", async () => {
  const actions = await readFile(new URL("../app/econtracts/[token]/actions.ts", import.meta.url), "utf8");
  assert.match(actions, /if \(econtract\.status !== "verified" \|\| !econtract\.verified_at\)/);
  assert.match(actions, /if \(!validateConsentIds\(expectedIds, consentIds\)\)/);
  assert.match(actions, /if \(!verification\?\.verified_at\)/);
  assert.match(actions, /\.eq\("status", "verified"\)\.is\("signed_at", null\)/);
  assert.match(actions, /customerSnapshot: econtract\.customer_snapshot/);
  assert.match(actions, /consentSnapshot/);
  assert.match(actions, /signatureSnapshot/);
});

test("existing evidence tables remain RLS-protected and immutable", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260828083618_create_sales_econtracts.sql", import.meta.url), "utf8");
  for (const table of ["sales_econtracts", "sales_econtract_access_sessions", "sales_econtract_verifications", "sales_econtract_events"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`, "i"));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated, service_role`, "i"));
  }
  assert.match(sql, /issued sales e-contract snapshots are immutable/);
  assert.match(sql, /signed sales e-contract evidence is immutable/);
  assert.match(sql, /verified sales e-contract verification evidence is immutable/);
  assert.match(sql, /sales e-contract events are append-only/);
  assert.doesNotMatch(sql, /grant\s+[^;]*(?:delete|truncate)[^;]*on\s+table\s+public\.sales_econtracts\s+to\s+service_role/i);
  assert.doesNotMatch(sql, /grant\s+(?:select|insert|update|delete|all).*\s+to\s+(?:anon|authenticated)/i);
});

test("disabled gate covers public, admin, candidate, email and database entry points", async () => {
  const [server, email, customerActions, adminActions, candidateRoute] = await Promise.all([
    readFile(new URL("../lib/econtracts/server.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/econtracts/email.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/econtracts/[token]/actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/sales-contracts/econtract-actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/sales-contracts/econtract-candidate/route.ts", import.meta.url), "utf8")
  ]);
  assert.match(server, /ECONTRACT_ENABLED: process\.env\.ECONTRACT_ENABLED/);
  assert.match(server, /requireEcontractFeatureEnabled\(\)/);
  assert.doesNotMatch(email, /DIAGNOSIS_|NEXT_PUBLIC_APP_URL|VERCEL_PROJECT_PRODUCTION_URL/);
  for (const action of ["confirmEcontractIdentityAction", "sendEcontractOtpAction", "verifyEcontractOtpAction", "signEcontractAction"]) {
    assert.match(customerActions, new RegExp(`export async function ${action}\\(formData: FormData\\) \\{\\n  requirePublicEcontractFeature\\(\\);`));
  }
  for (const action of ["issueEcontractAction", "resendEcontractAction", "cancelEcontractAction"]) {
    assert.match(adminActions, new RegExp(`export async function ${action}\\(formData: FormData\\)[\\s\\S]*?requireAdminEcontractFeature\\(contractId\\);`));
  }
  assert.match(candidateRoute, /if \(!isEcontractFeatureEnabled\(\)\)[\s\S]*status: 404/);
});
