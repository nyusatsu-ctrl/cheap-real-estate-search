"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitDiagnosisV2QuickAction, type DiagnosisV2FormState } from "@/app/diagnosis/v2-actions";
import {
  QUICK_DIAGNOSIS_QUESTIONS,
  QUICK_CATEGORY_LABELS
} from "@/lib/construction-diagnosis-v2/questions";
import { ArrowLeft, ArrowRight, Building2, ClipboardCheck, ShieldCheck } from "lucide-react";

type FormValues = Record<string, string>;

const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
];

const EMPLOYEE_OPTIONS = ["1人", "2～5人", "6～10人", "11～30人", "31～50人", "51人以上"];
const SALES_OPTIONS = [
  "3,000万円未満",
  "3,000万円以上1億円未満",
  "1億円以上3億円未満",
  "3億円以上5億円未満",
  "5億円以上10億円未満",
  "10億円以上",
  "回答しない"
];
const SOURCE_OPTIONS = ["テレアポ", "ダイレクトメール", "紹介", "Web広告", "SEO", "YouTube", "その他"];
const INITIAL_STATE: DiagnosisV2FormState = { fieldErrors: {} };
const STORAGE_KEY = "construction-management-diagnosis-v2-start";
const STEP_STORAGE_KEY = "construction-management-diagnosis-v2-start-step";

export function DiagnosisV2StartForm({
  leadSource,
  campaign
}: {
  leadSource: string;
  campaign: string;
}) {
  const [state, formAction] = useActionState(submitDiagnosisV2QuickAction, INITIAL_STATE);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>({});
  const [storageRestored, setStorageRestored] = useState(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const fieldErrors = useMemo(
    () => ({ ...(state.fieldErrors ?? {}), ...clientErrors }),
    [clientErrors, state.fieldErrors]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setValues(readStoredValues(STORAGE_KEY));
      setStep(readStoredStep(STEP_STORAGE_KEY, 1));
      setStorageRestored(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (storageRestored) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  }, [storageRestored, values]);

  useEffect(() => {
    if (storageRestored) sessionStorage.setItem(STEP_STORAGE_KEY, String(step));
  }, [step, storageRestored]);

  const setValue = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setClientErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const goToQuickDiagnosis = () => {
    const errors: Record<string, string> = {};
    for (const field of ["company_name", "respondent_name", "prefecture", "phone", "email"]) {
      if (!values[field]?.trim()) errors[field] = "入力してください";
    }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errors.email = "メールアドレスの形式を確認してください";
    }
    if (values.privacy_consent !== "agreed") errors.privacy_consent = "同意が必要です";
    setClientErrors(errors);
    if (Object.keys(errors).length === 0) {
      setStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const errors: Record<string, string> = {};
    for (const question of QUICK_DIAGNOSIS_QUESTIONS) {
      if (!question.options.some((option) => option.value === values[question.id])) {
        errors[question.id] = "回答を選択してください";
      }
    }
    if (Object.keys(errors).length > 0) {
      event.preventDefault();
      setClientErrors(errors);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <form action={formAction} onSubmit={handleSubmit} className="mx-auto max-w-5xl px-4 py-8">
      <input type="hidden" name="lead_source" value={leadSource} />
      <input type="hidden" name="source_campaign" value={campaign} />

      <div className="mb-6 grid grid-cols-2 gap-2" aria-label="診断の進行状況">
        {["基本情報", "簡易診断10問"].map((label, index) => (
          <div key={label} className={`rounded border px-3 py-3 text-center text-sm font-black ${index === step ? "border-brand-700 bg-brand-50 text-brand-800" : index < step ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-500"}`}>
            {index + 1}. {label}
          </div>
        ))}
      </div>

      {state.formError ? (
        <div className="mb-5 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800" role="alert">
          {state.formError}
        </div>
      ) : null}

      <section className={step === 0 ? "space-y-5" : "hidden"} aria-hidden={step !== 0}>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand-700" />
            <h1 className="text-xl font-black text-slate-950">基本情報</h1>
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-600">診断結果とご連絡に必要な情報を入力してください。年商は区分のみで、正確な金額は不要です。</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <TextInput name="company_name" label="会社名" required value={values.company_name} onChange={setValue} error={fieldErrors.company_name} />
            <TextInput name="respondent_name" label="回答者名" required value={values.respondent_name} onChange={setValue} error={fieldErrors.respondent_name} />
            <TextInput name="representative_name" label="代表者名" value={values.representative_name} onChange={setValue} />
            <SelectInput name="prefecture" label="都道府県" required value={values.prefecture} onChange={setValue} options={PREFECTURES} error={fieldErrors.prefecture} />
            <TextInput name="address" label="所在地" value={values.address} onChange={setValue} />
            <TextInput name="phone" label="電話番号" type="tel" required value={values.phone} onChange={setValue} error={fieldErrors.phone} />
            <TextInput name="email" label="メールアドレス" type="email" required value={values.email} onChange={setValue} error={fieldErrors.email} />
            <TextInput name="website_url" label="ホームページURL" type="url" value={values.website_url} onChange={setValue} placeholder="https://example.jp" />
            <SelectInput name="employee_range" label="従業員数" value={values.employee_range} onChange={setValue} options={EMPLOYEE_OPTIONS} />
            <TextInput name="founding_year" label="創業年" type="number" value={values.founding_year} onChange={setValue} placeholder="例: 2005" />
            <TextInput name="main_business" label="主な工事業種" value={values.main_business} onChange={setValue} placeholder="例: 土木一式、管工事、電気工事" />
            <SelectInput name="sales_range" label="年商区分" value={values.sales_range} onChange={setValue} options={SALES_OPTIONS} />
            <SelectInput name="source" label="診断を知ったきっかけ" value={values.source} onChange={setValue} options={SOURCE_OPTIONS} />
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-5 text-sm font-semibold leading-7 text-slate-700 shadow-sm">
          <input
            type="checkbox"
            name="privacy_consent"
            value="agreed"
            checked={values.privacy_consent === "agreed"}
            onChange={(event) => setValue("privacy_consent", event.target.checked ? "agreed" : "")}
            className="mt-1 h-5 w-5 accent-brand-700"
          />
          <span>
            個人情報の取扱いに同意します。入力内容は診断結果の作成、相談対応、サービス改善のために利用します。
            {fieldErrors.privacy_consent ? <span className="block text-xs font-bold text-red-700">{fieldErrors.privacy_consent}</span> : null}
          </span>
        </label>

        <button type="button" onClick={goToQuickDiagnosis} className="inline-flex w-full items-center justify-center gap-2 rounded bg-brand-700 px-5 py-4 font-black text-white focus-ring sm:w-auto">
          簡易診断へ進む
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <section className={step === 1 ? "space-y-4" : "hidden"} aria-hidden={step !== 1}>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-brand-700" />
            <h1 className="text-xl font-black text-slate-950">簡易診断10問</h1>
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-600">現在の状態に最も近い回答を選んでください。結果は断定ではなく、詳細診断へ進むための整理として表示します。</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.values(QUICK_CATEGORY_LABELS).map((label) => (
              <span key={label} className="rounded bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{label}</span>
            ))}
          </div>
        </div>

        {QUICK_DIAGNOSIS_QUESTIONS.map((question, index) => (
          <fieldset key={question.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <legend className="text-base font-black leading-7 text-slate-950">
              <span className="mr-2 text-brand-700">Q{index + 1}</span>
              {question.question}
            </legend>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {question.options.map((answerOption) => (
                <label key={answerOption.value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded border px-3 py-3 text-sm font-semibold ${values[question.id] === answerOption.value ? "border-brand-600 bg-brand-50 text-brand-950" : "border-slate-200 bg-slate-50 text-slate-800"}`}>
                  <input
                    type="radio"
                    name={question.id}
                    value={answerOption.value}
                    checked={values[question.id] === answerOption.value}
                    onChange={() => setValue(question.id, answerOption.value)}
                    className="h-4 w-4 accent-brand-700"
                  />
                  {answerOption.label}
                </label>
              ))}
            </div>
            {fieldErrors[question.id] ? <p className="mt-3 text-xs font-bold text-red-700">{fieldErrors[question.id]}</p> : null}
          </fieldset>
        ))}

        <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-slate-50/95 py-4 backdrop-blur sm:flex-row">
          <button type="button" onClick={() => setStep(0)} className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 focus-ring">
            <ArrowLeft className="h-4 w-4" />
            基本情報へ戻る
          </button>
          <QuickSubmitButton />
        </div>
      </section>
    </form>
  );
}

function TextInput({
  name,
  label,
  value = "",
  onChange,
  type = "text",
  required = false,
  placeholder,
  error
}: {
  name: string;
  label: string;
  value?: string;
  onChange: (name: string, value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      <span>{label}{required ? <span className="ml-1 text-red-700">必須</span> : <span className="ml-1 text-xs font-normal text-slate-400">任意</span>}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring"
      />
      {error ? <span className="text-xs font-bold text-red-700">{error}</span> : null}
    </label>
  );
}

function SelectInput({
  name,
  label,
  value = "",
  onChange,
  options,
  required = false,
  error
}: {
  name: string;
  label: string;
  value?: string;
  onChange: (name: string, value: string) => void;
  options: string[];
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      <span>{label}{required ? <span className="ml-1 text-red-700">必須</span> : <span className="ml-1 text-xs font-normal text-slate-400">任意</span>}</span>
      <select name={name} value={value} onChange={(event) => onChange(name, event.target.value)} className="rounded border border-slate-300 bg-white px-3 py-2 font-normal focus-ring">
        <option value="">選択してください</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      {error ? <span className="text-xs font-bold text-red-700">{error}</span> : null}
    </label>
  );
}

function QuickSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 font-black text-white focus-ring disabled:cursor-wait disabled:bg-slate-500">
      <ShieldCheck className="h-4 w-4" />
      {pending ? "簡易結果を作成中..." : "簡易診断結果を見る"}
    </button>
  );
}

function readStoredValues(storageKey: string): FormValues {
  if (typeof window === "undefined") return {};
  try {
    const stored = sessionStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) as FormValues : {};
  } catch {
    sessionStorage.removeItem(storageKey);
    return {};
  }
}

function readStoredStep(storageKey: string, maximum: number) {
  if (typeof window === "undefined") return 0;
  const value = Number(sessionStorage.getItem(storageKey));
  return Number.isInteger(value) && value >= 0 && value <= maximum ? value : 0;
}
