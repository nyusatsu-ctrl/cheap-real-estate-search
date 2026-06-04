import { ESTIMATE_CATEGORIES } from "@/lib/estimate";
import { submitEstimateRequestAction } from "@/app/estimate/actions";

type Props = {
  propertyTitle?: string;
  propertyUrl?: string;
};

export function EstimateForm({ propertyTitle = "", propertyUrl = "" }: Props) {
  return (
    <form action={submitEstimateRequestAction} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">
          対象物件
          <input
            name="property_title"
            defaultValue={propertyTitle}
            placeholder="物件名または所在地"
            className="rounded border border-slate-300 px-3 py-2 font-normal text-slate-950 focus-ring"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">
          物件URL
          <input
            name="property_url"
            defaultValue={propertyUrl}
            placeholder="https://..."
            className="rounded border border-slate-300 px-3 py-2 font-normal text-slate-950 focus-ring"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          お名前
          <input name="name" required placeholder="山田 太郎" className="rounded border border-slate-300 px-3 py-2 font-normal text-slate-950 focus-ring" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          メールアドレス
          <input name="email" type="email" required placeholder="mail@example.com" className="rounded border border-slate-300 px-3 py-2 font-normal text-slate-950 focus-ring" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          電話番号
          <input name="phone" placeholder="090-0000-0000" className="rounded border border-slate-300 px-3 py-2 font-normal text-slate-950 focus-ring" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          希望時期
          <select name="timeline" className="rounded border border-slate-300 bg-white px-3 py-2 font-normal text-slate-950 focus-ring">
            <option value="">未定</option>
            <option value="before_purchase">購入前に概算を知りたい</option>
            <option value="within_1_month">1か月以内</option>
            <option value="within_3_months">3か月以内</option>
            <option value="after_purchase">購入後に相談したい</option>
          </select>
        </label>
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-bold text-slate-700">相談したい内容</legend>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {ESTIMATE_CATEGORIES.map((category) => (
            <label key={category.id} className="flex gap-3 rounded border border-slate-200 p-3 text-sm">
              <input type="checkbox" name="categories" value={category.id} className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700" />
              <span>
                <span className="block font-bold text-slate-950">{category.label}</span>
                <span className="mt-1 block leading-5 text-slate-600">{category.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-5 grid gap-1 text-sm font-semibold text-slate-700">
        相談内容・現地状況
        <textarea
          name="message"
          rows={5}
          placeholder="例: 購入前に解体費と登記費用の概算を知りたい。残置物あり。前面道路が狭い可能性あり。"
          className="rounded border border-slate-300 px-3 py-2 font-normal text-slate-950 focus-ring"
        />
      </label>

      <div className="mt-5 rounded border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
        Supabase 接続時は依頼内容を保存します。未接続のローカルプレビューでは送信完了画面だけ確認できます。
      </div>

      <div className="mt-6 flex justify-end">
        <button className="rounded bg-brand-700 px-5 py-3 font-bold text-white focus-ring">
          見積もり相談を送信
        </button>
      </div>
    </form>
  );
}
