import Link from "next/link";
import { DiagnosisV2StartForm } from "@/components/diagnoses/v2/DiagnosisV2StartForm";
import { DiagnosisResumeCandidates } from "@/components/diagnoses/v2/DiagnosisResumeCandidates";
import { normalizeLeadSource } from "@/lib/construction-diagnosis";
import { getDiagnosisResumeCandidates } from "@/lib/construction-diagnosis-v2/resume";
import { ClipboardList } from "lucide-react";
import { DiagnosisPageAnalytics } from "@/components/diagnoses/v2/DiagnosisPageAnalytics";
import { DIAGNOSIS_APP_NAME, DIAGNOSIS_OPERATOR } from "@/lib/diagnosis-brand";

type DiagnosisSearchParams = Promise<{
  source?: string | string[];
  campaign?: string | string[];
  resume_error?: string | string[];
}>;

export default async function DiagnosisFormPage({ searchParams }: { searchParams: DiagnosisSearchParams }) {
  const params = await searchParams;
  const leadSource = normalizeLeadSource(firstParam(params.source));
  const campaign = firstParam(params.campaign);
  const resumeError = getResumeErrorMessage(firstParam(params.resume_error));
  const resumeCandidates = await getDiagnosisResumeCandidates();

  return (
    <div className="bg-slate-50">
      <DiagnosisPageAnalytics source={leadSource} />
      <DiagnosisResumeCandidates candidates={resumeCandidates} source={leadSource} />
      {resumeError ? (
        <div className="border-b border-red-200 bg-red-50">
          <p className="mx-auto max-w-5xl px-4 py-4 text-sm font-bold leading-7 text-red-800" role="alert">{resumeError}</p>
        </div>
      ) : null}
      {leadSource === "monitor2026aug" ? (
        <section className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto max-w-5xl px-4 py-4">
            <p className="font-black text-amber-950">建設会社10社限定 無料モニターテスト</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-amber-900">診断結果の分かりやすさや、自社の状況に合っているかをご確認いただくテスト版です。診断後、簡単なご意見をいただけると助かります。</p>
          </div>
        </section>
      ) : null}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Link href="/construction-sales-diagnosis" className="text-sm font-bold text-brand-700">トップへ戻る</Link>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="inline-flex items-center gap-2 rounded bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
                  <ClipboardList className="h-4 w-4" />
                  無料診断
                </p>
                <span className="rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-800">テスト版</span>
              </div>
              <h1 className="mt-3 text-3xl font-black leading-tight text-slate-950 md:text-4xl">{DIAGNOSIS_APP_NAME}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
                会社のお金、工事で残る利益、これからの仕事、公共工事の準備を、12問または15問で確認します。会社名や連絡先は、結果を保存したい場合だけ入力します。
              </p>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">3分経営診断: 約3分</div>
          </div>
        </div>
      </section>
      <DiagnosisV2StartForm leadSource={leadSource} campaign={campaign} />
      <section className="mx-auto max-w-5xl px-4 pb-10">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">{DIAGNOSIS_OPERATOR.companyName}が運営しています</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">代表は建設現場、施工管理、建設会社経営の実務経験を持ち、1級土木施工管理技士等の資格を保有しています。自社の建設会社運営において、建設業許可、経営事項審査、入札参加資格の取得・管理体制を構築してきました。</p>
          <p className="mt-3 rounded border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-6 text-slate-600">全国約2,000か所以上とは、株式会社エコループが、自社の建設会社運営において入札参加資格の取得・管理体制を構築してきた発注機関数の目安です。すべての会社が同じ発注機関へ参加できることや、案件の受注・落札を保証するものではありません。</p>
          <p className="mt-3 text-xs leading-6 text-slate-600">運営者: {DIAGNOSIS_OPERATOR.companyName} / 代表者: {DIAGNOSIS_OPERATOR.representative} / 所在地: {DIAGNOSIS_OPERATOR.address} / 電話: {DIAGNOSIS_OPERATOR.phone}</p>
        </div>
      </section>
    </div>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getResumeErrorMessage(reason: string) {
  if (reason === "expired") return "この再開リンクの有効期限は切れています。管理者へ再発行をご依頼ください。";
  if (reason === "completed") return "この詳しい診断はすでに完了しています。";
  if (reason === "unavailable") return "現在、診断データを確認できません。時間をおいてもう一度お試しください。";
  if (reason === "invalid") return "再開リンクを確認できませんでした。URLが途中で切れていないか確認してください。";
  return "";
}
