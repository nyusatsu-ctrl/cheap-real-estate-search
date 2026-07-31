import Link from "next/link";
import { updateDiagnosisV2AdminAction } from "@/app/admin/diagnoses/actions";
import type { ConstructionManagementDiagnosis } from "@/lib/construction-diagnosis-v2/data";
import {
  DIAGNOSIS_V2_DEAL_STATUS_LABELS,
  DIAGNOSIS_V2_SALES_STATUS_LABELS
} from "@/lib/construction-diagnosis-v2/data";
import {
  CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION,
  DIAGNOSIS_V2_QUESTION_BY_ID,
  DIAGNOSIS_V2_SECTIONS,
  QUICK_DIAGNOSIS_QUESTIONS,
  getApplicableDetailedQuestions,
  getDiagnosisV2OptionLabel,
  getQuickDiagnosisOptionLabel
} from "@/lib/construction-diagnosis-v2/questions";
import {
  getOrderModelLabel,
  getPrimaryTradeLabel,
  getPublicWorkIntentLabel,
  getSpecialtyQuestions,
  getSpecialtyQuestionLabel
} from "@/lib/construction-diagnosis-v2/specialty-questions";
import { formatDiagnosisDate, getLeadSourceLabel } from "@/lib/construction-diagnosis";

export function DiagnosisV2AdminDetail({ diagnosis }: { diagnosis: ConstructionManagementDiagnosis }) {
  const result = diagnosis.diagnosis_result;
  const isV21 = diagnosis.diagnosis_version === CONSTRUCTION_MANAGEMENT_DIAGNOSIS_VERSION;
  const applicableQuestions = getApplicableDetailedQuestions(isV21
    ? { primaryTrade: diagnosis.primary_trade, publicWorkIntent: diagnosis.public_work_intent, includeSpecialty: true }
    : { includeSpecialty: false });
  const specialtyQuestionIds = new Set(isV21 ? getSpecialtyQuestions(diagnosis.primary_trade).map((question) => question.id) : []);
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/diagnoses" className="text-sm font-bold text-brand-700">診断者一覧へ戻る</Link>
          <h1 className="mt-2 text-2xl font-black text-slate-950">{diagnosis.company_name} / {diagnosis.respondent_name}さん</h1>
          <p className="mt-1 text-sm text-slate-600">{formatDiagnosisDate(diagnosis.created_at)}・{diagnosis.diagnosis_version}</p>
        </div>
        {diagnosis.detailed_completed_at ? (
          <Link href={`/diagnosis/results/${diagnosis.id}`} className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">結果ページを表示</Link>
        ) : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <aside className="space-y-5">
          <AdminSection title="基本情報">
            <Info label="会社名" value={diagnosis.company_name} />
            <Info label="回答者" value={diagnosis.respondent_name} />
            <Info label="代表者" value={diagnosis.representative_name ?? "-"} />
            <Info label="都道府県" value={diagnosis.prefecture} />
            <Info label="所在地" value={diagnosis.address ?? "-"} />
            <Info label="電話番号" value={diagnosis.phone} />
            <Info label="メール" value={diagnosis.email} />
            <Info label="ホームページ" value={diagnosis.website_url ?? "-"} />
            <Info label="従業員数" value={diagnosis.employee_range ?? "-"} />
            <Info label="創業年" value={diagnosis.founding_year ? String(diagnosis.founding_year) : "-"} />
            <Info label="主な工事業種" value={diagnosis.main_business ?? "-"} />
            {isV21 ? (
              <>
                <Info label="主な業態" value={getPrimaryTradeLabel(diagnosis.primary_trade)} />
                <Info label="副業種" value={diagnosis.secondary_trades.length > 0 ? diagnosis.secondary_trades.map(getPrimaryTradeLabel).join(" / ") : "-"} />
                <Info label="受注形態" value={diagnosis.order_models.length > 0 ? diagnosis.order_models.map(getOrderModelLabel).join(" / ") : "-"} />
                <Info label="売上構成" value={`元請 ${formatRatio(diagnosis.prime_ratio)} / 下請 ${formatRatio(diagnosis.subcontract_ratio)} / 公共 ${formatRatio(diagnosis.public_ratio)} / 個人客 ${formatRatio(diagnosis.consumer_ratio)}`} />
                <Info label="自社施工比率" value={diagnosis.self_perform_ratio ?? "-"} />
                <Info label="主な工事金額" value={diagnosis.average_project_size ?? "-"} />
                <Info label="公共工事への意向" value={getPublicWorkIntentLabel(diagnosis.public_work_intent)} />
              </>
            ) : null}
            <Info label="年商区分" value={diagnosis.sales_range ?? "-"} />
            <Info label="URL流入元" value={getLeadSourceLabel(diagnosis.lead_source)} />
            <Info label="診断を知ったきっかけ" value={diagnosis.source ?? "-"} />
          </AdminSection>

          <AdminSection title="相談・商談管理">
            <form action={updateDiagnosisV2AdminAction} className="grid gap-4">
              <input type="hidden" name="id" value={diagnosis.id} />
              <SelectField name="sales_status" label="商談状況" value={diagnosis.sales_status} options={DIAGNOSIS_V2_SALES_STATUS_LABELS} />
              <SelectField name="deal_status" label="成約状況" value={diagnosis.deal_status} options={DIAGNOSIS_V2_DEAL_STATUS_LABELS} />
              <DateTimeField name="meeting_at" label="面談予定日" value={diagnosis.meeting_at} />
              <DateTimeField name="next_action_at" label="次回対応日" value={diagnosis.next_action_at} />
              <label className="grid gap-1 text-sm font-bold text-slate-700">
                契約金額
                <input name="deal_amount" type="number" min="0" step="1" defaultValue={diagnosis.deal_amount ?? ""} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
              </label>
              <label className="grid gap-1 text-sm font-bold text-slate-700">
                失注理由
                <textarea name="loss_reason" rows={3} defaultValue={diagnosis.loss_reason ?? ""} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
              </label>
              <label className="grid gap-1 text-sm font-bold text-slate-700">
                面談・管理者メモ
                <textarea name="admin_notes" rows={7} defaultValue={diagnosis.admin_notes ?? ""} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
              </label>
              <button className="rounded bg-brand-700 px-4 py-3 text-sm font-black text-white focus-ring">対応内容を保存</button>
            </form>
          </AdminSection>
        </aside>

        <main className="space-y-5">
          <AdminSection title="診断結果">
            <div className="grid gap-3 sm:grid-cols-3">
              <ScoreBox label="総合点" value={diagnosis.total_score === null ? "-" : `${Number(diagnosis.total_score).toFixed(1)}点`} />
              <ScoreBox label="支援判定" value={diagnosis.judgment ?? "詳細診断未完了"} />
              <ScoreBox label="重大フラグ" value={`${diagnosis.critical_flags.length}件`} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {DIAGNOSIS_V2_SECTIONS.map((section) => (
                <div key={section.id} className="rounded border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold text-slate-700">{section.label}</span>
                    <span className="font-black text-slate-950">{diagnosis.axis_scores[section.id] === undefined ? "-" : `${Number(diagnosis.axis_scores[section.id]).toFixed(1)}点`}</span>
                  </div>
                </div>
              ))}
            </div>
          </AdminSection>

          {result ? (
            <AdminSection title="自動生成された診断結果">
              <ResultBlock title="主な強み" items={result.strengths.map((item) => `${item.label}: ${item.detail}`)} />
              <ResultBlock title="優先課題" items={result.priorities.map((item) => `${item.label}: ${item.detail}`)} />
              <ResultBlock title="公共工事参入の現在地" body={result.publicWorks.summary} items={[result.publicWorks.title, ...result.publicWorks.prerequisites]} />
              <ResultBlock title="推奨アクション" items={[...result.plan90Days.month1, ...result.plan90Days.month2, ...result.plan90Days.month3]} />
              {result.specialty ? (
                <>
                  <ResultBlock title={`業態別重要指標（${result.specialty.score.toFixed(1)}点）`} items={result.specialty.kpis} />
                  <ResultBlock title="業態別の強み" items={result.specialty.strengths} />
                  <ResultBlock title="業態別の優先課題" items={result.specialty.priorities} />
                  <ResultBlock title="業態別90日改善策" items={result.specialty.plan90Days} />
                </>
              ) : null}
            </AdminSection>
          ) : null}

          {isV21 ? (
            <AdminSection title="テストフィードバック">
              <Info label="回答状況" value={diagnosis.feedback_submitted_at ? `回答済み（${formatDiagnosisDate(diagnosis.feedback_submitted_at)}）` : "未回答"} />
              <Info label="質問の分かりやすさ" value={formatFeedbackRating(diagnosis.feedback_clarity)} />
              <Info label="診断結果の正確性" value={formatFeedbackRating(diagnosis.feedback_accuracy)} />
              <Info label="参考度" value={formatFeedbackRating(diagnosis.feedback_usefulness)} />
              <Info label="相談意向" value={formatFeedbackInterest(diagnosis.feedback_consultation_interest)} />
              <Info label="自由入力" value={diagnosis.feedback_comment ?? "-"} />
            </AdminSection>
          ) : null}

          <AdminSection title="個別相談">
            <Info label="相談希望" value={diagnosis.consultation_requested ? "希望あり" : "希望なし"} />
            <Info label="希望日時" value={diagnosis.preferred_meeting_dates.length > 0 ? diagnosis.preferred_meeting_dates.map(formatDateTime).join(" / ") : "-"} />
            <Info label="相談内容" value={diagnosis.consultation_topic ?? "-"} />
            <Info label="電話連絡可能時間" value={diagnosis.consultation_contact_time ?? "-"} />
            <Info label="備考" value={diagnosis.consultation_notes ?? "-"} />
          </AdminSection>

          <AdminSection title="簡易診断回答">
            <div className="divide-y divide-slate-200">
              {QUICK_DIAGNOSIS_QUESTIONS.map((question) => (
                <AnswerRow key={question.id} id={question.id} question={question.question} answer={getQuickDiagnosisOptionLabel(question.id, diagnosis.quick_answers[question.id])} />
              ))}
            </div>
          </AdminSection>

          <AdminSection title="詳細診断回答">
            {DIAGNOSIS_V2_SECTIONS.map((section) => (
              <div key={section.id} className="mt-5 first:mt-0">
                <h3 className="text-base font-black text-slate-950">{section.label}</h3>
                <div className="mt-2 divide-y divide-slate-200">
                  {applicableQuestions.filter((question) => question.section === section.id && !specialtyQuestionIds.has(question.id)).map((question) => (
                    <AnswerRow
                      key={question.id}
                      id={question.id}
                      question={DIAGNOSIS_V2_QUESTION_BY_ID.get(question.id)?.question ?? question.question}
                      answer={getDiagnosisV2OptionLabel(question.id, diagnosis.detailed_answers[question.id])}
                    />
                  ))}
                </div>
              </div>
            ))}
          </AdminSection>

          {isV21 ? (
            <AdminSection title="業態別回答">
              <div className="divide-y divide-slate-200">
                {applicableQuestions.filter((question) => specialtyQuestionIds.has(question.id)).map((question) => (
                  <AnswerRow key={question.id} id={question.id} question={question.question} answer={getSpecialtyQuestionLabel(question.id, diagnosis.specialty_answers[question.id])} />
                ))}
              </div>
            </AdminSection>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function AdminSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-950">{value}</p></div>;
}

function ScoreBox({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 font-black text-slate-950">{value}</p></div>;
}

function SelectField({ name, label, value, options }: { name: string; label: string; value: string; options: Record<string, string> }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      {label}
      <select name={name} defaultValue={value} className="rounded border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-800 focus-ring">
        {Object.entries(options).map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function DateTimeField({ name, label, value }: { name: string; label: string; value: string | null }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-slate-700">
      {label}
      <input type="datetime-local" name={name} defaultValue={toDateTimeLocal(value)} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
    </label>
  );
}

function AnswerRow({ id, question, answer }: { id: string; question: string; answer: string }) {
  return (
    <div className="grid gap-1 py-3 text-sm md:grid-cols-[1fr_280px]">
      <p className="font-bold leading-6 text-slate-700"><span className="mr-2 text-brand-700">{id}</span>{question}</p>
      <p className="font-semibold leading-6 text-slate-950">{answer}</p>
    </div>
  );
}

function ResultBlock({ title, body, items }: { title: string; body?: string; items: string[] }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-black text-slate-950">{title}</h3>
      {body ? <p className="mt-2 text-sm leading-7 text-slate-700">{body}</p> : null}
      <ul className="mt-2 grid gap-2">{items.map((item) => <li key={item} className="text-sm font-semibold leading-6 text-slate-700">・{item}</li>)}</ul>
    </div>
  );
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatDiagnosisDate(value);
}

function formatRatio(value: number | null) {
  return value === null ? "-" : `${Number(value).toLocaleString("ja-JP")}％`;
}

function formatFeedbackRating(value: number | null) {
  return value === null ? "-" : `${value} / 5`;
}

function formatFeedbackInterest(value: string | null) {
  if (value === "yes") return "はい";
  if (value === "neutral") return "どちらともいえない";
  if (value === "no") return "いいえ";
  return "-";
}
