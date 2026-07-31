"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitDiagnosisV2ConsultationAction, type DiagnosisV2FormState } from "@/app/diagnosis/v2-actions";
import { CalendarCheck } from "lucide-react";

const INITIAL_STATE: DiagnosisV2FormState = { fieldErrors: {} };

export function DiagnosisV2ConsultationForm({ diagnosisId }: { diagnosisId: string }) {
  const [state, formAction] = useActionState(submitDiagnosisV2ConsultationAction, INITIAL_STATE);

  if (state.success) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
        <h2 className="text-lg font-black">個別相談のお申込みを受け付けました</h2>
        <p className="mt-2 text-sm font-semibold leading-7">入力済みの会社情報をもとに、株式会社エコループから日程確認のご連絡を行います。</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-lg border border-brand-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="id" value={diagnosisId} />
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-5 w-5 text-brand-700" />
        <h2 className="text-xl font-black text-slate-950">30分の個別相談を申し込む</h2>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-700">会社名・回答者名・連絡先は診断時の入力内容を利用するため、再入力は不要です。</p>
      {state.formError ? <p className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{state.formError}</p> : null}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          第1希望日時
          <input type="datetime-local" name="preferred_meeting_dates" className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
        </label>
        <label className="grid gap-1 text-sm font-bold text-slate-700">
          第2希望日時（任意）
          <input type="datetime-local" name="preferred_meeting_dates" className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
        </label>
      </div>
      {state.fieldErrors?.preferred_meeting_dates ? <p className="mt-2 text-xs font-bold text-red-700">{state.fieldErrors.preferred_meeting_dates}</p> : null}
      <label className="mt-4 grid gap-1 text-sm font-bold text-slate-700">
        相談内容
        <textarea name="consultation_topic" rows={4} placeholder="例: 公共工事に必要な会社の審査と、国の工事へ参加する手順を相談したい" className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
        {state.fieldErrors?.consultation_topic ? <span className="text-xs font-bold text-red-700">{state.fieldErrors.consultation_topic}</span> : null}
      </label>
      <label className="mt-4 grid gap-1 text-sm font-bold text-slate-700">
        電話連絡可能時間
        <input name="consultation_contact_time" placeholder="例: 平日10時～12時" className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
      </label>
      <label className="mt-4 grid gap-1 text-sm font-bold text-slate-700">
        備考（任意）
        <textarea name="consultation_notes" rows={3} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
      </label>
      <ConsultationSubmitButton />
    </form>
  );
}

function ConsultationSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="mt-5 w-full rounded bg-brand-700 px-5 py-3 font-black text-white focus-ring disabled:cursor-wait disabled:bg-slate-500 sm:w-auto">
      {pending ? "送信中..." : "相談を申し込む"}
    </button>
  );
}
