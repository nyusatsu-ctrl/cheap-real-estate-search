"use client";

import { useMemo, useState } from "react";

type DiagnosisQuestionOption = {
  value: string;
  label: string;
};

type DiagnosisQuestion = {
  key: string;
  label: string;
  type: "radio" | "textarea";
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
  supplementalFields
}: {
  question: DiagnosisQuestion;
  index: number;
  supplementalFields: SupplementalAnswerField[];
}) {
  const [selectedValue, setSelectedValue] = useState("");
  const activeFields = useMemo(
    () => supplementalFields.filter((field) => field.triggerValues?.includes(selectedValue)),
    [selectedValue, supplementalFields]
  );

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
                type="radio"
                value={option.value}
                required
                onChange={() => setSelectedValue(option.value)}
                className="h-4 w-4 accent-brand-700"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}

      {activeFields.length > 0 ? (
        <div className="mt-4 grid gap-4 rounded border border-brand-100 bg-brand-50/40 p-4">
          {activeFields.map((field) => (
            <label key={field.key} className="grid gap-1 text-sm font-bold text-slate-700">
              {field.label}
              <input
                name={field.key}
                required={field.requiredWhenTriggered}
                placeholder={field.placeholder}
                className="rounded border border-slate-300 bg-white px-3 py-2 font-normal focus-ring"
              />
            </label>
          ))}
        </div>
      ) : null}
    </fieldset>
  );
}
