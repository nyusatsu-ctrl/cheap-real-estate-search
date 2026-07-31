import Link from "next/link";
import { DiagnosisV2StartForm } from "@/components/diagnoses/v2/DiagnosisV2StartForm";
import { normalizeLeadSource } from "@/lib/construction-diagnosis";
import { ClipboardList } from "lucide-react";

type DiagnosisSearchParams = Promise<{
  source?: string | string[];
  campaign?: string | string[];
}>;

export default async function DiagnosisFormPage({ searchParams }: { searchParams: DiagnosisSearchParams }) {
  const params = await searchParams;
  const leadSource = normalizeLeadSource(firstParam(params.source));
  const campaign = firstParam(params.campaign);

  return (
    <div className="bg-slate-50">
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
              <h1 className="mt-3 text-3xl font-black leading-tight text-slate-950 md:text-4xl">建設会社向け 経営診断・再成長戦略</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
                会社のお金、工事で残る利益、これからの仕事、公共工事の準備を、12問または15問で確認します。会社名や連絡先は、結果を保存したい場合だけ入力します。
              </p>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">3分経営診断: 約3分</div>
          </div>
        </div>
      </section>
      <DiagnosisV2StartForm leadSource={leadSource} campaign={campaign} />
    </div>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
