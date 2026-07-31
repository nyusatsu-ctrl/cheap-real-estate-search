"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitDiagnosisV2DetailedAction, type DiagnosisV2FormState } from "@/app/diagnosis/v2-actions";
import {
  DETAILED_DIAGNOSIS_QUESTIONS,
  DIAGNOSIS_V2_SECTIONS,
  getDetailedQuestionsForSection
} from "@/lib/construction-diagnosis-v2/questions";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";

const INITIAL_STATE: DiagnosisV2FormState = { fieldErrors: {} };

export function DiagnosisV2DetailedForm({ diagnosisId }: { diagnosisId: string }) {
  const [state, formAction] = useActionState(submitDiagnosisV2DetailedAction, INITIAL_STATE);
  const storageKey = `construction-management-diagnosis-v2-details-${diagnosisId}`;
  const sectionStorageKey = `${storageKey}-section`;
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [storageRestored, setStorageRestored] = useState(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const submittingRef = useRef(false);
  const fieldErrors = useMemo(
    () => ({ ...(state.fieldErrors ?? {}), ...clientErrors }),
    [clientErrors, state.fieldErrors]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAnswers(readStoredAnswers(storageKey));
      setSectionIndex(readStoredSection(sectionStorageKey));
      setStorageRestored(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [sectionStorageKey, storageKey]);

  useEffect(() => {
    if (storageRestored) sessionStorage.setItem(storageKey, JSON.stringify(answers));
  }, [answers, storageKey, storageRestored]);

  useEffect(() => {
    if (storageRestored) sessionStorage.setItem(sectionStorageKey, String(sectionIndex));
  }, [sectionIndex, sectionStorageKey, storageRestored]);

  const currentSection = DIAGNOSIS_V2_SECTIONS[sectionIndex];
  const completedCount = DETAILED_DIAGNOSIS_QUESTIONS.filter((question) => Boolean(answers[question.id])).length;

  const validateSection = (index: number) => {
    const errors: Record<string, string> = {};
    for (const question of getDetailedQuestionsForSection(DIAGNOSIS_V2_SECTIONS[index].id)) {
      if (!answers[question.id]) errors[question.id] = "回答を選択してください";
    }
    setClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goNext = () => {
    if (!validateSection(sectionIndex)) return;
    setSectionIndex((current) => Math.min(current + 1, DIAGNOSIS_V2_SECTIONS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (submittingRef.current) {
      event.preventDefault();
      return;
    }
    const errors: Record<string, string> = {};
    for (const question of DETAILED_DIAGNOSIS_QUESTIONS) {
      if (!answers[question.id]) errors[question.id] = "回答を選択してください";
    }
    if (Object.keys(errors).length === 0) {
      submittingRef.current = true;
      return;
    }
    event.preventDefault();
    setClientErrors(errors);
    const firstErrorId = Object.keys(errors)[0];
    const targetSection = DIAGNOSIS_V2_SECTIONS.findIndex((section) =>
      getDetailedQuestionsForSection(section.id).some((question) => question.id === firstErrorId)
    );
    if (targetSection >= 0) setSectionIndex(targetSection);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    submittingRef.current = false;
  }, [state]);

  return (
    <form action={formAction} onSubmit={handleSubmit} className="mx-auto max-w-5xl px-4 py-8">
      <input type="hidden" name="id" value={diagnosisId} />
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black text-brand-700">詳細診断 8分野・34問</p>
              <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-800">テスト版</span>
            </div>
            <h1 className="mt-1 text-2xl font-black text-slate-950">{sectionIndex + 1}. {currentSection.label}</h1>
            <p className="mt-2 text-sm leading-7 text-slate-600">{currentSection.description}</p>
          </div>
          <p className="text-sm font-bold text-slate-600">{completedCount} / {DETAILED_DIAGNOSIS_QUESTIONS.length}問 回答済み</p>
        </div>
        <div className="mt-4 grid grid-cols-8 gap-1">
          {DIAGNOSIS_V2_SECTIONS.map((section, index) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setSectionIndex(index)}
              className={`h-2 rounded ${index === sectionIndex ? "bg-brand-700" : index < sectionIndex ? "bg-emerald-500" : "bg-slate-200"}`}
              aria-label={`${section.label}へ移動`}
              title={section.label}
            />
          ))}
        </div>
      </div>

      {state.formError ? (
        <div className="mt-5 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800" role="alert">
          {state.formError}
        </div>
      ) : null}

      {DIAGNOSIS_V2_SECTIONS.map((section, index) => (
        <section key={section.id} className={index === sectionIndex ? "mt-5 space-y-4" : "hidden"} aria-hidden={index !== sectionIndex}>
          {getDetailedQuestionsForSection(section.id).map((question) => (
            <fieldset key={question.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <legend className="text-base font-black leading-7 text-slate-950">
                <span className="mr-2 text-brand-700">{question.id}</span>
                {question.question}
                <span className="ml-2 text-xs font-bold text-slate-400">重み{question.weight}{question.critical ? "・重大項目" : ""}</span>
              </legend>
              <div className="mt-4 grid gap-2">
                {question.options.map((answerOption) => (
                  <label key={answerOption.value} className={`flex cursor-pointer items-start gap-3 rounded border px-3 py-3 text-sm font-semibold leading-6 ${answers[question.id] === answerOption.value ? "border-brand-600 bg-brand-50 text-brand-950" : "border-slate-200 bg-slate-50 text-slate-800"}`}>
                    <input
                      type="radio"
                      name={question.id}
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
      ))}

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
          前の分野
        </button>
        {sectionIndex < DIAGNOSIS_V2_SECTIONS.length - 1 ? (
          <button type="button" onClick={goNext} className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 font-black text-white focus-ring">
            次の分野
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <DetailedSubmitButton />
        )}
      </div>
    </form>
  );
}

function DetailedSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 font-black text-white focus-ring disabled:cursor-wait disabled:bg-slate-500">
      <Save className="h-4 w-4" />
      {pending ? "結果を作成中..." : "詳細診断結果を見る"}
    </button>
  );
}

function readStoredAnswers(storageKey: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const stored = sessionStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) as Record<string, string> : {};
  } catch {
    sessionStorage.removeItem(storageKey);
    return {};
  }
}

function readStoredSection(storageKey: string) {
  if (typeof window === "undefined") return 0;
  const value = Number(sessionStorage.getItem(storageKey));
  return Number.isInteger(value) && value >= 0 && value < DIAGNOSIS_V2_SECTIONS.length ? value : 0;
}
