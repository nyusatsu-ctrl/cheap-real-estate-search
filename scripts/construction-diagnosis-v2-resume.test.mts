import assert from "node:assert/strict";
import test from "node:test";
import { buildDetailedProgress } from "../lib/construction-diagnosis-v2/progress.ts";
import {
  createDiagnosisResumeToken,
  getDiagnosisResumeExpiry,
  hashDiagnosisResumeToken,
  isDiagnosisResumeExpired,
  isDiagnosisResumeToken
} from "../lib/construction-diagnosis-v2/resume-token.ts";
import { getAdditionalDetailedQuestions } from "../lib/construction-diagnosis-v2/short-questions.ts";

const context = {
  primaryTrade: "demolition" as const,
  publicWorkIntent: "expand_within_year" as const,
  includeSpecialty: true
};

test("resume tokens are random, opaque, hashable, and expire after 30 days", () => {
  const first = createDiagnosisResumeToken();
  const second = createDiagnosisResumeToken();
  assert.equal(isDiagnosisResumeToken(first), true);
  assert.equal(isDiagnosisResumeToken(second), true);
  assert.notEqual(first, second);
  assert.match(hashDiagnosisResumeToken(first), /^[a-f0-9]{64}$/);
  assert.notEqual(hashDiagnosisResumeToken(first), first);
  const altered = `${first.slice(0, -1)}${first.endsWith("A") ? "B" : "A"}`;
  assert.notEqual(hashDiagnosisResumeToken(altered), hashDiagnosisResumeToken(first));
  assert.equal(isDiagnosisResumeToken(`${first.slice(0, -1)}!`), false);

  const base = new Date("2026-08-01T00:00:00.000Z");
  assert.equal(getDiagnosisResumeExpiry(base).toISOString(), "2026-08-31T00:00:00.000Z");
  assert.equal(isDiagnosisResumeExpired("2026-07-31T23:59:59.000Z", base), true);
  assert.equal(isDiagnosisResumeExpired("2026-08-01T00:00:01.000Z", base), false);
  assert.equal(isDiagnosisResumeExpired(null, base), true);
});

test("detailed progress counts only additional questions and resumes at the first unanswered question", () => {
  const shortAnswers = {
    C01: "2", C02: "2", C03: "2", C04: "2", C05: "2", C06: "2", C07: "2", C08: "2",
    PW01: "2", PW02: "2", PW03: "2",
    D01: "2", D02: "2", D03: "2", D04: "2"
  };
  const additional = getAdditionalDetailedQuestions(shortAnswers, context);
  const firstFive = Object.fromEntries(additional.slice(0, 5).map((question) => [question.id, question.options[2]?.value ?? "2"]));
  const progress = buildDetailedProgress(shortAnswers, { ...firstFive, BAD_ID: "4", [additional[5]!.id]: "9" }, context, additional[4]!.id);

  assert.equal(progress.total, additional.length);
  assert.equal(progress.answered, 5);
  assert.equal(progress.remaining, additional.length - 5);
  assert.equal(progress.lastQuestionId, additional[4]!.id);
  assert.equal(progress.nextQuestionId, additional[5]!.id);
  assert.equal("BAD_ID" in progress.validAnswers, false);
  assert.equal(progress.validAnswers[additional[5]!.id], undefined);
  assert.equal(Object.keys(progress.labels).length, 5);
});

test("a changed saved answer overwrites the previous value without increasing the answer count", () => {
  const additional = getAdditionalDetailedQuestions({}, context);
  const question = additional[0]!;
  const first = buildDetailedProgress({}, { [question.id]: question.options[0]!.value }, context, question.id);
  const changed = buildDetailedProgress({}, { ...first.validAnswers, [question.id]: question.options.at(-1)!.value }, context, question.id);
  assert.equal(first.answered, 1);
  assert.equal(changed.answered, 1);
  assert.notEqual(first.validAnswers[question.id], changed.validAnswers[question.id]);
});
