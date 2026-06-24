"use client";

import { useMemo, useState } from "react";

type DiagnosisQuestionOption = {
  value: string;
  label: string;
};

type DiagnosisQuestion = {
  key: string;
  label: string;
  type: "radio" | "checkbox" | "textarea";
  options?: DiagnosisQuestionOption[];
};

type SupplementalAnswerField = {
  key: string;
  label: string;
  placeholder?: string;
  triggerValues?: string[];
  requiredWhenTriggered?: boolean;
};

export function DiagnosisQuestionField({
  question,
  index,
  supplementalFields,
  fieldErrors = {}
}: {
  question: DiagnosisQuestion;
  index: number;
  supplementalFields: SupplementalAnswerField[];
  fieldErrors?: Record<string, string>;
}) {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const activeFields = useMemo(
    () => supplementalFields.filter((field) => field.triggerValues?.some((value) => selectedValues.includes(value))),
    [selectedValues, supplementalFields]
  );
  const questionError = fieldErrors[question.key];

  return (
    <fieldset className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <legend className="text-base font-black text-slate-950">
        <span className="mr-2 text-brand-700">{index + 1}.</span>
        {question.label}
      </legend>
      {question.type === "textarea" ? (
        <textarea
          name={question.key}
          required
          rows={4}
          className="mt-4 w-full rounded border border-slate-300 px-3 py-2 text-sm focus-ring"
        />
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {question.options?.map((option) => (
            <label key={option.value} className="flex min-h-12 cursor-pointer items-center gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-800">
              <input
                name={question.key}
                type={question.type}
                value={option.value}
                required={question.type === "radio"}
                onChange={(event) => {
                  if (question.type === "checkbox") {
                    setSelectedValues((current) => event.target.checked
                      ? [...current, option.value]
                      : current.filter((value) => value !== option.value));
                    return;
                  }
                  setSelectedValues([option.value]);
                }}
                aria-invalid={Boolean(questionError)}
                className="h-4 w-4 accent-brand-700"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}
      {questionError ? <p className="mt-3 text-xs font-bold text-red-700">{questionError}</p> : null}

      {activeFields.length > 0 ? (
        <div className="mt-4 grid gap-4 rounded border border-brand-100 bg-brand-50/40 p-4">
          {activeFields.map((field) => {
            const error = fieldErrors[field.key];
            const errorId = `${field.key}-error`;

            return (
              <label key={field.key} className="grid gap-1 text-sm font-bold text-slate-700">
                {field.label}
                <input
                  name={field.key}
                  required={field.requiredWhenTriggered}
                  placeholder={field.placeholder}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? errorId : undefined}
                  className="rounded border border-slate-300 bg-white px-3 py-2 font-normal focus-ring aria-[invalid=true]:border-red-500"
                />
                {error ? <span id={errorId} className="text-xs font-bold text-red-700">{error}</span> : null}
              </label>
            );
          })}
        </div>
      ) : null}
    </fieldset>
  );
}
