import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildGrowthStrategyResult, getStrategyQuestions, selectGrowthStrategyQuestions } from "../lib/construction-diagnosis-v2/strategy.ts";
import type { DiagnosisV2SectionId } from "../lib/construction-diagnosis-v2/questions.ts";

const axisScores: Record<DiagnosisV2SectionId, number> = {
  finance: 30,
  profit: 40,
  sales: 70,
  public_works: 20,
  technical: 80,
  organization: 75,
  control: 85,
  growth: 75
};

test("selects six common and four low-score questions", () => {
  const selection = selectGrowthStrategyQuestions({ axisScores, criticalFlags: [], shortAnswers: {}, primaryTrade: "painting", publicWorkIntent: "expand_within_year" });
  assert.equal(selection.questionIds.length, 10);
  assert.deepEqual(selection.questionIds.slice(0, 6), ["RS01", "RS02", "RS03", "RS04", "RS05", "RS06"]);
  assert.equal(new Set(selection.questionIds).size, selection.questionIds.length);
});

test("excludes public-work questions when public work is not wanted", () => {
  const selection = selectGrowthStrategyQuestions({ axisScores, criticalFlags: [], shortAnswers: {}, primaryTrade: "painting", publicWorkIntent: "not_interested" });
  assert.equal(selection.questionIds.some((id) => id.startsWith("K")), false);
  const questions = getStrategyQuestions(selection.questionIds, { primaryTrade: "painting", publicWorkIntent: "not_interested" });
  assert.equal(questions.find((question) => question.id === "RS01")?.options.some((option) => option.value === "public"), false);
  assert.equal(questions.find((question) => question.id === "RS01")?.options.find((option) => option.value === "main")?.label, "塗装工事の仕事を増やしたい");
  assert.ok(selection.questionIds.length >= 8 && selection.questionIds.length <= 10);
});

for (const primaryTrade of ["demolition", "painting", "renovation", "scaffold", "interior"] as const) {
  test(`${primaryTrade} receives only 8 to 10 unique strategy questions`, () => {
    const selection = selectGrowthStrategyQuestions({ axisScores, criticalFlags: [], shortAnswers: {}, primaryTrade, publicWorkIntent: "expand_within_year" });
    assert.ok(selection.questionIds.length >= 8 && selection.questionIds.length <= 10);
    assert.equal(new Set(selection.questionIds).size, selection.questionIds.length);
  });
}

test("uses only two targeted questions for one clear critical section", () => {
  const selection = selectGrowthStrategyQuestions({ axisScores: { ...axisScores, finance: 20, profit: 80, public_works: 80 }, criticalFlags: ["C07"], shortAnswers: {}, primaryTrade: "painting", publicWorkIntent: "interested_unscheduled" });
  assert.equal(selection.questionIds.length, 8);
  assert.ok(selection.criticalSections.length === 1);
});

test("does not repeat inherited short-diagnosis questions", () => {
  const selection = selectGrowthStrategyQuestions({ axisScores: { ...axisScores, profit: 10, finance: 80 }, criticalFlags: [], shortAnswers: { C04: "0" }, primaryTrade: "painting", publicWorkIntent: "not_interested" });
  assert.equal(selection.questionIds.includes("P02"), false);
});

test("builds an evidence-based strategy without a public-work section when excluded", () => {
  const selection = selectGrowthStrategyQuestions({ axisScores, criticalFlags: [], shortAnswers: {}, primaryTrade: "painting", publicWorkIntent: "not_interested" });
  const answers = Object.fromEntries(getStrategyQuestions(selection.questionIds).map((question) => [question.id, question.options[0]!.value]));
  const result = buildGrowthStrategyResult({ answers, questionIds: selection.questionIds, axisScores, criticalFlags: [], lowScoreSections: selection.lowScoreSections, primaryTrade: "painting", publicWorkIntent: "not_interested" });
  assert.equal(result.publicWorks, null);
  assert.equal(result.workPriorities.growth.length > 0, true);
  assert.equal(result.actions30Days.length, 3);
  assert.ok(result.strengths.length >= 2 && result.strengths.length <= 3);
  assert.equal(result.plan90Days.month1.length > 0, true);
  assert.ok(result.evidence.every((item) => item.includes(":")));
});

test("v2.3 migration keeps waitlist private and server-only", () => {
  const sql = readFileSync(new URL("../supabase/migrations/202608030001_construction_management_diagnosis_v2_3.sql", import.meta.url), "utf8");
  assert.match(sql, /alter table public\.property_search_waitlist enable row level security/i);
  assert.match(sql, /revoke all on public\.property_search_waitlist from anon, authenticated/i);
  assert.match(sql, /grant all on public\.property_search_waitlist to service_role/i);
  assert.doesNotMatch(sql, /drop table|truncate table|delete from public\.construction_diagnoses/i);
});

test("the 27-question precheck requires its dedicated access guard", () => {
  const page = readFileSync(new URL("../app/diagnosis/precheck-form/[id]/page.tsx", import.meta.url), "utf8");
  const action = readFileSync(new URL("../app/diagnosis/strategy-actions.ts", import.meta.url), "utf8");
  const progress = readFileSync(new URL("../app/api/diagnosis/v2-progress/route.ts", import.meta.url), "utf8");
  assert.match(page, /canAccessDiagnosisPrecheck\(id\)/);
  assert.match(action, /canAccessDiagnosisPrecheck\(id\)/);
  assert.match(progress, /stage === "precheck" && !await canAccessDiagnosisPrecheck\(id\)/);
  assert.match(page, /getInheritedDetailedQuestionIds\(diagnosis\.quick_answers\)/);
  assert.match(action, /getAdditionalDetailedQuestions\(session\.short_answers/);
});

test("v2.3 quick result shows the dynamic question count and expected time", () => {
  const page = readFileSync(new URL("../app/diagnosis/quick-results/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /追加6～10問です/);
  assert.match(page, /目安時間：約\{strategyEstimatedMinutes\}分/);
  assert.match(page, /あと3～5分で、会社に合わせた再成長戦略を見る/);
});
