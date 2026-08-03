"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveGrowthStrategyResultAction, type StrategyActionState } from "@/app/diagnosis/strategy-actions";
import { ArrowLeft, CalendarCheck, Printer, Save } from "lucide-react";

const INITIAL: StrategyActionState = { fieldErrors: {} };
type Mode = "save" | "consultation";

export function DiagnosisV23ResultActions({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState(saveGrowthStrategyResultAction, INITIAL);
  const [mode, setMode] = useState<Mode | null>(null);
  return (
    <section className="rounded-lg border border-brand-200 bg-white p-5 shadow-sm print:hidden">
      <h2 className="text-xl font-black text-slate-950">この後の進め方を選べます</h2>
      <p className="mt-2 text-sm leading-7 text-slate-700">概要を見るだけなら会社情報は不要です。保存・印刷または個別相談を利用する場合だけ入力してください。</p>
      {!mode ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => setMode("save")} className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 font-black text-white"><Printer className="h-4 w-4" />保存・印刷する</button>
          <button type="button" onClick={() => setMode("consultation")} className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-5 py-3 font-black text-slate-800"><CalendarCheck className="h-4 w-4" />30分の個別相談を申し込む</button>
          <Link href="/construction-sales-diagnosis" className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 sm:col-span-2">概要だけ確認して終了する</Link>
        </div>
      ) : (
        <form action={action} className="mt-5 rounded border border-slate-200 bg-slate-50 p-4">
          <input type="hidden" name="session_id" value={sessionId} />
          <input type="hidden" name="intent" value={mode} />
          <button type="button" onClick={() => setMode(null)} disabled={pending} className="inline-flex items-center gap-2 text-sm font-black text-brand-800"><ArrowLeft className="h-4 w-4" />戻る</button>
          <h3 className="mt-4 text-lg font-black text-slate-950">{mode === "save" ? "再成長戦略を保存・印刷する" : "30分の個別相談を申し込む"}</h3>
          {state.formError ? <p role="alert" className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800">{state.formError}</p> : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field name="company_name" label="会社名（必須）" error={state.fieldErrors?.company_name} />
            <Field name="email" label="メールアドレス（必須）" type="email" error={state.fieldErrors?.email} />
            <Field name="contact_name" label={mode === "consultation" ? "氏名（必須）" : "回答者名（任意）"} error={state.fieldErrors?.contact_name} />
            {mode === "consultation" ? <Field name="phone" label="電話番号（必須）" type="tel" error={state.fieldErrors?.phone} /> : null}
            {mode === "consultation" ? <Field name="preferred_meeting_dates" label="希望日時（必須）" type="datetime-local" error={state.fieldErrors?.preferred_meeting_dates} /> : null}
          </div>
          {mode === "consultation" ? <label className="mt-4 grid gap-1 text-sm font-bold text-slate-700">相談内容（必須）<textarea name="consultation_topic" rows={4} className="rounded border border-slate-300 bg-white px-3 py-2 font-normal" />{state.fieldErrors?.consultation_topic ? <span className="text-xs text-red-700">{state.fieldErrors.consultation_topic}</span> : null}</label> : null}
          <label className={`mt-4 flex items-start gap-3 rounded border bg-white p-4 text-sm font-semibold ${state.fieldErrors?.privacy_consent ? "border-red-500" : "border-slate-200"}`}><input type="checkbox" name="privacy_consent" value="agreed" className="mt-0.5 h-5 w-5 accent-brand-700" /><span>個人情報の取り扱いに同意します（必須）。<span className="mt-1 block text-xs font-normal"><Link href="/diagnosis/terms" target="_blank" className="font-bold text-brand-800 underline">利用規約</Link>・<Link href="/diagnosis/privacy" target="_blank" className="font-bold text-brand-800 underline">プライバシーポリシー</Link></span>{state.fieldErrors?.privacy_consent ? <span className="mt-1 block text-xs font-bold text-red-700">{state.fieldErrors.privacy_consent}</span> : null}</span></label>
          <button disabled={pending} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 font-black text-white disabled:bg-slate-400 sm:w-auto">{pending ? "保存中です…" : mode === "save" ? "保存して印刷画面へ進む" : "個別相談を申し込む"}<Save className="h-4 w-4" /></button>
        </form>
      )}
    </section>
  );
}

function Field({ name, label, type = "text", error }: { name: string; label: string; type?: string; error?: string }) {
  return <label className="grid gap-1 text-sm font-bold text-slate-700">{label}<input name={name} type={type} className={`rounded border bg-white px-3 py-2 font-normal ${error ? "border-red-500" : "border-slate-300"}`} />{error ? <span className="text-xs font-bold text-red-700">{error}</span> : null}</label>;
}
