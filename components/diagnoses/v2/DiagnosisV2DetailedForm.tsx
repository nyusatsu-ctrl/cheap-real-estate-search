"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { submitDiagnosisV2DetailedAction, type DiagnosisV2FormState } from "@/app/diagnosis/v2-actions";
import {
  DIAGNOSIS_V2_SECTIONS,
  getApplicableDetailedQuestions,
  getApplicableQuestionsForSection,
  getDetailedQuestionHelp,
  type DiagnosisV2Question,
  type DiagnosisV2ScoringContext
} from "@/lib/construction-diagnosis-v2/questions";
import {
  getPrimaryTradeLabel,
  getPublicWorksScoringMode,
  getSpecialtyQuestions,
  type PrimaryTrade,
  type PublicWorkIntent
} from "@/lib/construction-diagnosis-v2/specialty-questions";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { QuestionHelp } from "./QuestionHelp";

const INITIAL_STATE: DiagnosisV2FormState = { fieldErrors: {} };
const QUESTIONS_PER_PAGE = 2;

type DetailedStep = {
  id: string;
  label: string;
  description: string;
  questions: DiagnosisV2Question[];
  referenceOnly?: boolean;
};

export function DiagnosisV2DetailedForm({
  diagnosisId,
  primaryTrade,
  publicWorkIntent,
  includeSpecialty,
  initialAnswers,
  skippedQuestionIds,
  trackProgress
}: {
  diagnosisId: string;
  primaryTrade: PrimaryTrade | null;
  publicWorkIntent: PublicWorkIntent | null;
  includeSpecialty: boolean;
  initialAnswers: Record<string, string>;
  skippedQuestionIds: string[];
  trackProgress: boolean;
}) {
  const [state, formAction, isPending] = useActionState(submitDiagnosisV2DetailedAction, INITIAL_STATE);
  const storageKey = `construction-management-diagnosis-v2-2-details-${diagnosisId}`;
  const sectionStorageKey = `${storageKey}-section`;
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [storageRestored, setStorageRestored] = useState(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [progressError, setProgressError] = useState("");
  const [savingProgress, setSavingProgress] = useState(false);
  const submittingRef = useRef(false);
  const fieldErrors = useMemo(
    () => ({ ...(state.fieldErrors ?? {}), ...clientErrors }),
    [clientErrors, state.fieldErrors]
  );
  const context = useMemo<DiagnosisV2ScoringContext>(() => ({
    primaryTrade,
    publicWorkIntent,
    includeSpecialty
  }), [includeSpecialty, primaryTrade, publicWorkIntent]);
  const publicWorksMode = publicWorkIntent ? getPublicWorksScoringMode(publicWorkIntent) : "included";
  const applicableQuestions = useMemo(() => getApplicableDetailedQuestions(context), [context]);
  const skippedIds = useMemo(() => new Set(skippedQuestionIds), [skippedQuestionIds]);
  const displayedQuestions = useMemo(() => applicableQuestions.filter((question) => !skippedIds.has(question.id)), [applicableQuestions, skippedIds]);
  const steps = useMemo<DetailedStep[]>(() => {
    const commonSteps = DIAGNOSIS_V2_SECTIONS.flatMap((section) => {
      const questions = getApplicableQuestionsForSection(section.id, context)
        .filter((question) => !skippedIds.has(question.id))
        .filter((question) => !getSpecialtyQuestions(primaryTrade).some((specialty) => specialty.id === question.id));
      return questions.length > 0 ? [{
        id: section.id,
        label: section.shortLabel,
        description: section.description,
        questions,
        referenceOnly: section.id === "public_works" && publicWorksMode === "reference"
      }] : [];
    });
    if (!includeSpecialty || !primaryTrade) return commonSteps;
    return [...commonSteps, {
      id: "specialty",
      label: `${getPrimaryTradeLabel(primaryTrade)}の業態別診断`,
      description: "この工事業種でかかる費用、工事の進め方、仕事の取り方、安全、書類の管理を確認します。",
      questions: getSpecialtyQuestions(primaryTrade).filter((question) => !skippedIds.has(question.id))
    }];
  }, [context, includeSpecialty, primaryTrade, publicWorksMode, skippedIds]);
  const questionPages = useMemo(() => steps.flatMap((step, stepIndex) =>
    Array.from({ length: Math.ceil(step.questions.length / QUESTIONS_PER_PAGE) }, (_, pageIndex) => ({
      step,
      stepIndex,
      questions: step.questions.slice(pageIndex * QUESTIONS_PER_PAGE, (pageIndex + 1) * QUESTIONS_PER_PAGE)
    }))
  ), [steps]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const applicableIds = new Set(applicableQuestions.map((question) => question.id));
      setAnswers({
        ...initialAnswers,
        ...Object.fromEntries(Object.entries(readStoredAnswers(storageKey)).filter(([questionId]) => applicableIds.has(questionId)))
      });
      setSectionIndex(readStoredSection(sectionStorageKey, questionPages.length));
      setStorageRestored(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [applicableQuestions, initialAnswers, questionPages.length, sectionStorageKey, storageKey]);

  useEffect(() => {
    if (storageRestored) writeSessionStorage(storageKey, JSON.stringify(answers));
  }, [answers, storageKey, storageRestored]);

  useEffect(() => {
    if (storageRestored) writeSessionStorage(sectionStorageKey, String(sectionIndex));
  }, [sectionIndex, sectionStorageKey, storageRestored]);

  const currentPage = questionPages[sectionIndex] ?? questionPages[0];
  const currentStep = currentPage?.step;
  const completedCount = displayedQuestions.filter((question) => Boolean(answers[question.id])).length;

  const validatePage = (index: number) => {
    const errors: Record<string, string> = {};
    for (const question of questionPages[index]?.questions ?? []) {
      if (!answers[question.id]) errors[question.id] = "この質問に回答してください";
    }
    setClientErrors(errors);
    if (Object.keys(errors).length > 0) scrollToDetailedError(errors);
    return Object.keys(errors).length === 0;
  };

  const goNext = async () => {
    if (!validatePage(sectionIndex)) return;
    if (trackProgress) {
      setSavingProgress(true);
      setProgressError("");
      try {
        await saveDetailedProgress(diagnosisId, sectionIndex + 1, answers, currentPage.questions.at(-1)?.id);
      } catch (error) {
        setProgressError(error instanceof Error ? error.message : "途中の回答を保存できませんでした。回答はこの画面に残っています。もう一度押してください。");
        setSavingProgress(false);
        return;
      }
      setSavingProgress(false);
    }
    setSectionIndex((current) => Math.min(current + 1, questionPages.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (submittingRef.current) {
      event.preventDefault();
      return;
    }
    const errors: Record<string, string> = {};
    for (const question of applicableQuestions) {
      if (!answers[question.id]) errors[question.id] = "この質問に回答してください";
    }
    if (Object.keys(errors).length === 0) {
      submittingRef.current = true;
      return;
    }
    event.preventDefault();
    setClientErrors(errors);
    const firstErrorId = Object.keys(errors)[0];
    const targetSection = questionPages.findIndex((page) =>
      page.questions.some((question) => question.id === firstErrorId)
    );
    if (targetSection >= 0) setSectionIndex(targetSection);
    window.setTimeout(() => scrollToDetailedError(errors), 0);
  };

  useEffect(() => {
    if (!isPending) submittingRef.current = false;
  }, [isPending, state]);

  useEffect(() => {
    const serverErrors = state.fieldErrors ?? {};
    const firstErrorId = Object.keys(serverErrors)[0];
    const timeout = window.setTimeout(() => {
      if (firstErrorId) {
        const targetSection = questionPages.findIndex((page) =>
          page.questions.some((question) => question.id === firstErrorId)
        );
        if (targetSection >= 0) setSectionIndex(targetSection);
        window.setTimeout(() => scrollToDetailedError(serverErrors), 0);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [questionPages, state]);

  if (!currentStep) return null;

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className="mx-auto max-w-5xl px-4 py-8">
      <input type="hidden" name="id" value={diagnosisId} />
      {applicableQuestions.map((question) => (
        <input key={question.id} type="hidden" name={question.id} value={answers[question.id] ?? ""} />
      ))}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black text-brand-700">詳しい診断 8分野＋業態別・追加{displayedQuestions.length}問</p>
              <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-800">テスト版</span>
            </div>
            <h1 className="mt-1 text-2xl font-black text-slate-950">{currentStep.label}</h1>
            <p className="mt-2 text-sm leading-7 text-slate-600">{currentStep.description}</p>
            {currentStep.referenceOnly ? (
              <p className="mt-2 rounded border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold leading-6 text-sky-900">この分野は参考診断として表示し、総合点には含めません。</p>
            ) : null}
          </div>
          <div className="text-sm font-bold text-slate-600">
            <p>{completedCount} / {displayedQuestions.length}問 回答済み</p>
            <p className="mt-1 text-brand-800">{sectionIndex + 1} / {questionPages.length}ページ</p>
          </div>
        </div>
        <div className="mt-4 grid gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setSectionIndex(questionPages.findIndex((page) => page.stepIndex === index))}
              className={`h-2 rounded ${index === currentPage.stepIndex ? "bg-brand-700" : index < currentPage.stepIndex ? "bg-emerald-500" : "bg-slate-200"}`}
              aria-label={`${step.label}へ移動`}
              title={step.label}
            />
          ))}
        </div>
      </div>

      {state.formError ? (
        <div className="mt-5 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800" role="alert">
          {state.formError}
        </div>
      ) : null}

      {progressError ? <div className="mt-5 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-800" role="alert">{progressError}</div> : null}

      {Object.keys(clientErrors).length > 0 ? (
        <div className="mt-5 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          <p className="font-black">未入力または確認が必要な項目があります。</p>
          <p className="mt-1">{clientErrors[Object.keys(clientErrors)[0]]}</p>
        </div>
      ) : null}

      <section className="mt-5 space-y-4">
          {currentPage.questions.map((question) => (
            <fieldset
              key={question.id}
              data-diagnosis-field={question.id}
              aria-invalid={Boolean(fieldErrors[question.id])}
              className={`rounded-lg border bg-white p-5 shadow-sm ${fieldErrors[question.id] ? "border-red-500 ring-1 ring-red-200" : "border-slate-200"}`}
            >
              <legend className="text-base font-black leading-7 text-slate-950">
                <span className="mr-2 text-brand-700">{question.id}</span>
                {question.question}
              </legend>
              {getDetailedQuestionHelp(question.id) ? <QuestionHelp>{getDetailedQuestionHelp(question.id)}</QuestionHelp> : null}
              <div className="mt-4 grid gap-2">
                {question.options.map((answerOption) => (
                  <label key={answerOption.value} className={`flex cursor-pointer items-start gap-3 rounded border px-3 py-3 text-sm font-semibold leading-6 ${answers[question.id] === answerOption.value ? "border-brand-600 bg-brand-50 text-brand-950" : "border-slate-200 bg-slate-50 text-slate-800"}`}>
                    <input
                      type="radio"
                      name={`display_${question.id}`}
                      value={answerOption.value}
                      checked={answers[question.id] === answerOption.value}
                      onChange={() => {
                        setAnswers((current) => ({ ...current, [question.id]: answerOption.value }));
                        setClientErrors((current) => {
                          const next = { ...current };
                          delete next[question.id];
                          return next;
                        });
                      }}
                      className="mt-1 h-4 w-4 shrink-0 accent-brand-700"
                    />
                    <span><span className="mr-2 font-black text-brand-700">{answerOption.score}</span>{answerOption.label}</span>
                  </label>
                ))}
              </div>
              {fieldErrors[question.id] ? <p className="mt-3 text-xs font-bold text-red-700">{fieldErrors[question.id]}</p> : null}
            </fieldset>
          ))}
      </section>

      <div className="sticky bottom-0 mt-6 flex flex-col gap-3 border-t border-slate-200 bg-slate-50/95 py-4 backdrop-blur sm:flex-row sm:justify-between">
        <button
          type="button"
          disabled={sectionIndex === 0}
          onClick={() => {
            setSectionIndex((current) => Math.max(0, current - 1));
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 focus-ring disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          前の質問
        </button>
        {sectionIndex < questionPages.length - 1 ? (
          <button type="button" disabled={savingProgress} onClick={goNext} className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 font-black text-white focus-ring disabled:cursor-wait disabled:bg-slate-500">
            {savingProgress ? "保存中です…" : "次の質問へ"}
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <DetailedSubmitButton pending={isPending} />
        )}
      </div>
    </form>
  );
}

function DetailedSubmitButton({ pending }: { pending: boolean }) {
  return (
    <button disabled={pending} className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 font-black text-white focus-ring disabled:cursor-wait disabled:bg-slate-500">
      <Save className="h-4 w-4" />
      {pending ? "送信中です…" : "詳細診断結果を見る"}
    </button>
  );
}

function readStoredAnswers(storageKey: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const stored = sessionStorage.getItem(storageKey);
    if (!stored) return {};
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string")
    );
  } catch {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // Some in-app browsers block storage access entirely.
    }
    return {};
  }
}

function readStoredSection(storageKey: string, stepCount: number) {
  if (typeof window === "undefined") return 0;
  try {
    const value = Number(sessionStorage.getItem(storageKey));
    return Number.isInteger(value) && value >= 0 && value < stepCount ? value : 0;
  } catch {
    return 0;
  }
}

function writeSessionStorage(storageKey: string, value: string) {
  try {
    sessionStorage.setItem(storageKey, value);
  } catch {
    // Form input remains usable when storage is unavailable or full.
  }
}

async function saveDetailedProgress(sessionId: string, step: number, answers: Record<string, string>, questionId?: string) {
  const response = await fetch("/api/diagnosis/v2-progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "progress", stage: "detailed", sessionId, step, answers, questionId })
  });
  if (response.ok) return;
  const result = await response.json().catch(() => ({})) as { error?: string };
  throw new Error(result.error || "途中の回答を保存できませんでした。回答はこの画面に残っています。もう一度押してください。");
}

function scrollToDetailedError(errors: Record<string, string>) {
  const firstError = Object.keys(errors)[0];
  if (!firstError) return;
  window.requestAnimationFrame(() => {
    const target = Array.from(document.querySelectorAll<HTMLElement>("[data-diagnosis-field]"))
      .find((element) => element.dataset.diagnosisField === firstError);
    if (!target) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.querySelector<HTMLElement>("input, select, textarea, button")?.focus({ preventScroll: true });
  });
}
