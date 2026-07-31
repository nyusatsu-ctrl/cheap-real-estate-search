import assert from "node:assert/strict";
import test from "node:test";
import {
  readDiagnosisV2MultiValue,
  sanitizeDiagnosisV2StartValues,
  validateDiagnosisV2BasicStep,
  type DiagnosisV2StartFormValues
} from "../lib/construction-diagnosis-v2/start-form.ts";
import {
  PUBLIC_WORK_INTENT_OPTIONS,
  type PrimaryTrade
} from "../lib/construction-diagnosis-v2/specialty-questions.ts";

const TEST_TRADES: PrimaryTrade[] = ["demolition", "painting", "renovation", "scaffold", "interior"];

function validValues(overrides: Partial<DiagnosisV2StartFormValues> = {}): DiagnosisV2StartFormValues {
  return {
    company_name: "株式会社エコループ 診断テスト",
    respondent_name: "紹介 太郎",
    prefecture: "熊本県",
    phone: "09012345678",
    email: "diagnosis-test@example.com",
    primary_trade: "demolition",
    order_models: JSON.stringify(["private_prime"]),
    prime_ratio: "50",
    subcontract_ratio: "50",
    public_ratio: "0",
    consumer_ratio: "0",
    self_perform_ratio: "ほぼ自社施工",
    average_project_size: "50万円以上200万円未満",
    public_work_intent: "expand_within_year",
    privacy_consent: "agreed",
    ...overrides
  };
}

test("the five requested trades and every public-work intent can proceed", () => {
  for (const primaryTrade of TEST_TRADES) {
    for (const intent of PUBLIC_WORK_INTENT_OPTIONS) {
      const errors = validateDiagnosisV2BasicStep(validValues({
        primary_trade: primaryTrade,
        public_work_intent: intent.value
      }));
      assert.deepEqual(errors, {}, `${primaryTrade}/${intent.value}`);
    }
  }
});

test("a missing order model returns a visible Japanese error", () => {
  const errors = validateDiagnosisV2BasicStep(validValues({ order_models: "[]" }));
  assert.equal(errors.order_models, "主な受注形態を1つ以上選択してください");
});

test("a 100 percent sales mix passes and invalid percentages explain the range", () => {
  assert.deepEqual(validateDiagnosisV2BasicStep(validValues()), {});
  const errors = validateDiagnosisV2BasicStep(validValues({ prime_ratio: "140" }));
  assert.equal(errors.prime_ratio, "0～100の範囲で入力してください");
});

test("stale storage values are normalized without throwing", () => {
  const values = sanitizeDiagnosisV2StartValues({
    ...validValues(),
    order_models: ["private_prime", "private_prime", 123],
    secondary_trades: ["painting"],
    prime_ratio: 50,
    privacy_consent: true,
    obsolete_hidden_answer: { value: "old" }
  });

  assert.deepEqual(readDiagnosisV2MultiValue(values.order_models), ["private_prime"]);
  assert.deepEqual(readDiagnosisV2MultiValue(values.secondary_trades), ["painting"]);
  assert.equal(values.prime_ratio, "50");
  assert.equal(values.privacy_consent, "agreed");
  assert.equal(values.obsolete_hidden_answer, undefined);
  assert.deepEqual(validateDiagnosisV2BasicStep(values), {});
});

test("optional hidden or obsolete values do not become required", () => {
  const values = validValues();
  delete values.self_perform_ratio;
  delete values.average_project_size;
  delete values.website_url;
  delete values.founding_year;
  assert.deepEqual(validateDiagnosisV2BasicStep(values), {});
});

test("optional URL and founding year errors are reported before submission", () => {
  const errors = validateDiagnosisV2BasicStep(validValues({
    website_url: "example.jp",
    founding_year: "20"
  }));
  assert.equal(errors.website_url, "ホームページURLは http:// または https:// から入力してください");
  assert.equal(errors.founding_year, "創業年は西暦4桁で入力してください");
});
