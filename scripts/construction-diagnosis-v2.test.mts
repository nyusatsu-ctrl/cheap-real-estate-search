import assert from "node:assert/strict";
import test from "node:test";
import {
  DETAILED_DIAGNOSIS_QUESTIONS,
  scoreDetailedDiagnosis,
  type DiagnosisV2AnswerMap
} from "../lib/construction-diagnosis-v2/questions.ts";

function answersWithScore(score: number): DiagnosisV2AnswerMap {
  return Object.fromEntries(DETAILED_DIAGNOSIS_QUESTIONS.map((question) => [question.id, String(score)]));
}

test("case 1: all answers score 4", () => {
  const result = scoreDetailedDiagnosis(answersWithScore(4));
  assert.equal(result.complete, true);
  assert.equal(result.totalScore, 100);
  assert.deepEqual(result.criticalFlags, []);
  assert.equal(result.judgment, "自社対応可能＋必要時スポット支援");
});

test("case 2: critical controls score 0 even when other answers are high", () => {
  const answers = answersWithScore(4);
  for (const id of ["F03", "I01", "I02", "I03"]) answers[id] = "0";
  const result = scoreDetailedDiagnosis(answers);
  assert.equal(result.complete, true);
  assert.deepEqual(result.criticalFlags.sort(), ["F03", "I01", "I02", "I03"]);
  assert.equal(result.judgment, "経営基盤の整備を優先");
});

test("case 3: about 65 points and public works about 45 points", () => {
  const answers = answersWithScore(3);
  Object.assign(answers, {
    K01: "2",
    K02: "2",
    K03: "2",
    K04: "1",
    K05: "2",
    F01: "1",
    P03: "1",
    S01: "1",
    G01: "1"
  });
  const result = scoreDetailedDiagnosis(answers);
  assert.equal(result.complete, true);
  assert.equal(result.totalScore, 65.2);
  assert.equal(result.axisScores.public_works, 44.6);
  assert.equal(result.judgment, "一部支援推奨");
  const lowestSection = Object.entries(result.axisScores).sort((a, b) => a[1] - b[1])[0][0];
  assert.equal(lowestSection, "public_works");
});

test("case 4: about 45 points with G03 score 3", () => {
  const answers = answersWithScore(2);
  Object.assign(answers, {
    F01: "0",
    F02: "0",
    P01: "0",
    S01: "0",
    G03: "3"
  });
  const result = scoreDetailedDiagnosis(answers);
  assert.equal(result.complete, true);
  assert.equal(result.totalScore, 44.9);
  assert.equal(result.judgment, "段階的な専門支援推奨");
});

test("case 5: incomplete answers never finalize a result", () => {
  const answers = answersWithScore(4);
  delete answers.K04;
  const result = scoreDetailedDiagnosis(answers);
  assert.equal(result.complete, false);
  assert.equal(result.totalScore, null);
  assert.equal(result.judgment, null);
  assert.deepEqual(result.unanswered, ["K04"]);
});
