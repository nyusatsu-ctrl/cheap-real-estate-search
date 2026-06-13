import Link from "next/link";
import { PREFECTURES, PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { requireActiveMember } from "@/lib/user";

export default async function NotificationsPage() {
  await requireActiveMember();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-black text-slate-950">新着物件の通知設定</h1>
      <p className="mt-1 text-sm text-slate-600">
        0円物件や300万円以下の格安不動産を、エリアや物件種別ごとに確認しやすくするための通知条件です。
      </p>

      <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <Select name="prefecture" label="都道府県" options={[["", "全国"], ...PREFECTURES.map((name) => [name, name])]} />
          <Select name="property_type" label="物件種別" options={[["", "すべて"], ...Object.entries(PROPERTY_TYPE_LABELS)]} />
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            キーワード
            <input placeholder="空き家、古家付き土地、山林など" className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
          </label>
          <Select name="price" label="価格帯" options={[["0", "0円物件"], ["3000000", "300万円以下"]]} />
        </div>
        <div className="mt-5 rounded border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          メール通知やLINE通知は本番運用時に接続します。現在は条件を決めるための画面です。
        </div>
        <Link href="/properties?maxPrice=3000000" className="mt-5 inline-block rounded bg-brand-700 px-5 py-3 font-bold text-white focus-ring">
          条件に近い物件を見る
        </Link>
      </div>
    </div>
  );
}

function Select({ name, label, options }: { name: string; label: string; options: string[][] }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <select name={name} className="rounded border border-slate-300 bg-white px-3 py-2 font-normal focus-ring">
        {options.map(([value, labelText]) => (
          <option key={value} value={value}>{labelText}</option>
        ))}
      </select>
    </label>
  );
}
