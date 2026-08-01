import assert from "node:assert/strict";
import test from "node:test";
import {
  DIAGNOSIS_V22_QUESTION_DEFINITION_VERSION,
  DIAGNOSIS_V22_EMPLOYEE_OPTIONS,
  DIAGNOSIS_V22_SALES_OPTIONS,
  normalizeStoredDiagnosisV2StartValues,
  pruneDiagnosisV2StartValues,
  sanitizeDiagnosisV2StartValues,
  serializeDiagnosisV2StartValues,
  validateDiagnosisV2BasicStep,
  type DiagnosisV2StartFormValues
} from "../lib/construction-diagnosis-v2/start-form.ts";
import { validateDiagnosisV22ResultContact } from "../lib/construction-diagnosis-v2/result-contact.ts";
import { PUBLIC_WORK_INTENT_OPTIONS, type PrimaryTrade } from "../lib/construction-diagnosis-v2/specialty-questions.ts";

const TEST_TRADES: PrimaryTrade[] = [
  "demolition",
  "painting",
  "renovation",
  "scaffold",
  "interior",
  "civil",
  "building",
  "other_specialty"
];

function validValues(overrides: Partial<DiagnosisV2StartFormValues> = {}): DiagnosisV2StartFormValues {
  return {
    primary_trade: "demolition",
    order_model: "private_prime",
    employee_range: DIAGNOSIS_V22_EMPLOYEE_OPTIONS[1],
    sales_range: DIAGNOSIS_V22_SALES_OPTIONS[1],
    public_work_intent: "expand_within_year",
    ...overrides
  };
}

test("all requested trades and every public-work intent can start with five fields", () => {
  for (const primaryTrade of TEST_TRADES) {
    for (const intent of PUBLIC_WORK_INTENT_OPTIONS) {
      assert.deepEqual(validateDiagnosisV2BasicStep(validValues({ primary_trade: primaryTrade, public_work_intent: intent.value })), {}, `${primaryTrade}/${intent.value}`);
    }
  }
});

test("the five start fields return clear Japanese errors", () => {
  const errors = validateDiagnosisV2BasicStep({});
  assert.equal(Object.keys(errors).length, 5);
  assert.equal(errors.primary_trade, "会社の主な業種を選んでください");
  assert.equal(errors.order_model, "主な仕事の受け方を選んでください");
  assert.equal(errors.employee_range, "従業員数を選んでください");
  assert.equal(errors.sales_range, "年商区分を選んでください");
  assert.equal(errors.public_work_intent, "公共工事への考えを選んでください");
});

test("company and contact fields are not required before the short result", () => {
  const values = validValues();
  assert.equal(values.company_name, undefined);
  assert.equal(values.phone, undefined);
  assert.equal(values.email, undefined);
  assert.deepEqual(validateDiagnosisV2BasicStep(values), {});
});

test("stale storage values are normalized without becoming required", () => {
  const values = sanitizeDiagnosisV2StartValues({
    ...validValues(),
    old_company_name: "以前の会社名",
    obsolete_hidden_answer: { value: "old" }
  });
  assert.equal(values.old_company_name, "以前の会社名");
  assert.equal(values.obsolete_hidden_answer, undefined);
  assert.deepEqual(validateDiagnosisV2BasicStep(values), {});
});

test("current question-definition storage restores all valid answers", () => {
  const stored = JSON.parse(serializeDiagnosisV2StartValues({ ...validValues(), C01: "4", SP04: "3" }));
  assert.equal(stored.questionDefinitionVersion, DIAGNOSIS_V22_QUESTION_DEFINITION_VERSION);
  assert.deepEqual(normalizeStoredDiagnosisV2StartValues(stored), {
    values: { ...validValues(), C01: "4", SP04: "3" },
    definitionUpdated: false
  });
});

test("old storage keeps basic and unchanged common answers but drops changed specialty answers", () => {
  const normalized = normalizeStoredDiagnosisV2StartValues({
    ...validValues(),
    C01: "4",
    PW01: "3",
    SP04: "2",
    D01: "1",
    obsolete: "old"
  });
  assert.equal(normalized.definitionUpdated, true);
  assert.equal(normalized.values.primary_trade, "demolition");
  assert.equal(normalized.values.C01, "4");
  assert.equal(normalized.values.PW01, "3");
  assert.equal(normalized.values.SP04, undefined);
  assert.equal(normalized.values.D01, undefined);
  assert.equal(normalized.values.obsolete, undefined);
});

test("changing a branch removes answers that are no longer visible", () => {
  const pruned = pruneDiagnosisV2StartValues({
    ...validValues(),
    D01: "4",
    PA01: "1",
    PW01: "3"
  }, ["C01", "PA01"]);
  assert.equal(pruned.primary_trade, "demolition");
  assert.equal(pruned.PA01, "1");
  assert.equal(pruned.D01, undefined);
  assert.equal(pruned.PW01, undefined);
});

test("details contact validation requires company, valid email, and consent but not phone", () => {
  assert.deepEqual(validateDiagnosisV22ResultContact({
    intent: "details",
    companyName: "株式会社テスト",
    email: "test@example.com",
    privacyConsent: "agreed"
  }), {});
  const missing = validateDiagnosisV22ResultContact({
    intent: "details",
    companyName: "",
    email: "invalid",
    privacyConsent: ""
  });
  assert.equal(missing.company_name, "会社名を入力してください");
  assert.equal(missing.email, "メールアドレスをもう一度確認してください");
  assert.equal(missing.privacy_consent, "個人情報の取扱いへの同意が必要です");
  assert.equal(missing.phone, undefined);
});

test("consultation alone requires name, phone, topic, and a preferred date", () => {
  const errors = validateDiagnosisV22ResultContact({
    intent: "consultation",
    companyName: "株式会社テスト",
    email: "test@example.com",
    privacyConsent: "agreed"
  });
  assert.deepEqual(Object.keys(errors).sort(), ["consultation_topic", "contact_name", "phone", "preferred_meeting_dates"]);
});
