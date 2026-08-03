import assert from "node:assert/strict";
import test from "node:test";
import {
  DETAILED_DIAGNOSIS_QUESTIONS,
  DIAGNOSIS_V2_SECTIONS,
  scoreDetailedDiagnosis,
  type DiagnosisV2AnswerMap
} from "../lib/construction-diagnosis-v2/questions.ts";
import {
  getLeadSourceLabel,
  normalizeLeadSource
} from "../lib/diagnosis-lead-source.ts";

function answersWithScore(score: number): DiagnosisV2AnswerMap {
  return Object.fromEntries(DETAILED_DIAGNOSIS_QUESTIONS.map((question) => [question.id, String(score)]));
}

test("case 1: all answers score 4", () => {
  const result = scoreDetailedDiagnosis(answersWithScore(4));
  assert.equal(result.complete, true);
  assert.equal(result.totalScore, 100);
  assert.equal(Object.keys(result.axisScores).length, 8);
  for (const section of DIAGNOSIS_V2_SECTIONS) {
    assert.equal(result.axisScores[section.id], 100, `${section.label} should be 100`);
  }
  assert.deepEqual(result.criticalFlags, []);
  assert.equal(result.judgment, "自社対応可能＋必要時スポット支援");
});

test("case 1b: detailed diagnosis has the specified 8 sections and 34-question distribution", () => {
  assert.equal(DIAGNOSIS_V2_SECTIONS.length, 8);
  assert.equal(DETAILED_DIAGNOSIS_QUESTIONS.length, 34);
  assert.deepEqual(
    Object.fromEntries(
      DIAGNOSIS_V2_SECTIONS.map((section) => [
        section.label,
        DETAILED_DIAGNOSIS_QUESTIONS.filter((question) => question.section === section.id).length
      ])
    ),
    {
      "財務・資金繰り": 5,
      "原価・収益管理": 5,
      "受注基盤・営業": 4,
      "公共工事参入体制": 5,
      "施工・技術体制": 4,
      "組織・人材": 4,
      "内部統制・管理": 4,
      "成長実行力・DX": 3
    }
  );
  assert.deepEqual(
    DETAILED_DIAGNOSIS_QUESTIONS.map((question) => question.displayOrder),
    Array.from({ length: 34 }, (_, index) => index + 1)
  );
  assert.equal(new Set(DETAILED_DIAGNOSIS_QUESTIONS.map((question) => question.id)).size, 34);
});

test("referral, monitor, aidma, and missing diagnosis sources are normalized without overlap", () => {
  assert.equal(normalizeLeadSource("referral"), "referral");
  assert.equal(getLeadSourceLabel("referral"), "紹介");
  assert.equal(normalizeLeadSource("monitor2026aug"), "monitor2026aug");
  assert.equal(getLeadSourceLabel("monitor2026aug"), "10社限定モニター");
  assert.equal(normalizeLeadSource("aidma"), "aidma");
  assert.equal(getLeadSourceLabel("aidma"), "アイドマHD");
  assert.equal(normalizeLeadSource(""), "direct");
  assert.equal(getLeadSourceLabel(undefined), "直接");
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
