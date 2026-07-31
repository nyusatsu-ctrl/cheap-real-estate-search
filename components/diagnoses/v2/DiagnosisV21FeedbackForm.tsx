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

  if (submitted || state.success) {
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
      <p className="mt-2 text-sm leading-7 text-slate-600">知り合いの建設会社様による試験利用のため、率直なご意見をお聞かせください。</p>
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
        <RatingQuestion name="feedback_clarity" label="1. 質問は分かりやすかったですか。" error={state.fieldErrors?.feedback_clarity} />
        <RatingQuestion name="feedback_accuracy" label="2. 診断結果は会社の実情に合っていましたか。" error={state.fieldErrors?.feedback_accuracy} />
        <RatingQuestion name="feedback_usefulness" label="3. 参考になる内容はありましたか。" error={state.fieldErrors?.feedback_usefulness} />
        <fieldset>
          <legend className="text-sm font-black leading-6 text-slate-800">4. 診断結果について詳しく相談したいと思いましたか。</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { value: "yes", label: "はい" },
              { value: "neutral", label: "どちらともいえない" },
              { value: "no", label: "いいえ" }
            ].map((option) => (
              <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                <input type="radio" name="feedback_consultation_interest" value={option.value} className="h-4 w-4 accent-brand-700" />
                {option.label}
              </label>
            ))}
          </div>
          {state.fieldErrors?.feedback_consultation_interest ? <p className="mt-2 text-xs font-bold text-red-700">{state.fieldErrors.feedback_consultation_interest}</p> : null}
        </fieldset>
        <label className="grid gap-2 text-sm font-black leading-6 text-slate-800">
          5. 分かりにくかった質問、実情と違った結果、追加してほしい内容
          <textarea name="feedback_comment" rows={5} maxLength={3000} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" placeholder="任意で入力してください" />
        </label>
        <FeedbackSubmitButton />
      </form>
    </section>
  );
}

function RatingQuestion({ name, label, error }: { name: string; label: string; error?: string }) {
  return (
    <fieldset>
      <legend className="text-sm font-black leading-6 text-slate-800">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <label key={score} className="flex h-11 w-12 cursor-pointer items-center justify-center gap-1 rounded border border-slate-200 bg-slate-50 text-sm font-black text-slate-700">
            <input type="radio" name={name} value={score} className="h-4 w-4 accent-brand-700" />
            {score}
          </label>
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-500">1: 低い / 5: 高い</p>
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
