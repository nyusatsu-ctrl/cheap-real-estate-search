import { ScrivenerApplicationForm } from "@/components/ScrivenerApplicationForm";

export default async function ScrivenerPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-sm font-bold text-brand-700">提携行政書士による申請サポート</p>
      <h1 className="mt-2 text-3xl font-black text-slate-950">エリア検索の取得代行依頼</h1>
      <p className="mt-4 max-w-3xl text-base leading-8 text-slate-700">
        物品・役務物件に参加するためのエリア検索について、提携行政書士へ取得代行を依頼できます。個人事業主（個人）と法人で必要情報・添付書類が異なります。
      </p>
      {params.sent ? <p className="mt-5 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">取得代行依頼を送信しました。</p> : null}

      <section className="mt-6 grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-5">
          <p className="text-sm font-bold text-brand-700">取得代行プラン</p>
          <p className="mt-3 text-sm font-bold text-slate-500 line-through">通常 88,000円</p>
          <p className="mt-1 text-4xl font-black text-slate-950">49,800円</p>
          <p className="mt-3 text-sm leading-7 text-slate-700">申請内容の確認、必要書類の案内、申請手続きの代行依頼受付までをこのフォームで進めます。</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
          行政書士業務は提携行政書士が行います。依頼する場合はユーザーと行政書士の直接契約になります。当社は行政書士業務を行わず、行政書士の報酬、対応範囲、納期、結果を保証しません。申請条件、必要書類、審査内容は必ず公式情報も確認してください。
        </div>
      </section>

      <ScrivenerApplicationForm />
    </div>
  );
}
