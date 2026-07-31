import assert from "node:assert/strict";
import test from "node:test";
import {
  DIAGNOSIS_V22_EMPLOYEE_OPTIONS,
  DIAGNOSIS_V22_SALES_OPTIONS,
  sanitizeDiagnosisV2StartValues,
  validateDiagnosisV2BasicStep,
  type DiagnosisV2StartFormValues
} from "../lib/construction-diagnosis-v2/start-form.ts";
import { PUBLIC_WORK_INTENT_OPTIONS, type PrimaryTrade } from "../lib/construction-diagnosis-v2/specialty-questions.ts";

const TEST_TRADES: PrimaryTrade[] = ["demolition", "painting", "renovation", "scaffold", "interior", "civil"];

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
