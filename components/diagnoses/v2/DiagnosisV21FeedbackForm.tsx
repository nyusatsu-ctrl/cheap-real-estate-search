"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  submitDiagnosisV2FeedbackAction,
  type DiagnosisV2FormState
} from "@/app/diagnosis/v2-actions";
import { MessageSquareText, Send } from "lucide-react";

const INITIAL_STATE: DiagnosisV2FormState = { fieldErrors: {} };

export function DiagnosisV21FeedbackForm({
  diagnosisId,
  submitted
}: {
  diagnosisId: string;
  submitted: boolean;
}) {
  const [state, formAction] = useActionState(submitDiagnosisV2FeedbackAction, INITIAL_STATE);
  const submittingRef = useRef(false);

  useEffect(() => {
    submittingRef.current = false;
  }, [state]);

  if (state.success) {
    return (
      <section className="print:hidden rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="font-black text-emerald-950">テストへのご協力ありがとうございました</h2>
        <p className="mt-2 text-sm leading-7 text-emerald-900">お寄せいただいた内容は、質問と診断結果の改善に利用します。</p>
      </section>
    );
  }

  return (
    <section className="print:hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-5 w-5 text-brand-700" />
        <h2 className="text-xl font-black text-slate-950">テストフィードバック（任意）</h2>
      </div>
      <p className="mt-2 text-sm leading-7 text-slate-600">任意回答です。診断内容の改善に利用します。</p>
      {submitted ? <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900">以前の回答があります。再送信すると最新の内容へ更新されます。</p> : null}
      {state.formError ? <p className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800" role="alert">{state.formError}</p> : null}
      <form
        action={formAction}
        onSubmit={(event) => {
          if (submittingRef.current) event.preventDefault();
          submittingRef.current = true;
        }}
        className="mt-5 grid gap-5"
      >
        <input type="hidden" name="id" value={diagnosisId} />
        <RatingQuestion name="feedback_accuracy" label="今回の診断結果は、自社の状況にどの程度合っていましたか？" error={state.fieldErrors?.feedback_accuracy} />
        <label className="grid gap-2 text-sm font-black leading-6 text-slate-800">
          特に役立った点、分かりにくかった点、追加してほしい内容があればご記入ください。
          <textarea name="feedback_comment" rows={5} maxLength={3000} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" placeholder="任意で入力してください" />
        </label>
        <FeedbackSubmitButton />
      </form>
    </section>
  );
}

function RatingQuestion({ name, label, error }: { name: string; label: string; error?: string }) {
  const options = [
    [1, "合っていない"],
    [2, "あまり合っていない"],
    [3, "どちらともいえない"],
    [4, "おおむね合っている"],
    [5, "非常に合っている"]
  ] as const;
  return (
    <fieldset>
      <legend className="text-sm font-black leading-6 text-slate-800">{label}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-5">
        {options.map(([score, optionLabel]) => (
          <label key={score} className="flex min-h-12 cursor-pointer items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
            <input type="radio" name={name} value={score} className="h-4 w-4 accent-brand-700" />
            <span>{score}: {optionLabel}</span>
          </label>
        ))}
      </div>
      {error ? <p className="mt-2 text-xs font-bold text-red-700">{error}</p> : null}
    </fieldset>
  );
}

function FeedbackSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded bg-slate-900 px-5 py-3 font-black text-white focus-ring disabled:cursor-wait disabled:bg-slate-500 sm:w-auto">
      <Send className="h-4 w-4" />
      {pending ? "送信中..." : "フィードバックを送信する"}
    </button>
  );
}
