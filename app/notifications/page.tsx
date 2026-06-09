import Link from "next/link";
import { saveNotificationAction } from "@/app/tenders/actions";
import { PREFECTURES, REGIONS, TENDER_TYPE_LABELS } from "@/lib/constants";
import { canUseMemberFeatures } from "@/lib/tenders";
import { requireMember } from "@/lib/user";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const params = await searchParams;
  const member = await requireMember();

  if (!canUseMemberFeatures(member)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h1 className="text-xl font-black text-amber-950">通知機能は制限されています</h1>
          <p className="mt-2 text-sm leading-6 text-amber-900">無料トライアル終了後は、有料プランへの申し込みが必要です。</p>
          <Link href="/billing?trial=expired" className="mt-5 inline-block rounded bg-brand-700 px-4 py-2 font-bold text-white focus-ring">課金管理へ</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-black text-slate-950">通知設定</h1>
      <p className="mt-1 text-sm text-slate-600">毎日1回、新着案件・締切間近案件をアプリ内通知とメール通知で受け取る条件を登録します。</p>
      {params.saved ? <p className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">通知条件を保存しました。</p> : null}
      <form action={saveNotificationAction} className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <Select name="region" label="地域" options={[["", "指定なし"], ...REGIONS.map((name) => [name, name])]} />
          <Select name="prefecture" label="都道府県" options={[["", "指定なし"], ...PREFECTURES.map((name) => [name, name])]} />
          <Select name="tender_type" label="案件種別" options={[["", "指定なし"], ...Object.entries(TENDER_TYPE_LABELS)]} />
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            キーワード
            <input name="keyword" placeholder="草刈、清掃、車両、備品など" className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
          </label>
          {[
            ["defense_only", "防衛省案件のみ"],
            ["open_counter_only", "オープンカウンターのみ"],
            ["qualification_required_only", "全省庁統一資格必要案件のみ"],
            ["deadline_soon_only", "締切間近案件のみ"],
            ["email_enabled", "メール通知を有効にする"],
            ["app_enabled", "アプリ内通知を有効にする"]
          ].map(([name, label]) => (
            <label key={name} className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
              <input name={name} type="checkbox" defaultChecked={name === "email_enabled" || name === "app_enabled"} />
              {label}
            </label>
          ))}
        </div>
        <button className="mt-5 rounded bg-brand-700 px-5 py-3 font-bold text-white focus-ring">通知条件を保存</button>
      </form>
      <p className="mt-4 text-xs leading-5 text-slate-500">LINE通知は将来追加できるよう、通知条件を独立テーブルで保持します。</p>
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
