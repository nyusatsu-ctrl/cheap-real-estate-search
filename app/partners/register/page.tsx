import Link from "next/link";
import { Building2, Check, ShieldCheck } from "lucide-react";
import { submitContractorApplicationAction } from "@/app/partners/actions";
import { ESTIMATE_CATEGORIES } from "@/lib/estimate";

export default async function ContractorRegisterPage({
  searchParams
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <p className="inline-flex items-center gap-2 rounded bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
            <Building2 className="h-4 w-4" />
            提携業者登録
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight text-slate-950 md:text-5xl">
            見積もり依頼を受けたい業者を募集します。
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
            登録は自由ですが、見積もり参加は審査制です。成約時は業務カテゴリごとに定めた手数料を当サイトへお支払いいただく前提です。
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-8 md:grid-cols-[0.9fr_1.1fr]">
        <aside className="grid gap-4 self-start">
          {[
            "業者登録は自由、見積もり参加は審査制",
            "建設業許可、解体工事業登録、保険加入状況を確認",
            "お客様には見積金額と工事概要を表示",
            "成約時に業者から当サイトへ手数料を支払い"
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
              <p className="text-sm font-semibold leading-6 text-slate-800">{item}</p>
            </div>
          ))}
          <Link href="/partners/quotes/new" className="rounded border border-slate-300 bg-white px-4 py-3 text-center font-bold text-slate-800 focus-ring">
            業者用 見積入力デモ
          </Link>
        </aside>

        <form action={submitContractorApplicationAction} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {params.submitted ? (
            <div className="mb-5 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
              登録申請を受け付けました。運営者が内容を確認します。
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="会社名" name="company_name" required />
            <Field label="担当者名" name="contact_name" required />
            <Field label="メールアドレス" name="email" type="email" required />
            <Field label="電話番号" name="phone" required />
            <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">
              対応エリア
              <textarea name="service_areas" rows={3} placeholder="北海道、青森県、熊本県 など" className="rounded border border-slate-300 px-3 py-2 font-normal text-slate-950 focus-ring" />
            </label>
            <Field label="許可・登録情報" name="license_info" placeholder="建設業許可、解体工事業登録など" className="md:col-span-2" />
            <Field label="保険加入状況" name="insurance_info" placeholder="請負賠償責任保険など" className="md:col-span-2" />
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              希望手数料率
              <select name="requested_commission_rate" defaultValue="10" className="rounded border border-slate-300 bg-white px-3 py-2 font-normal text-slate-950 focus-ring">
                <option value="5">5%</option>
                <option value="10">10%</option>
                <option value="15">15%</option>
              </select>
            </label>
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-bold text-slate-700">対応できる業務</legend>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {ESTIMATE_CATEGORIES.map((category) => (
                <label key={category.id} className="flex gap-3 rounded border border-slate-200 p-3 text-sm">
                  <input type="checkbox" name="service_categories" value={category.id} className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700" />
                  <span>
                    <span className="block font-bold text-slate-950">{category.label}</span>
                    <span className="mt-1 block leading-5 text-slate-600">{category.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-5 grid gap-1 text-sm font-semibold text-slate-700">
            備考
            <textarea name="message" rows={4} className="rounded border border-slate-300 px-3 py-2 font-normal text-slate-950 focus-ring" />
          </label>

          <div className="mt-5 rounded border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            <ShieldCheck className="mr-1 inline h-4 w-4" />
            見積もり参加には運営者審査が必要です。反社チェック、許可登録、保険、手数料条件への同意を確認します。
          </div>

          <div className="mt-6 flex justify-end">
            <button className="rounded bg-brand-700 px-5 py-3 font-bold text-white focus-ring">登録申請する</button>
          </div>
        </form>
      </section>
    </div>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  className?: string;
};

function Field({ label, name, className = "", ...props }: FieldProps) {
  return (
    <label className={`grid gap-1 text-sm font-semibold text-slate-700 ${className}`}>
      {label}
      <input name={name} className="rounded border border-slate-300 px-3 py-2 font-normal text-slate-950 focus-ring" {...props} />
    </label>
  );
}
