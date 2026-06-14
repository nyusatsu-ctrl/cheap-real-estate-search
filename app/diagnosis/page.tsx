import Link from "next/link";
import { DiagnosisForm, type DiagnosisFormQuestion } from "@/components/diagnoses/DiagnosisForm";
import { DIAGNOSIS_QUESTIONS, getSupplementalFieldsForQuestion, normalizeLeadSource } from "@/lib/construction-diagnosis";
import { HardHat } from "lucide-react";

type DiagnosisSearchParams = Promise<{
  source?: string | string[];
  campaign?: string | string[];
}>;

export default async function DiagnosisFormPage({ searchParams }: { searchParams: DiagnosisSearchParams }) {
  const params = await searchParams;
  const rawSource = firstParam(params.source);
  const campaign = firstParam(params.campaign);
  const leadSource = normalizeLeadSource(rawSource);
  const questions: DiagnosisFormQuestion[] = DIAGNOSIS_QUESTIONS.map((question) => ({
    key: question.key,
    label: question.label,
    type: question.type,
    options: question.options?.map((option) => ({
      value: option.value,
      label: option.label
    })),
    supplementalFields: getSupplementalFieldsForQuestion(question.key).map((field) => ({
      key: field.key,
      label: field.label,
      placeholder: field.placeholder,
      triggerValues: field.triggerValues,
      requiredWhenTriggered: field.requiredWhenTriggered
    }))
  }));

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
                現在の受注状況、集客、利益管理、組織体制などを入力すると、売上アップに向けた優先課題と改善タイプを自動判定します。
              </p>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
              入力時間: 約3分
            </div>
          </div>
        </div>
      </section>

      <DiagnosisForm leadSource={leadSource} campaign={campaign} questions={questions} />
    </div>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
