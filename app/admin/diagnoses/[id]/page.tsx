import Link from "next/link";
import { notFound } from "next/navigation";
import { updateDiagnosisLeadDetailsAction } from "@/app/admin/diagnoses/actions";
import { getCurrentAdmin } from "@/lib/admin";
import {
  CONSULTATION_LABELS,
  DIAGNOSIS_QUESTIONS,
  DIAGNOSIS_TYPES,
  LEAD_STATUS_OPTIONS,
  formatDiagnosisDate,
  getAnswerLabel,
  getConstructionDiagnosis,
  getLeadSourceLabel,
  getLeadStatusLabel,
  getSeminarInterestLabel,
  getQuestionLabel
} from "@/lib/construction-diagnosis";

export default async function AdminDiagnosisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">管理画面</h1>
          <p className="mt-2 text-slate-700">診断詳細を見るには管理者ログインが必要です。</p>
          <Link href="/admin/login" className="mt-5 inline-block rounded bg-brand-700 px-4 py-2 font-bold text-white focus-ring">
            ログインへ
          </Link>
        </div>
      </div>
    );
  }

  const { id } = await params;
  const diagnosis = await getConstructionDiagnosis(id);
  if (!diagnosis) notFound();

  const main = DIAGNOSIS_TYPES[diagnosis.main_type];
  const sub = DIAGNOSIS_TYPES[diagnosis.sub_type];
  const scoreEntries = Object.entries(diagnosis.scores).sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/diagnoses" className="text-sm font-bold text-brand-700">
            診断者一覧へ戻る
          </Link>
          <h1 className="mt-2 text-2xl font-black text-slate-950">{diagnosis.name}さんの診断詳細</h1>
          <p className="mt-1 text-sm text-slate-600">{formatDiagnosisDate(diagnosis.created_at)}</p>
        </div>
        <Link href={`/diagnosis/results/${diagnosis.id}`} className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 focus-ring">
          結果ページを表示
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">基本情報</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <Info label="氏名" value={diagnosis.name} />
              <Info label="会社名" value={diagnosis.company_name ?? "-"} />
              <Info label="電話番号" value={diagnosis.phone ?? "-"} />
              <Info label="メール" value={diagnosis.email} />
              <Info label="相談意欲" value={CONSULTATION_LABELS[diagnosis.wants_consultation] ?? diagnosis.wants_consultation} />
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">リード情報</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <Info label="流入元" value={getLeadSourceLabel(diagnosis.lead_source)} />
              <Info label="キャンペーン" value={diagnosis.source_campaign ?? "-"} />
              <Info label="説明会意向" value={getSeminarInterestLabel(diagnosis.seminar_interest)} />
              <Info label="希望連絡時間" value={diagnosis.preferred_contact_time ?? "-"} />
              <Info label="対応ステータス" value={getLeadStatusLabel(diagnosis.lead_status)} />
              <Info label="最終接触日時" value={formatNullableDiagnosisDate(diagnosis.last_contacted_at)} />
              <Info label="リード更新日時" value={formatNullableDiagnosisDate(diagnosis.lead_updated_at)} />
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">対応管理</h2>
            <form action={updateDiagnosisLeadDetailsAction} className="mt-4 grid gap-4">
              <input type="hidden" name="id" value={diagnosis.id} />
              <label className="grid gap-1 text-sm font-bold text-slate-700">
                対応ステータス
                <select name="lead_status" defaultValue={diagnosis.lead_status} className="rounded border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-800 focus-ring">
                  {LEAD_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-bold text-slate-700">
                最終接触日時
                <input
                  type="datetime-local"
                  name="last_contacted_at"
                  defaultValue={toDateTimeLocalValue(diagnosis.last_contacted_at)}
                  className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring"
                />
              </label>
              <label className="grid gap-1 text-sm font-bold text-slate-700">
                管理者メモ
                <textarea
                  name="admin_memo"
                  defaultValue={diagnosis.admin_memo ?? ""}
                  rows={6}
                  className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring"
                />
              </label>
              <button className="rounded bg-brand-700 px-4 py-3 text-sm font-black text-white focus-ring">
                保存
              </button>
              <p className="text-xs font-semibold text-slate-500">
                メモ更新日時: {formatNullableDiagnosisDate(diagnosis.admin_memo_updated_at)}
              </p>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">診断タイプ</h2>
            <div className="mt-4 grid gap-3">
              <TypeBox label="メイン" value={`${main.code}. ${main.name}`} />
              <TypeBox label="サブ課題" value={`${sub.code}. ${sub.name}`} />
            </div>
            <div className="mt-4 grid gap-2">
              {scoreEntries.map(([type, score]) => (
                <div key={type} className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-bold text-slate-700">{DIAGNOSIS_TYPES[type as keyof typeof DIAGNOSIS_TYPES].name}</span>
                  <span className="font-black text-slate-950">{score}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">回答内容</h2>
          <div className="mt-4 divide-y divide-slate-200">
            {DIAGNOSIS_QUESTIONS.map((question) => (
              <div key={question.key} className="grid gap-1 py-3 text-sm md:grid-cols-[260px_1fr]">
                <p className="font-bold text-slate-600">{getQuestionLabel(question.key)}</p>
                <p className="font-semibold text-slate-950">{getAnswerLabel(question.key, diagnosis.answers[question.key] ?? "")}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function formatNullableDiagnosisDate(value: string | null | undefined) {
  return value ? formatDiagnosisDate(value) : "-";
}

function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function TypeBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-black text-slate-950">{value}</p>
    </div>
  );
}
