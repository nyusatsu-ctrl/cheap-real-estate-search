"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitConstructionDiagnosisAction, type DiagnosisFormState } from "@/app/diagnosis/actions";
import { DiagnosisQuestionField } from "@/components/diagnoses/DiagnosisQuestionField";
import { CalendarCheck, ClipboardCheck } from "lucide-react";

type DiagnosisQuestionOption = {
  value: string;
  label: string;
};

type SupplementalAnswerField = {
  key: string;
  label: string;
  placeholder?: string;
  triggerValues?: string[];
  requiredWhenTriggered?: boolean;
};

export type DiagnosisFormQuestion = {
  key: string;
  label: string;
  type: "radio" | "textarea";
  options?: DiagnosisQuestionOption[];
  supplementalFields: SupplementalAnswerField[];
};

type DiagnosisFormProps = {
  leadSource: string;
  campaign: string;
  questions: DiagnosisFormQuestion[];
};

const INITIAL_STATE: DiagnosisFormState = {
  fieldErrors: {}
};

const SEMINAR_INTEREST_CHOICES = [
  { value: "wants_to_join", label: "無料説明会に参加したい" },
  { value: "wants_schedule", label: "日程が合えば参加したい" },
  { value: "wants_materials", label: "まずは資料だけ見たい" },
  { value: "not_interested", label: "今は希望しない" }
];

export function DiagnosisForm({ leadSource, campaign, questions }: DiagnosisFormProps) {
  const [state, formAction] = useActionState(submitConstructionDiagnosisAction, INITIAL_STATE);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="mx-auto max-w-5xl px-4 py-8">
      <input type="hidden" name="lead_source" value={leadSource} />
      <input type="hidden" name="source_campaign" value={campaign} />

      {state.formError ? (
        <div className="mb-5 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800" role="alert" aria-live="polite">
          {state.formError}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-brand-700" />
          <h2 className="text-xl font-black text-slate-950">連絡先</h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <TextField name="name" label="氏名" required error={fieldErrors.name} />
          <TextField name="company_name" label="会社名・屋号" />
          <TextField name="phone" label="電話番号" type="tel" />
          <TextField name="email" label="メールアドレス" type="email" required error={fieldErrors.email} />
          <TextField name="service_area" label="対応エリア" placeholder="例: 熊本県内、九州一円、熊本市周辺など" />
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {questions.map((question, index) => (
          <DiagnosisQuestionField
            key={question.key}
            question={question}
            index={index}
            supplementalFields={question.supplementalFields}
            fieldErrors={fieldErrors}
          />
        ))}
      </div>

      <fieldset className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <legend className="text-xl font-black text-slate-950">
          <span className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-brand-700" />
            無料オンライン説明会について
          </span>
        </legend>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {SEMINAR_INTEREST_CHOICES.map((option) => (
            <label key={option.value} className="flex min-h-12 cursor-pointer items-center gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-800">
              <input name="seminar_interest" type="radio" value={option.value} required className="h-4 w-4 accent-brand-700" />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <div className="mt-5 max-w-xl">
          <TextField name="preferred_contact_time" label="連絡がつきやすい時間帯（任意）" placeholder="例: 平日10時〜12時、13時〜17時、夕方以降、土曜午前中など" />
        </div>
      </fieldset>

      <div className="sticky bottom-0 mt-6 border-t border-slate-200 bg-slate-50 py-4">
        <SubmitButton />
      </div>
    </form>
  );
}

function TextField({
  name,
  label,
  type = "text",
  required = false,
  placeholder,
  error
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
}) {
  const errorId = `${name}-error`;

  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring aria-[invalid=true]:border-red-500"
      />
      {error ? <span id={errorId} className="text-xs font-bold text-red-700">{error}</span> : null}
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      className="w-full rounded bg-brand-700 px-5 py-4 text-base font-black text-white shadow-soft focus-ring disabled:cursor-wait disabled:bg-slate-500 md:w-auto"
    >
      {pending ? "診断中..." : "診断結果を見る"}
    </button>
  );
}
