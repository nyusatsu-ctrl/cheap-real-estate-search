import Link from "next/link";
import { submitConstructionDiagnosisAction } from "@/app/diagnosis/actions";
import { DIAGNOSIS_QUESTIONS } from "@/lib/construction-diagnosis";
import { ClipboardCheck, HardHat } from "lucide-react";

export default function DiagnosisFormPage() {
  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Link href="/" className="text-sm font-bold text-brand-700">
            トップへ戻る
          </Link>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
                <HardHat className="h-4 w-4" />
                20項目診断
              </p>
              <h1 className="mt-3 text-3xl font-black leading-tight text-slate-950 md:text-4xl">建設業売上アップ診断</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">
                現在の受注状況、集客、利益管理、組織体制を入力すると、売上アップに向けた優先タイプを自動判定します。
              </p>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
              入力時間: 約3分
            </div>
          </div>
        </div>
      </section>

      <form action={submitConstructionDiagnosisAction} className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-brand-700" />
            <h2 className="text-xl font-black text-slate-950">連絡先</h2>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <TextField name="name" label="氏名" required />
            <TextField name="company_name" label="会社名・屋号" />
            <TextField name="phone" label="電話番号" type="tel" />
            <TextField name="email" label="メールアドレス" type="email" required />
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {DIAGNOSIS_QUESTIONS.map((question, index) => (
            <fieldset key={question.key} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <legend className="text-base font-black text-slate-950">
                <span className="mr-2 text-brand-700">{index + 1}.</span>
                {question.label}
              </legend>
              {question.type === "textarea" ? (
                <textarea
                  name={question.key}
                  required
                  rows={4}
                  className="mt-4 w-full rounded border border-slate-300 px-3 py-2 text-sm focus-ring"
                />
              ) : (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {question.options?.map((option) => (
                    <label key={option.value} className="flex min-h-12 cursor-pointer items-center gap-3 rounded border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-800">
                      <input name={question.key} type="radio" value={option.value} required className="h-4 w-4 accent-brand-700" />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          ))}
        </div>

        <div className="sticky bottom-0 mt-6 border-t border-slate-200 bg-slate-50 py-4">
          <button className="w-full rounded bg-brand-700 px-5 py-4 text-base font-black text-white shadow-soft focus-ring md:w-auto">
            診断結果を見る
          </button>
        </div>
      </form>
    </div>
  );
}

function TextField({ name, label, type = "text", required = false }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring"
      />
    </label>
  );
}
