"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitDiagnosisV22ResultAction, type DiagnosisV22ResultFormState } from "@/app/diagnosis/v2-actions";
import { ArrowLeft, ArrowRight, CalendarCheck, Clock3, Save } from "lucide-react";

const INITIAL_STATE: DiagnosisV22ResultFormState = { fieldErrors: {} };
type ActionMode = "save" | "details" | "consultation";
type ContactDraft = {
  company_name: string;
  email: string;
  contact_name: string;
  phone: string;
  preferred_meeting_dates: string;
  consultation_topic: string;
  privacy_consent: boolean;
};

const INITIAL_DRAFT: ContactDraft = {
  company_name: "",
  email: "",
  contact_name: "",
  phone: "",
  preferred_meeting_dates: "",
  consultation_topic: "",
  privacy_consent: false
};

export function DiagnosisV22ResultActions({
  sessionId,
  alreadySaved,
  additionalQuestionCount
}: {
  sessionId: string;
  alreadySaved: boolean;
  additionalQuestionCount: number;
}) {
  const [state, formAction, pending] = useActionState(submitDiagnosisV22ResultAction, INITIAL_STATE);
  const [mode, setMode] = useState<ActionMode | null>(null);
  const [draft, setDraft] = useState<ContactDraft>(INITIAL_DRAFT);
  const saved = alreadySaved || Boolean(state.saved);
  const setDraftValue = (name: keyof ContactDraft, value: string | boolean) => {
    setDraft((current) => ({ ...current, [name]: value }));
  };

  if (saved) {
    return (
      <section className="rounded-lg border border-brand-200 bg-white p-5 shadow-sm">
        <p className="font-black text-emerald-800">この結果は保存されています。</p>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          追加{additionalQuestionCount}問に答えると、詳しい再成長戦略を確認できます。3分診断と同じ質問は表示しません。
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link href={`/diagnosis/details/${sessionId}`} className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 font-black text-white focus-ring">
            追加質問に答えて、詳しい再成長戦略を見る <ArrowRight className="h-4 w-4 shrink-0" />
          </Link>
          <Link href="/construction-sales-diagnosis" className="inline-flex items-center justify-center rounded border border-slate-300 bg-white px-5 py-3 font-bold text-slate-800 focus-ring">ここで終了する</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-brand-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">結果を見た後に選べます</h2>
      <p className="mt-2 text-sm leading-7 text-slate-700">
        詳細診断へ進まず、この3分診断結果だけを確認して終了できます。会社情報の入力は必須ではありません。
      </p>

      {!mode ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg border border-brand-200 bg-brand-50 p-5">
            <h3 className="text-lg font-black leading-7 text-slate-950">追加質問に答えて、詳しい再成長戦略を見る</h3>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-700">会社名とメールアドレスを入力後、追加質問へ進みます。</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
              <span className="rounded bg-white px-3 py-2 text-brand-900">追加{additionalQuestionCount}問</span>
              <span className="inline-flex items-center gap-1 rounded bg-white px-3 py-2 text-brand-900"><Clock3 className="h-3.5 w-3.5" />目安時間：約10分</span>
            </div>
            <p className="mt-3 text-xs font-bold leading-6 text-slate-600">3分診断で回答した内容は引き継がれます。同じ質問への再回答はありません。</p>
            <button type="button" onClick={() => setMode("details")} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 font-black text-white focus-ring sm:w-auto">
              追加質問に答えて、詳しい再成長戦略を見る <ArrowRight className="h-4 w-4 shrink-0" />
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setMode("save")} className="inline-flex items-center justify-center gap-2 rounded border border-brand-700 bg-white px-5 py-3 font-black text-brand-800 focus-ring"><Save className="h-4 w-4" />この結果を保存する</button>
            <button type="button" onClick={() => setMode("consultation")} className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-5 py-3 font-black text-slate-800 focus-ring"><CalendarCheck className="h-4 w-4" />30分の個別相談を申し込む</button>
          </div>
        </div>
      ) : (
        <form action={formAction} className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-5">
          <input type="hidden" name="session_id" value={sessionId} />
          <input type="hidden" name="intent" value={mode} />
          <button type="button" onClick={() => setMode(null)} disabled={pending} className="inline-flex items-center gap-2 text-sm font-black text-brand-800 focus-ring disabled:opacity-50">
            <ArrowLeft className="h-4 w-4" />3分診断結果へ戻る
          </button>

          <h3 className="mt-4 text-xl font-black text-slate-950">
            {mode === "details" ? "詳しい再成長戦略を作成します" : mode === "consultation" ? "個別相談を申し込む" : "3分診断結果を保存する"}
          </h3>
          {mode === "details" ? (
            <>
              <div className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-slate-700 sm:grid-cols-2">
                {["会社の強み", "利益が残りにくい原因", "人員や組織の問題", "業種別に毎月確認すべき数字", "公共工事への参加準備", "今後90日間の行動計画"].map((item) => <p key={item} className="rounded bg-white px-3 py-2">・{item}</p>)}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-brand-900">
                <span className="rounded bg-brand-50 px-3 py-2">追加{additionalQuestionCount}問</span>
                <span className="rounded bg-brand-50 px-3 py-2">目安時間：約10分</span>
                <span className="rounded bg-brand-50 px-3 py-2">途中保存可能</span>
                <span className="rounded bg-brand-50 px-3 py-2">3分診断の回答は引継ぎ済み</span>
              </div>
            </>
          ) : null}
          <p className="mt-4 text-sm leading-7 text-slate-700">
            会社名、メールアドレス、診断回答は、診断結果の保存、途中からの再開、診断内容の確認、相談対応のために使用します。
          </p>

          {state.formError ? <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800" role="alert">{state.formError}</p> : null}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field name="company_name" label="会社名（必須）" value={draft.company_name} onChange={setDraftValue} error={state.fieldErrors?.company_name} />
            <Field name="email" label="メールアドレス（必須）" type="email" value={draft.email} onChange={setDraftValue} error={state.fieldErrors?.email} />
            <Field name="contact_name" label={mode === "consultation" ? "回答者名（必須）" : "回答者名（任意）"} value={draft.contact_name} onChange={setDraftValue} error={state.fieldErrors?.contact_name} />
            {mode === "consultation" ? <Field name="phone" label="電話番号（必須）" type="tel" value={draft.phone} onChange={setDraftValue} error={state.fieldErrors?.phone} /> : null}
            {mode === "consultation" ? <Field name="preferred_meeting_dates" label="希望日時（必須）" type="datetime-local" value={draft.preferred_meeting_dates} onChange={setDraftValue} error={state.fieldErrors?.preferred_meeting_dates} /> : null}
          </div>
          {mode === "consultation" ? (
            <label className="mt-4 grid gap-1 text-sm font-bold text-slate-700">相談したい内容（必須）<textarea name="consultation_topic" rows={4} value={draft.consultation_topic} onChange={(event) => setDraftValue("consultation_topic", event.target.value)} className={`rounded border px-3 py-2 font-normal focus-ring ${state.fieldErrors?.consultation_topic ? "border-red-500 bg-red-50" : "border-slate-300"}`} />{state.fieldErrors?.consultation_topic ? <span className="text-xs text-red-700">{state.fieldErrors.consultation_topic}</span> : null}</label>
          ) : null}

          <label className={`mt-4 flex items-start gap-3 rounded border bg-white p-4 text-sm font-semibold leading-6 ${state.fieldErrors?.privacy_consent ? "border-red-500" : "border-slate-200"}`}>
            <input type="checkbox" name="privacy_consent" value="agreed" checked={draft.privacy_consent} onChange={(event) => setDraftValue("privacy_consent", event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-brand-700" />
            <span>
              <Link href="/diagnosis/terms" target="_blank" className="font-bold text-brand-800 underline">利用規約</Link>と<Link href="/diagnosis/privacy" target="_blank" className="font-bold text-brand-800 underline">プライバシーポリシー</Link>を確認し、同意します（必須）。
              {state.fieldErrors?.privacy_consent ? <span className="block text-xs font-bold text-red-700">{state.fieldErrors.privacy_consent}</span> : null}
            </span>
          </label>

          <button disabled={pending} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded bg-brand-700 px-5 py-3 font-black text-white focus-ring disabled:cursor-wait disabled:bg-slate-500 sm:w-auto">
            {pending ? "保存中です" : mode === "details" ? "追加質問を始める" : mode === "consultation" ? "個別相談を申し込む" : "この結果を保存する"}
            {!pending ? <ArrowRight className="h-4 w-4" /> : null}
          </button>
          {state.formError ? <p className="mt-3 text-xs font-bold text-red-700">保存できませんでした。入力内容は消えていません。もう一度押してください。</p> : null}
        </form>
      )}
    </section>
  );
}

function Field({
  name,
  label,
  value,
  onChange,
  type = "text",
  error
}: {
  name: keyof ContactDraft;
  label: string;
  value: string;
  onChange: (name: keyof ContactDraft, value: string | boolean) => void;
  type?: string;
  error?: string;
}) {
  return <label className="grid gap-1 text-sm font-bold text-slate-700">{label}<input name={name} type={type} value={value} onChange={(event) => onChange(name, event.target.value)} aria-invalid={Boolean(error)} className={`rounded border px-3 py-2 font-normal focus-ring ${error ? "border-red-500 bg-red-50" : "border-slate-300 bg-white"}`} />{error ? <span className="text-xs font-bold text-red-700">{error}</span> : null}</label>;
}
