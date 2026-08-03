"use client";

import { useActionState, useMemo, useState } from "react";
import { submitGrowthStrategyAction, type StrategyActionState } from "@/app/diagnosis/strategy-actions";
import type { DiagnosisV2AnswerMap } from "@/lib/construction-diagnosis-v2/questions";
import type { StrategyQuestion } from "@/lib/construction-diagnosis-v2/strategy";
import { ArrowLeft, ArrowRight, CheckCircle2, Save } from "lucide-react";

const INITIAL: StrategyActionState = { fieldErrors: {} };

export function DiagnosisV23StrategyForm({
  sessionId,
  questions,
  initialAnswers,
  initialSavedAt
}: {
  sessionId: string;
  questions: StrategyQuestion[];
  initialAnswers: DiagnosisV2AnswerMap;
  initialSavedAt: string | null;
}) {
  const [state, formAction, pending] = useActionState(submitGrowthStrategyAction, INITIAL);
  const [answers, setAnswers] = useState<DiagnosisV2AnswerMap>(initialAnswers);
  const firstUnanswered = Math.max(0, questions.findIndex((question) => !question.options.some((option) => option.value === initialAnswers[question.id])));
  const [step, setStep] = useState(firstUnanswered === -1 ? questions.length - 1 : firstUnanswered);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(initialSavedAt ? "saved" : "idle");
  const question = questions[step];
  const answeredCount = useMemo(() => questions.filter((item) => item.options.some((option) => option.value === answers[item.id])).length, [answers, questions]);

  const saveProgress = async (nextStep: number, questionId: string) => {
    setSaveState("saving");
    try {
      const response = await fetch("/api/diagnosis/v2-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "progress", stage: "strategy", sessionId, step: nextStep, questionId, answers })
      });
      if (!response.ok) throw new Error("save failed");
      setSaveState("saved");
      return true;
    } catch {
      setSaveState("error");
      return false;
    }
  };

  const selectAnswer = (answer: string) => {
    setAnswers((current) => ({ ...current, [question.id]: answer }));
    setSaveState("idle");
  };

  const move = async (direction: 1 | -1) => {
    if (direction === 1 && !answers[question.id]) return;
    if (direction === 1 && !await saveProgress(step + 1, question.id)) return;
    setStep((current) => Math.min(questions.length - 1, Math.max(0, current + direction)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-black text-brand-700">御社に合わせた追加質問</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">再成長戦略を作るための{questions.length}問</h1>
        <p className="mt-3 text-sm leading-7 text-slate-700">共通6問と、3分診断で確認が必要だった分野だけを表示しています。回答ごとに自動保存します。</p>
        <div className="mt-5 h-3 overflow-hidden rounded bg-slate-100"><div className="h-full rounded bg-brand-700 transition-all" style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div>
        <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-500"><span>{step + 1} / {questions.length}問</span><span>{answeredCount}問回答済み</span></div>
      </div>

      <form action={formAction} className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <input type="hidden" name="session_id" value={sessionId} />
        {questions.map((item) => <input key={item.id} type="hidden" name={item.id} value={answers[item.id] ?? ""} />)}
        {state.formError ? <p role="alert" className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800">{state.formError}</p> : null}
        {saveState === "error" ? <p role="alert" className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800">途中の回答を保存できませんでした。通信状態を確認し、もう一度「次へ」を押してください。</p> : null}
        <p className="text-xs font-black text-brand-700">{question.id}</p>
        <h2 className="mt-2 text-xl font-black leading-8 text-slate-950">{question.question}</h2>
        <div className="mt-5 grid gap-3">
          {question.options.map((option) => (
            <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded border p-4 text-sm font-bold leading-6 ${answers[question.id] === option.value ? "border-brand-600 bg-brand-50 text-brand-950" : "border-slate-200 bg-white text-slate-800"}`}>
              <input type="radio" name={`visible_${question.id}`} value={option.value} checked={answers[question.id] === option.value} onChange={() => selectAnswer(option.value)} className="mt-0.5 h-5 w-5 shrink-0 accent-brand-700" />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        {state.fieldErrors?.[question.id] ? <p className="mt-3 text-sm font-bold text-red-700">{state.fieldErrors[question.id]}</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => void move(-1)} disabled={step === 0 || pending} className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-4 py-3 font-bold text-slate-700 disabled:opacity-40"><ArrowLeft className="h-4 w-4" />戻る</button>
          {step < questions.length - 1 ? (
            <button type="button" onClick={() => void move(1)} disabled={!answers[question.id] || saveState === "saving" || pending} className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 font-black text-white disabled:bg-slate-400">{saveState === "saving" ? "保存中です…" : "次へ"}<ArrowRight className="h-4 w-4" /></button>
          ) : (
            <button disabled={pending || answeredCount !== questions.length} className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 font-black text-white disabled:bg-slate-400">{pending ? "作成中です…" : "御社の再成長戦略を見る"}<CheckCircle2 className="h-4 w-4" /></button>
          )}
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500"><Save className="h-3.5 w-3.5" />{saveState === "saved" ? "この端末で再開できるよう保存済みです" : saveState === "saving" ? "保存中です…" : "回答後に「次へ」を押すと保存されます"}</p>
      </form>
    </div>
  );
}
