import assert from "node:assert/strict";
import test from "node:test";
import {
  getApplicableDetailedQuestions,
  scoreDetailedDiagnosis,
  type DiagnosisV2AnswerMap,
  type DiagnosisV2ScoringContext
} from "../lib/construction-diagnosis-v2/questions.ts";
import { buildDiagnosisV2Result } from "../lib/construction-diagnosis-v2/results.ts";
import {
  getSpecialtyQuestions,
  type PrimaryTrade,
  type PublicWorkIntent
} from "../lib/construction-diagnosis-v2/specialty-questions.ts";

function context(primaryTrade: PrimaryTrade, publicWorkIntent: PublicWorkIntent): DiagnosisV2ScoringContext {
  return { primaryTrade, publicWorkIntent, includeSpecialty: true };
}

function answersFor(contextValue: DiagnosisV2ScoringContext, score = 4): DiagnosisV2AnswerMap {
  return Object.fromEntries(
    getApplicableDetailedQuestions(contextValue).map((question) => [question.id, String(score)])
  );
}

test("demolition without public works omits K questions and does not lose points", () => {
  const scoringContext = context("demolition", "not_interested");
  const questions = getApplicableDetailedQuestions(scoringContext);
  assert.equal(questions.length, 34);
  assert.deepEqual(questions.filter((question) => question.id.startsWith("K")).map((question) => question.id), []);
  assert.deepEqual(questions.filter((question) => question.id.startsWith("D")).map((question) => question.id), ["D01", "D02", "D03", "D04", "D05"]);

  const answers = answersFor(scoringContext);
  answers.D01 = "1";
  const scoring = scoreDetailedDiagnosis(answers, scoringContext);
  const result = buildDiagnosisV2Result(answers, scoring, scoringContext);
  assert.equal(scoring.complete, true);
  assert.equal(scoring.publicWorksMode, "excluded");
  assert.equal(scoring.axisScores.public_works, undefined);
  assert.match(result.publicWorks.summary, /総合評価の対象外/);
  assert.equal(result.specialty?.trade, "demolition");
  assert.ok(result.specialty?.plan90Days.some((item) => item.includes("標準見積表")));
});

test("painting public interest is reference-only and exposes painting KPIs", () => {
  const scoringContext = context("painting", "interested_unscheduled");
  const answers = answersFor(scoringContext);
  for (const id of ["K01", "K02", "K03", "K04", "K05"]) answers[id] = "0";
  const scoring = scoreDetailedDiagnosis(answers, scoringContext);
  const result = buildDiagnosisV2Result(answers, scoring, scoringContext);

  assert.equal(scoring.complete, true);
  assert.equal(scoring.publicWorksMode, "reference");
  assert.equal(scoring.totalScore, 100);
  assert.equal(scoring.axisScores.public_works, 0);
  assert.equal(result.publicWorks.mode, "reference");
  assert.ok(result.specialty?.kpis.includes("見積成約率"));
  assert.deepEqual(getSpecialtyQuestions("painting").map((question) => question.id), ["PA01", "PA02", "PA03", "PA04", "PA05"]);
});

test("renovation within one year includes public works and both action branches", () => {
  const scoringContext = context("renovation", "expand_within_year");
  const answers = answersFor(scoringContext);
  answers.K01 = "0";
  answers.R02 = "0";
  const scoring = scoreDetailedDiagnosis(answers, scoringContext);
  const result = buildDiagnosisV2Result(answers, scoring, scoringContext);

  assert.equal(getApplicableDetailedQuestions(scoringContext).length, 39);
  assert.equal(scoring.publicWorksMode, "included");
  assert.ok((scoring.totalScore ?? 100) < 100);
  assert.ok(result.publicWorks.prerequisites.some((item) => item.includes("許可業種")));
  assert.ok(result.specialty?.plan90Days.some((item) => item.includes("追加工事の承認方法")));
});

test("scaffold SC03 score 0 raises a critical safety priority", () => {
  const scoringContext = context("scaffold", "not_interested");
  const answers = answersFor(scoringContext);
  answers.SC03 = "0";
  const scoring = scoreDetailedDiagnosis(answers, scoringContext);
  const result = buildDiagnosisV2Result(answers, scoring, scoringContext);

  assert.deepEqual(scoring.criticalFlags, ["SC03"]);
  assert.equal(scoring.judgment, "経営基盤の整備を優先");
  assert.match(result.priorities[0]?.detail ?? "", /最優先で是正/);
  assert.ok(result.specialty?.priorities.some((item) => item.startsWith("SC03:")));
});

test("interior branch exposes labor, productivity, loss, and rework indicators", () => {
  const scoringContext = context("interior", "unknown");
  const answers = answersFor(scoringContext);
  const scoring = scoreDetailedDiagnosis(answers, scoringContext);
  const result = buildDiagnosisV2Result(answers, scoring, scoringContext);
  assert.deepEqual(getSpecialtyQuestions("interior").map((question) => question.id), ["IN01", "IN02", "IN03", "IN04", "IN05"]);
  assert.ok(result.specialty?.kpis.includes("1日当たり施工量"));
  assert.ok(result.specialty?.kpis.includes("材料ロス率"));
  assert.ok(result.specialty?.kpis.includes("手直し率"));
});

test("other trades safely use the five common specialty questions", () => {
  const scoringContext = context("civil", "not_interested");
  const questions = getSpecialtyQuestions("civil");
  assert.deepEqual(questions.map((question) => question.id), ["SP01", "SP02", "SP03", "SP04", "SP05"]);
  const scoring = scoreDetailedDiagnosis(answersFor(scoringContext), scoringContext);
  assert.equal(scoring.complete, true);
  assert.equal(scoring.totalScore, 100);
});

test("changing trade ignores answers from the previously selected branch", () => {
  const newContext = context("painting", "not_interested");
  const answers = {
    ...answersFor(newContext),
    ...Object.fromEntries(getSpecialtyQuestions("demolition").map((question) => [question.id, "0"]))
  };
  const scoring = scoreDetailedDiagnosis(answers, newContext);
  assert.equal(scoring.complete, true);
  assert.equal(scoring.totalScore, 100);
  assert.ok(scoring.applicableQuestionIds.includes("PA01"));
  assert.ok(!scoring.applicableQuestionIds.includes("D01"));
  assert.deepEqual(scoring.criticalFlags, []);
});

test("every specialty branch has exactly five questions with valid 0-4 options", () => {
  for (const trade of ["demolition", "painting", "renovation", "scaffold", "interior", "civil"] as PrimaryTrade[]) {
    const questions = getSpecialtyQuestions(trade);
    assert.equal(questions.length, 5, trade);
    for (const question of questions) {
      assert.deepEqual(question.options.map((option) => option.score), [0, 1, 2, 3, 4], question.id);
    }
  }
});
