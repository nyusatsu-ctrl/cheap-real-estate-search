import assert from "node:assert/strict";
import test from "node:test";
import {
  getShortDiagnosisQuestions,
  scoreShortDiagnosis
} from "../lib/construction-diagnosis-v2/short-questions.ts";
import type { PrimaryTrade } from "../lib/construction-diagnosis-v2/specialty-questions.ts";

const EXPECTED_SPECIALTY_IDS: Record<string, string[]> = {
  demolition: ["D01", "D02", "D03", "D04"],
  painting: ["PA01", "PA02", "PA04", "PA05"],
  renovation: ["R01", "R02", "R03", "R04"],
  scaffold: ["SC01", "SC02", "SC03", "SC05"],
  interior: ["IN01", "IN02", "IN03", "IN04"],
  civil: ["SP01", "SP02", "SP03", "SP04"]
};

test("short diagnosis shows common 8, public 3, and trade-specific 4 questions", () => {
  for (const trade of Object.keys(EXPECTED_SPECIALTY_IDS) as PrimaryTrade[]) {
    const questions = getShortDiagnosisQuestions({
      primaryTrade: trade,
      publicWorkIntent: "expand_within_year"
    });
    assert.equal(questions.length, 15, trade);
    assert.deepEqual(questions.slice(0, 8).map((question) => question.id), [
      "C01", "C02", "C03", "C04", "C05", "C06", "C07", "C08"
    ]);
    assert.deepEqual(questions.slice(8, 11).map((question) => question.id), ["PW01", "PW02", "PW03"]);
    assert.deepEqual(questions.slice(11).map((question) => question.id), EXPECTED_SPECIALTY_IDS[trade]);
  }
});

test("public-work questions are hidden when the company does not want public work", () => {
  const questions = getShortDiagnosisQuestions({
    primaryTrade: "painting",
    publicWorkIntent: "not_interested"
  });
  assert.equal(questions.length, 12);
  assert.equal(questions.some((question) => question.id.startsWith("PW")), false);
});

test("all score-4 short answers produce 100 points", () => {
  const context = { primaryTrade: "demolition", publicWorkIntent: "expand_within_year" };
  const questions = getShortDiagnosisQuestions(context);
  const answers = Object.fromEntries(questions.map((question) => [question.id, "4"]));
  const result = scoreShortDiagnosis(answers, context);
  assert.equal(result.complete, true);
  assert.equal(result.totalScore, 100);
  for (const score of Object.values(result.categoryScores)) assert.equal(score, 100);
});

test("an unanswered short question never completes the diagnosis", () => {
  const context = { primaryTrade: "interior", publicWorkIntent: "unknown" };
  const questions = getShortDiagnosisQuestions(context);
  const answers = Object.fromEntries(questions.map((question) => [question.id, "4"]));
  delete answers.C04;
  const result = scoreShortDiagnosis(answers, context);
  assert.equal(result.complete, false);
  assert.equal(result.totalScore, null);
  assert.deepEqual(result.unanswered, ["C04"]);
});
