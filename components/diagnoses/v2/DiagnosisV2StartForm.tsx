"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { submitDiagnosisV2QuickAction, type DiagnosisV2FormState } from "@/app/diagnosis/v2-actions";
import { getShortDiagnosisQuestions, type ShortDiagnosisQuestion } from "@/lib/construction-diagnosis-v2/short-questions";
import {
  DIAGNOSIS_V22_EMPLOYEE_OPTIONS,
  DIAGNOSIS_V22_SALES_OPTIONS,
  normalizeStoredDiagnosisV2StartValues,
  pruneDiagnosisV2StartValues,
  serializeDiagnosisV2StartValues,
  validateDiagnosisV2BasicStep,
  type DiagnosisV2StartFormValues
} from "@/lib/construction-diagnosis-v2/start-form";
import {
  DIAGNOSIS_V22_ORDER_MODEL_OPTIONS,
  PRIMARY_TRADE_OPTIONS,
  PUBLIC_WORK_INTENT_OPTIONS
} from "@/lib/construction-diagnosis-v2/specialty-questions";
import { ArrowLeft, ArrowRight, Building2, ClipboardCheck, ShieldCheck } from "lucide-react";
import { QuestionHelp } from "./QuestionHelp";

const INITIAL_STATE: DiagnosisV2FormState = { fieldErrors: {} };
const STORAGE_KEY = "construction-management-diagnosis-v2-2-start";
const STEP_STORAGE_KEY = `${STORAGE_KEY}-step`;
const PAGE_STORAGE_KEY = `${STORAGE_KEY}-page`;
const SESSION_STORAGE_KEY = `${STORAGE_KEY}-session`;
const QUESTIONS_PER_PAGE = 2;

export function DiagnosisV2StartForm({ leadSource, campaign }: { leadSource: string; campaign: string }) {
  const [state, formAction, isPending] = useActionState(submitDiagnosisV2QuickAction, INITIAL_STATE);
  const [step, setStep] = useState(0);
  const [page, setPage] = useState(0);
  const [values, setValues] = useState<DiagnosisV2StartFormValues>({});
  const [sessionId, setSessionId] = useState("");
  const [restored, setRestored] = useState(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [progressError, setProgressError] = useState("");
  const [definitionUpdated, setDefinitionUpdated] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const submittingRef = useRef(false);
  const fieldErrors = useMemo(() => ({ ...(state.fieldErrors ?? {}), ...clientErrors }), [clientErrors, state.fieldErrors]);
  const shortQuestions = useMemo(() => getShortDiagnosisQuestions({
    primaryTrade: values.primary_trade,
    publicWorkIntent: values.public_work_intent
  }), [values.primary_trade, values.public_work_intent]);
  const requiredQuestions = shortQuestions.filter((question) => !question.optional);
  const optionalCount = shortQuestions.length - requiredQuestions.length;
  const pageCount = Math.max(1, Math.ceil(shortQuestions.length / QUESTIONS_PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const visibleQuestions = shortQuestions.slice(safePage * QUESTIONS_PER_PAGE, (safePage + 1) * QUESTIONS_PER_PAGE);
  const completedRequired = requiredQuestions.filter((question) => Boolean(values[question.id])).length;
  const remaining = Math.max(0, requiredQuestions.length - completedRequired);
  const progress = requiredQuestions.length === 0 ? 0 : Math.round((completedRequired / requiredQuestions.length) * 100);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const storedSession = readStorage(SESSION_STORAGE_KEY);
      const stored = readStoredValues();
      setValues(stored.values);
      setDefinitionUpdated(stored.definitionUpdated);
      setSessionId(stored.definitionUpdated ? "" : storedSession);
      if (stored.definitionUpdated) {
        removeStorage(SESSION_STORAGE_KEY);
        removeStorage(STEP_STORAGE_KEY);
        removeStorage(PAGE_STORAGE_KEY);
      }
      setStep(stored.definitionUpdated ? 0 : storedSession ? readStoredNumber(STEP_STORAGE_KEY, 1) : 0);
      setPage(stored.definitionUpdated ? 0 : readStoredNumber(PAGE_STORAGE_KEY, 20));
      setRestored(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!restored) return;
    writeStorage(STORAGE_KEY, serializeDiagnosisV2StartValues(values));
    writeStorage(STEP_STORAGE_KEY, String(step));
    writeStorage(PAGE_STORAGE_KEY, String(page));
    if (sessionId) writeStorage(SESSION_STORAGE_KEY, sessionId);
  }, [page, restored, sessionId, step, values]);

  useEffect(() => {
    if (!isPending) submittingRef.current = false;
  }, [isPending, state]);

  useEffect(() => {
    const serverErrors = state.fieldErrors ?? {};
    if (Object.keys(serverErrors).length === 0) return;
    const timeout = window.setTimeout(() => {
      const firstId = Object.keys(serverErrors)[0];
      const questionIndex = shortQuestions.findIndex((question) => question.id === firstId);
      if (questionIndex >= 0) {
        setStep(1);
        setPage(Math.floor(questionIndex / QUESTIONS_PER_PAGE));
      } else {
        setStep(0);
      }
      window.setTimeout(() => scrollToError(serverErrors), 0);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [shortQuestions, state.fieldErrors]);

  const setValue = (name: string, value: string) => {
    setValues((current) => {
      const next = { ...current, [name]: value };
      if (name !== "primary_trade" && name !== "public_work_intent") return next;
      const applicableIds = getShortDiagnosisQuestions({
        primaryTrade: next.primary_trade,
        publicWorkIntent: next.public_work_intent
      }).map((question) => question.id);
      return pruneDiagnosisV2StartValues(next, applicableIds);
    });
    setClientErrors((current) => omitKey(current, name));
    setProgressError("");
  };

  const startShortDiagnosis = async () => {
    const errors = validateDiagnosisV2BasicStep(values);
    setClientErrors(errors);
    if (Object.keys(errors).length > 0) {
      scrollToError(errors);
      return;
    }
    setSavingProgress(true);
    setProgressError("");
    try {
      const response = await fetch("/api/diagnosis/v2-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", sessionId, values, leadSource, campaign })
      });
      const result = await response.json() as { id?: string; error?: string; errors?: Record<string, string> };
      if (!response.ok || !result.id) {
        if (result.errors) {
          setClientErrors(result.errors);
          scrollToError(result.errors);
        }
        throw new Error(result.error || "通信できませんでした。入力内容は消えていません。もう一度押してください。");
      }
      setSessionId(result.id);
      setStep(1);
      setPage(0);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setProgressError(error instanceof Error ? error.message : "通信できませんでした。入力内容は消えていません。もう一度押してください。");
    } finally {
      setSavingProgress(false);
    }
  };

  const savePageAndContinue = async () => {
    const errors = validateQuestions(visibleQuestions, values);
    setClientErrors(errors);
    if (Object.keys(errors).length > 0) {
      scrollToError(errors);
      return;
    }
    setSavingProgress(true);
    setProgressError("");
    try {
      await saveProgress(sessionId, safePage + 1, values, shortQuestions[Math.min((safePage + 1) * QUESTIONS_PER_PAGE, shortQuestions.length - 1)]?.id);
      setPage(Math.min(safePage + 1, pageCount - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setProgressError(error instanceof Error ? error.message : "途中の回答を保存できませんでした。入力内容はこの画面に残っています。もう一度押してください。");
    } finally {
      setSavingProgress(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (submittingRef.current || !sessionId) {
      event.preventDefault();
      if (!sessionId) setProgressError("診断の保存先を確認できません。最初の画面からもう一度進んでください。");
      return;
    }
    const errors = validateQuestions(requiredQuestions, values);
    if (Object.keys(errors).length > 0) {
      event.preventDefault();
      setClientErrors(errors);
      showQuestionError(errors, shortQuestions, setPage);
      return;
    }
    submittingRef.current = true;
  };

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className="mx-auto max-w-3xl px-4 py-8">
      <input type="hidden" name="session_id" value={sessionId} />
      <input type="hidden" name="lead_source" value={leadSource} />
      <input type="hidden" name="source_campaign" value={campaign} />
      {["primary_trade", "order_model", "employee_range", "sales_range", "public_work_intent"].map((name) => (
        <input key={name} type="hidden" name={name} value={values[name] ?? ""} />
      ))}
      {shortQuestions.map((question) => <input key={question.id} type="hidden" name={question.id} value={values[question.id] ?? ""} />)}

      <div className="mb-6 grid grid-cols-2 gap-2" aria-label="診断の進行状況">
        {["会社について", "3分診断"].map((label, index) => (
          <div key={label} className={`rounded border px-3 py-3 text-center text-sm font-black ${index === step ? "border-brand-700 bg-brand-50 text-brand-800" : index < step ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-500"}`}>
            {index + 1}. {label}
          </div>
        ))}
      </div>

      {(state.formError || progressError) ? (
        <div id="diagnosis-v2-form-error" className="mb-5 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-800" role="alert">
          <p>回答を確認してください</p>
          <p className="mt-1 font-semibold">{progressError || state.formError}</p>
        </div>
      ) : null}
      {definitionUpdated ? (
        <div className="mb-5 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900" role="status">
          診断内容が更新されました。入力済みの内容を確認して、もう一度進めてください。
        </div>
      ) : null}
      {Object.keys(clientErrors).length > 0 ? (
        <div className="mb-5 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          <p className="font-black">回答を確認してください</p>
          <p className="mt-1">{clientErrors[Object.keys(clientErrors)[0]]}</p>
        </div>
      ) : null}

      <section className={step === 0 ? "space-y-5" : "hidden"} aria-hidden={step !== 0}>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand-700" />
            <h1 className="text-xl font-black text-slate-950">最初に5つだけ教えてください</h1>
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-600">会社名や連絡先はまだ入力しません。診断結果を見てから、保存や相談を希望する場合だけ入力できます。</p>
          <div className="mt-5 grid gap-4">
            <ValueSelect name="primary_trade" label="主な業種" value={values.primary_trade} options={PRIMARY_TRADE_OPTIONS} onChange={setValue} error={fieldErrors.primary_trade} />
            <ValueSelect name="order_model" label="主な仕事の受け方" value={values.order_model} options={DIAGNOSIS_V22_ORDER_MODEL_OPTIONS} onChange={setValue} error={fieldErrors.order_model} />
            <StringSelect name="employee_range" label="従業員数" value={values.employee_range} options={DIAGNOSIS_V22_EMPLOYEE_OPTIONS} onChange={setValue} error={fieldErrors.employee_range} />
            <StringSelect name="sales_range" label="年商区分" value={values.sales_range} options={DIAGNOSIS_V22_SALES_OPTIONS} onChange={setValue} error={fieldErrors.sales_range} />
            <ValueSelect name="public_work_intent" label="公共工事への考え" value={values.public_work_intent} options={PUBLIC_WORK_INTENT_OPTIONS} onChange={setValue} error={fieldErrors.public_work_intent} />
          </div>
        </div>
        <button type="button" disabled={savingProgress} onClick={startShortDiagnosis} className="inline-flex w-full items-center justify-center gap-2 rounded bg-brand-700 px-5 py-4 font-black text-white focus-ring disabled:cursor-wait disabled:bg-slate-500 sm:w-auto">
          {savingProgress ? "準備中です…" : "3分診断へ進む"}
          {!savingProgress ? <ArrowRight className="h-4 w-4" /> : null}
        </button>
      </section>

      <section className={step === 1 ? "space-y-4" : "hidden"} aria-hidden={step !== 1}>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-brand-700" />
            <h1 className="text-xl font-black text-slate-950">3分経営診断</h1>
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-600">今の会社に最も近い回答を選んでください。</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-700">
            <p className="rounded bg-slate-100 px-2 py-2">{completedRequired}／{requiredQuestions.length}問</p>
            <p className="rounded bg-brand-50 px-2 py-2 text-brand-800">進み具合 {progress}％</p>
            <p className="rounded bg-slate-100 px-2 py-2">残り{remaining}問</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded bg-slate-100"><div className="h-full bg-brand-700 transition-all" style={{ width: `${progress}%` }} /></div>
          <p className="mt-3 text-xs font-bold text-slate-500">全{requiredQuestions.length}問{optionalCount > 0 ? `＋公共工事の参考質問${optionalCount}問（任意）` : ""}・所要時間 約3分</p>
        </div>

        {visibleQuestions.map((question) => {
          const index = shortQuestions.findIndex((candidate) => candidate.id === question.id);
          return (
            <fieldset key={question.id} data-diagnosis-field={question.id} aria-invalid={Boolean(fieldErrors[question.id])} className={`rounded-lg border bg-white p-5 shadow-sm ${fieldErrors[question.id] ? "border-red-500 ring-1 ring-red-200" : "border-slate-200"}`}>
              <legend className="text-base font-black leading-7 text-slate-950"><span className="mr-2 text-brand-700">Q{index + 1}</span>{question.question}</legend>
              {question.referenceOnly ? <p className="mt-2 text-xs font-bold text-sky-700">参考質問です。答えなくても結果を表示できます。</p> : null}
              {question.helpText ? <QuestionHelp>{question.helpText}</QuestionHelp> : null}
              <div className="mt-4 grid gap-2">
                {question.options.map((option) => (
                  <label key={option.value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded border px-3 py-3 text-sm font-semibold leading-6 ${values[question.id] === option.value ? "border-brand-600 bg-brand-50 text-brand-950" : "border-slate-200 bg-slate-50 text-slate-800"}`}>
                    <input type="radio" name={`display_${question.id}`} value={option.value} checked={values[question.id] === option.value} onChange={() => setValue(question.id, option.value)} className="h-4 w-4 shrink-0 accent-brand-700" />
                    {option.label}
                  </label>
                ))}
              </div>
              {fieldErrors[question.id] ? <p className="mt-3 text-xs font-bold text-red-700">{fieldErrors[question.id]}</p> : null}
            </fieldset>
          );
        })}

        <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-slate-50/95 py-4 backdrop-blur sm:flex-row">
          <button type="button" onClick={() => { setClientErrors({}); if (safePage > 0) setPage(safePage - 1); else setStep(0); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 focus-ring">
            <ArrowLeft className="h-4 w-4" />{safePage > 0 ? "前の質問" : "5つの項目へ戻る"}
          </button>
          {safePage < pageCount - 1 ? (
            <button type="button" disabled={savingProgress} onClick={savePageAndContinue} className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 font-black text-white focus-ring disabled:cursor-wait disabled:bg-slate-500">
              {savingProgress ? "保存中です…" : "次の質問へ"}<ArrowRight className="h-4 w-4" />
            </button>
          ) : <QuickSubmitButton pending={isPending} />}
        </div>
      </section>
    </form>
  );
}

function ValueSelect<T extends string>({ name, label, value = "", options, onChange, error }: { name: string; label: string; value?: string; options: Array<{ value: T; label: string }>; onChange: (name: string, value: string) => void; error?: string }) {
  return <label data-diagnosis-field={name} className="grid gap-1 text-sm font-bold text-slate-700">{label}<select value={value} onChange={(event) => onChange(name, event.target.value)} aria-invalid={Boolean(error)} className={`rounded border bg-white px-3 py-3 font-normal focus-ring ${error ? "border-red-500" : "border-slate-300"}`}><option value="">選択してください</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{error ? <span className="text-xs font-bold text-red-700">{error}</span> : null}</label>;
}

function StringSelect({ name, label, value = "", options, onChange, error }: { name: string; label: string; value?: string; options: string[]; onChange: (name: string, value: string) => void; error?: string }) {
  return <label data-diagnosis-field={name} className="grid gap-1 text-sm font-bold text-slate-700">{label}<select value={value} onChange={(event) => onChange(name, event.target.value)} aria-invalid={Boolean(error)} className={`rounded border bg-white px-3 py-3 font-normal focus-ring ${error ? "border-red-500" : "border-slate-300"}`}><option value="">選択してください</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>{error ? <span className="text-xs font-bold text-red-700">{error}</span> : null}</label>;
}

function QuickSubmitButton({ pending }: { pending: boolean }) {
  return <button disabled={pending} className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 font-black text-white focus-ring disabled:cursor-wait disabled:bg-slate-500"><ShieldCheck className="h-4 w-4" />{pending ? "送信中です…" : "3分診断の結果を見る"}</button>;
}

function validateQuestions(questions: ShortDiagnosisQuestion[], values: DiagnosisV2StartFormValues) {
  return Object.fromEntries(questions.filter((question) => !question.optional && !question.options.some((option) => option.value === values[question.id])).map((question) => [question.id, "この質問に回答してください"]));
}

async function saveProgress(sessionId: string, step: number, answers: DiagnosisV2StartFormValues, questionId?: string) {
  const response = await fetch("/api/diagnosis/v2-progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "progress", stage: "short", sessionId, step, questionId, answers }) });
  if (response.ok) return;
  const result = await response.json().catch(() => ({})) as { error?: string };
  throw new Error(result.error || "途中の回答を保存できませんでした。入力内容はこの画面に残っています。もう一度押してください。");
}

function readStoredValues() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY);
    if (!stored) return { values: {}, definitionUpdated: false };
    const normalized = normalizeStoredDiagnosisV2StartValues(JSON.parse(stored) as unknown);
    if (localStorage.getItem(STORAGE_KEY)) localStorage.removeItem(STORAGE_KEY);
    return normalized;
  } catch {
    return { values: {}, definitionUpdated: false };
  }
}
function readStoredNumber(key: string, maximum: number) {
  try { const value = Number(sessionStorage.getItem(key)); return Number.isInteger(value) && value >= 0 && value <= maximum ? value : 0; } catch { return 0; }
}
function readStorage(key: string) { try { return sessionStorage.getItem(key) ?? ""; } catch { return ""; } }
function writeStorage(key: string, value: string) { try { sessionStorage.setItem(key, value); } catch { /* The form still works when storage is blocked. */ } }
function removeStorage(key: string) { try { sessionStorage.removeItem(key); } catch { /* The form still works when storage is blocked. */ } }
function omitKey(values: Record<string, string>, key: string) { if (!values[key]) return values; const next = { ...values }; delete next[key]; return next; }
function scrollToError(errors: Record<string, string>) { const first = Object.keys(errors)[0]; window.requestAnimationFrame(() => { const target = Array.from(document.querySelectorAll<HTMLElement>("[data-diagnosis-field]")).find((element) => element.dataset.diagnosisField === first); target?.scrollIntoView({ behavior: "smooth", block: "center" }); target?.querySelector<HTMLElement>("input, select, button")?.focus({ preventScroll: true }); }); }
function showQuestionError(errors: Record<string, string>, questions: ShortDiagnosisQuestion[], setPage: (page: number) => void) { const index = questions.findIndex((question) => errors[question.id]); if (index >= 0) setPage(Math.floor(index / QUESTIONS_PER_PAGE)); window.setTimeout(() => scrollToError(errors), 0); }
