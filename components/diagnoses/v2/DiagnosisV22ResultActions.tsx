"use client";

import Link from "next/link";
import { useActionState } from "react";
import { submitDiagnosisV22ResultAction, type DiagnosisV22ResultFormState } from "@/app/diagnosis/v2-actions";
import { ArrowRight, CalendarCheck, Save } from "lucide-react";

const INITIAL_STATE: DiagnosisV22ResultFormState = { fieldErrors: {} };

export function DiagnosisV22ResultActions({ sessionId, alreadySaved }: { sessionId: string; alreadySaved: boolean }) {
  const [state, formAction, pending] = useActionState(submitDiagnosisV22ResultAction, INITIAL_STATE);
  const saved = alreadySaved || Boolean(state.saved);

  if (saved) {
    return (
      <section className="rounded-lg border border-brand-200 bg-white p-5 shadow-sm">
        <p className="font-black text-emerald-800">この結果は保存されています。</p>
        <p className="mt-2 text-sm leading-7 text-slate-700">詳しい診断へ進むと、短縮診断と同じ質問は引き継がれます。</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link href={`/diagnosis/details/${sessionId}`} className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 font-black text-white focus-ring">
            詳しい再成長戦略を見る <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/construction-sales-diagnosis" className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 focus-ring">ここで終了する</Link>
        </div>
      </section>
    );
  }

  return (
    <form action={formAction} className="rounded-lg border border-brand-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="session_id" value={sessionId} />
      <h2 className="text-xl font-black text-slate-950">結果を見た後に選べます</h2>
      <p className="mt-2 text-sm leading-7 text-slate-700">何も選ばず、そのまま終了しても構いません。保存や詳しい診断を希望する場合だけ、会社名とメールアドレスを入力してください。</p>
      {state.formError ? <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800" role="alert">{state.formError}</p> : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field name="company_name" label="会社名" error={state.fieldErrors?.company_name} />
        <Field name="email" label="メールアドレス" type="email" error={state.fieldErrors?.email} />
      </div>
      <label className={`mt-4 flex items-start gap-3 rounded border p-4 text-sm font-semibold leading-6 ${state.fieldErrors?.privacy_consent ? "border-red-500 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
        <input type="checkbox" name="privacy_consent" value="agreed" className="mt-0.5 h-5 w-5 shrink-0 accent-brand-700" />
        <span>個人情報の取扱いに同意します。入力内容は結果の保存、詳しい診断、相談対応に利用します。{state.fieldErrors?.privacy_consent ? <span className="block text-xs font-bold text-red-700">{state.fieldErrors.privacy_consent}</span> : null}</span>
      </label>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button name="intent" value="save" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded border border-brand-700 bg-white px-5 py-3 font-black text-brand-800 focus-ring disabled:opacity-50"><Save className="h-4 w-4" />この結果を保存する</button>
        <button name="intent" value="details" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 font-black text-white focus-ring disabled:opacity-50">詳しい再成長戦略を見る<ArrowRight className="h-4 w-4" /></button>
      </div>
      <p className="mt-2 text-xs font-bold text-slate-500">追加約10分。短縮診断ですでに答えた質問は表示しません。</p>

      <details className="mt-6 rounded border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer font-black text-slate-900">30分の個別相談を申し込む</summary>
        <p className="mt-2 text-sm leading-7 text-slate-600">相談を希望する場合は、連絡に必要な項目を追加で入力してください。</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field name="contact_name" label="氏名" error={state.fieldErrors?.contact_name} />
          <Field name="phone" label="電話番号" type="tel" error={state.fieldErrors?.phone} />
          <Field name="preferred_meeting_dates" label="希望日時" type="datetime-local" error={state.fieldErrors?.preferred_meeting_dates} />
        </div>
        <label className="mt-4 grid gap-1 text-sm font-bold text-slate-700">相談したい内容<textarea name="consultation_topic" rows={4} className={`rounded border px-3 py-2 font-normal focus-ring ${state.fieldErrors?.consultation_topic ? "border-red-500" : "border-slate-300"}`} />{state.fieldErrors?.consultation_topic ? <span className="text-xs text-red-700">{state.fieldErrors.consultation_topic}</span> : null}</label>
        <button name="intent" value="consultation" disabled={pending} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded bg-slate-900 px-5 py-3 font-black text-white focus-ring disabled:opacity-50 sm:w-auto"><CalendarCheck className="h-4 w-4" />個別相談を申し込む</button>
      </details>
      {pending ? <p className="mt-4 text-sm font-bold text-brand-800">送信中です…</p> : null}
    </form>
  );
}

function Field({ name, label, type = "text", error }: { name: string; label: string; type?: string; error?: string }) {
  return <label className="grid gap-1 text-sm font-bold text-slate-700">{label}<input name={name} type={type} className={`rounded border px-3 py-2 font-normal focus-ring ${error ? "border-red-500 bg-red-50" : "border-slate-300"}`} />{error ? <span className="text-xs font-bold text-red-700">{error}</span> : null}</label>;
}
