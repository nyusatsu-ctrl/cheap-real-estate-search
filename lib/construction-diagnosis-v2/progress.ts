import {
  getApplicableDetailedQuestions,
  getDiagnosisV2OptionLabel,
  type DiagnosisV2AnswerMap,
  type DiagnosisV2ScoringContext
} from "./questions.ts";
import { getAdditionalDetailedQuestions } from "./short-questions.ts";
import { ALL_SPECIALTY_QUESTIONS } from "./specialty-questions.ts";

export function buildDetailedProgress(
  shortAnswers: DiagnosisV2AnswerMap,
  detailedAnswers: DiagnosisV2AnswerMap,
  context: DiagnosisV2ScoringContext,
  requestedLastQuestionId?: string | null
) {
  const applicableQuestions = getApplicableDetailedQuestions(context);
  const questionById = new Map(applicableQuestions.map((question) => [question.id, question]));
  const validAnswers = Object.fromEntries(Object.entries(detailedAnswers).filter(([questionId, answer]) =>
    questionById.get(questionId)?.options.some((option) => option.value === answer)
  ));
  const additionalQuestions = getAdditionalDetailedQuestions(shortAnswers, context);
  const answeredQuestions = additionalQuestions.filter((question) =>
    question.options.some((option) => option.value === validAnswers[question.id])
  );
  const specialtyIds = new Set(ALL_SPECIALTY_QUESTIONS.map((question) => question.id));
  return {
    validAnswers,
    specialtyAnswers: Object.fromEntries(Object.entries(validAnswers).filter(([questionId]) => specialtyIds.has(questionId))),
    labels: Object.fromEntries(answeredQuestions.map((question) => [
      question.id,
      getDiagnosisV2OptionLabel(question.id, validAnswers[question.id])
    ])),
    total: additionalQuestions.length,
    answered: answeredQuestions.length,
    remaining: Math.max(0, additionalQuestions.length - answeredQuestions.length),
    lastQuestionId: requestedLastQuestionId && questionById.has(requestedLastQuestionId)
      ? requestedLastQuestionId
      : answeredQuestions.at(-1)?.id ?? null,
    nextQuestionId: additionalQuestions.find((question) => validAnswers[question.id] === undefined)?.id ?? null
  };
}
