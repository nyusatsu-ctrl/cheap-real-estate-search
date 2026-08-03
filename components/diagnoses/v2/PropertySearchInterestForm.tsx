"use client";

import { useActionState, useState } from "react";
import { savePropertySearchInterestAction, type StrategyActionState } from "@/app/diagnosis/strategy-actions";

const INITIAL: StrategyActionState = { fieldErrors: {} };
const TOPICS = ["安い建物や土地", "解体工事につながる物件", "リフォーム工事につながる物件", "事務所や資材置場", "投資用物件", "空き家", "その他"];

export function PropertySearchInterestForm({ sessionId, companyName = "", email = "" }: { sessionId: string; companyName?: string; email?: string }) {
  const [state, action, pending] = useActionState(savePropertySearchInterestAction, INITIAL);
  const [interest, setInterest] = useState("");
  if (state.saved) return <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5"><h2 className="font-black text-emerald-950">希望を保存しました</h2><p className="mt-2 text-sm text-emerald-900">サービスの準備が整った段階でご案内します。</p></section>;
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:hidden">
      <h2 className="text-xl font-black text-slate-950">建設会社にも活用できる格安・ゼロ円物件情報サービスを開発中です</h2>
      <p className="mt-3 text-sm leading-7 text-slate-700">全国の格安物件や、条件によってはゼロ円に近い物件・ゼロ円物件情報も探せるサービスを開発しています。事務所、資材置場、購入後の解体・改修、投資物件、空き家活用などの情報収集に利用できる予定です。</p>
      <form action={action} className="mt-5">
        <input type="hidden" name="session_id" value={sessionId} />
        <fieldset><legend className="text-sm font-black text-slate-950">格安物件やゼロ円物件情報の案内を希望しますか。</legend><div className="mt-3 grid gap-2">
          {[{ value: "notify", label: "完成したら案内が欲しい" }, { value: "details", label: "詳しい内容だけ知りたい" }, { value: "not_interested", label: "今は興味がない" }].map((option) => <label key={option.value} className="flex items-center gap-3 rounded border border-slate-200 p-3 text-sm font-bold"><input type="radio" name="property_search_interest" value={option.value} checked={interest === option.value} onChange={() => setInterest(option.value)} className="h-5 w-5 accent-brand-700" />{option.label}</label>)}
        </div></fieldset>
        {interest && interest !== "not_interested" ? <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4"><div className="grid gap-4 sm:grid-cols-2"><Field name="company_name" label="会社名" defaultValue={companyName} error={state.fieldErrors?.company_name} /><Field name="email" type="email" label="メールアドレス" defaultValue={email} error={state.fieldErrors?.email} /></div><fieldset className="mt-4"><legend className="text-sm font-black text-slate-950">不動産サービスで知りたいこと</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{TOPICS.map((topic) => <label key={topic} className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="property_search_interest_topics" value={topic} className="h-4 w-4 accent-brand-700" />{topic}</label>)}</div>{state.fieldErrors?.property_search_interest_topics ? <p className="mt-2 text-xs font-bold text-red-700">{state.fieldErrors.property_search_interest_topics}</p> : null}</fieldset></div> : null}
        {state.formError ? <p role="alert" className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800">{state.formError}</p> : null}
        <button disabled={!interest || pending} className="mt-4 rounded bg-slate-900 px-5 py-3 text-sm font-black text-white disabled:bg-slate-400">{pending ? "保存中です…" : "希望を保存する"}</button>
      </form>
    </section>
  );
}

function Field({ name, label, type = "text", defaultValue, error }: { name: string; label: string; type?: string; defaultValue: string; error?: string }) {
  return <label className="grid gap-1 text-sm font-bold text-slate-700">{label}<input name={name} type={type} defaultValue={defaultValue} className={`rounded border bg-white px-3 py-2 font-normal ${error ? "border-red-500" : "border-slate-300"}`} />{error ? <span className="text-xs text-red-700">{error}</span> : null}</label>;
}
