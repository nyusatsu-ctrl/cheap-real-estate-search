import { Calculator, Hammer, Landmark, PackageOpen, Shovel } from "lucide-react";
import { EstimateForm } from "@/components/estimate/EstimateForm";

export default function EstimatePage({
  searchParams
}: {
  searchParams: Promise<{ propertyTitle?: string; propertyUrl?: string; submitted?: string }>;
}) {
  return (
    <EstimatePageContent searchParams={searchParams} />
  );
}

async function EstimatePageContent({
  searchParams
}: {
  searchParams: Promise<{ propertyTitle?: string; propertyUrl?: string; submitted?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <p className="inline-flex items-center gap-2 rounded bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
            <Calculator className="h-4 w-4" />
            物件購入前後の費用をまとめて相談
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-slate-950 md:text-5xl">
            名義変更、解体、リフォーム、残置物処分、土木工事の見積もり相談
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
            格安物件は購入価格よりも、取得後に必要な工事費や片付け費用、手続き費用が重要です。物件ごとに必要な相談を整理し、運営者や提携先へ見積もり依頼できる導線を作ります。
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-8 md:grid-cols-[0.9fr_1.1fr]">
        <aside className="grid gap-4 self-start">
          {[
            [Landmark, "名義変更・登記", "司法書士などの専門家につなげる相談導線。"],
            [Hammer, "解体・リフォーム", "購入前に概算を取ることで判断ミスを減らします。"],
            [PackageOpen, "残置物片付け・処分", "家具、家電、生活用品、庭まわりの処分費を確認。"],
            [Shovel, "土木・造成", "接道、排水、擁壁、駐車場などの追加費用を確認。"],
          ].map(([Icon, title, text]) => (
            <div key={title as string} className="rounded-lg border border-slate-200 bg-white p-4">
              {/* TypeScript narrows tuple icons poorly in JSX without this local component shape. */}
              <Icon className="h-5 w-5 text-brand-700" />
              <h2 className="mt-3 font-bold text-slate-950">{title as string}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">{text as string}</p>
            </div>
          ))}
        </aside>
        <div>
          {params.submitted ? (
            <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
              見積もり相談を受け付けました。運営者が内容を確認し、対応できる業者へ依頼します。
            </div>
          ) : null}
          <EstimateForm propertyTitle={params.propertyTitle} propertyUrl={params.propertyUrl} />
        </div>
      </section>
    </div>
  );
}
