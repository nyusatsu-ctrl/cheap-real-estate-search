import assert from "node:assert/strict";
import test from "node:test";
import {
  getInheritedDetailedAnswers,
  getShortDiagnosisQuestions,
  scoreShortDiagnosis
} from "../lib/construction-diagnosis-v2/short-questions.ts";
import { classifyDiagnosisClient } from "../lib/construction-diagnosis-v2/client-info.ts";
import { buildShortDiagnosisResult } from "../lib/construction-diagnosis-v2/short-result.ts";
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
  for (const score of Object.values(result.axisScores)) assert.equal(score, 100);
  assert.deepEqual(result.criticalFlags, []);
  const snapshot = buildShortDiagnosisResult(answers, result, "demolition", "expand_within_year");
  assert.equal(snapshot.priorities.every((item) => item.includes("大きな弱点ではありません")), true);
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

test("interested or unknown public-work questions are optional reference questions", () => {
  for (const intent of ["interested_unscheduled", "unknown"] as const) {
    const context = { primaryTrade: "demolition", publicWorkIntent: intent };
    const questions = getShortDiagnosisQuestions(context);
    assert.equal(questions.length, 15);
    assert.equal(questions.filter((question) => question.optional).length, 3);
    const requiredAnswers = Object.fromEntries(questions.filter((question) => !question.optional).map((question) => [question.id, "4"]));
    const result = scoreShortDiagnosis(requiredAnswers, context);
    assert.equal(result.complete, true);
    assert.equal(result.totalScore, 100);
    assert.equal(result.axisScores.public_works, undefined);
  }
});

test("C08 and critical specialty scores 0 or 1 raise short critical flags", () => {
  const context = { primaryTrade: "demolition", publicWorkIntent: "not_interested" };
  const questions = getShortDiagnosisQuestions(context);
  const answers = Object.fromEntries(questions.map((question) => [question.id, "4"]));
  answers.C08 = "1";
  answers.D02 = "0";
  const result = scoreShortDiagnosis(answers, context);
  assert.deepEqual(result.criticalFlags.sort(), ["C08", "D02"]);
});

test("short answers are inherited by equivalent detailed questions", () => {
  const inherited = getInheritedDetailedAnswers({ C01: "3", C03: "4", C08: "2", D01: "1", D04: "4" });
  assert.deepEqual(inherited, { F02: "3", P01: "4", I03: "2", D01: "1", D04: "4" });
});

test("LINE, iOS Safari, and Chrome clients are classified without personal data", () => {
  assert.deepEqual(
    classifyDiagnosisClient("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Line/14.0.0"),
    { deviceType: "スマートフォン", browserFamily: "LINE内ブラウザ" }
  );
  assert.deepEqual(
    classifyDiagnosisClient("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"),
    { deviceType: "スマートフォン", browserFamily: "Safari" }
  );
  assert.deepEqual(
    classifyDiagnosisClient("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36"),
    { deviceType: "パソコン", browserFamily: "Chrome" }
  );
});
