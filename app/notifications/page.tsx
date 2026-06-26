import Link from "next/link";
import type { Metadata } from "next";
import { Bell, Check, Pencil, Plus, Trash2 } from "lucide-react";
import {
  deleteTenderNotificationEventAction,
  deleteTenderNotificationRuleAction,
  markAllTenderNotificationsReadAction,
  markTenderNotificationReadAction,
  saveTenderNotificationRuleAction,
  toggleTenderNotificationRuleAction
} from "@/app/notifications/actions";
import { PREFECTURES, REGIONS, TENDER_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import {
  getNotificationRulePreviewCounts,
  getTenderNotificationEvents,
  getTenderNotificationRules,
  notificationDeadlineLabel
} from "@/lib/tender-notifications";
import { requireUsableTenderMember } from "@/lib/tender-access";
import { tenderMetadata } from "@/lib/tender-metadata";
import type { TenderNotificationRule } from "@/lib/types";

type SearchParams = {
  unread?: string;
  ruleId?: string;
  saved?: string;
  deleted?: string;
  error?: string;
};

export const metadata: Metadata = tenderMetadata(
  "案件通知｜官公庁案件サーチ",
  "官公庁案件サーチの通知条件と新着案件通知を管理します。"
);

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const access = await requireUsableTenderMember();
  const params = await searchParams;
  const unreadOnly = params.unread === "1";
  const selectedRuleId = params.ruleId || undefined;
  const [rulesResult, eventsResult] = await Promise.all([
    getTenderNotificationRules(access.userId),
    getTenderNotificationEvents(access.userId, { unreadOnly, ruleId: selectedRuleId })
  ]);
  const previewCounts = await getNotificationRulePreviewCounts(rulesResult.data);
  const unreadCount = eventsResult.data.filter((event) => !event.is_read).length;
  const setupError = rulesResult.error || eventsResult.error;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-950">案件通知</h1>
          <p className="mt-1 text-sm text-slate-600">希望条件を登録し、新たに公開された該当案件をアプリ内通知で確認します。</p>
        </div>
        <Link href="/tenders" className="rounded border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700 focus-ring">
          案件を探す
        </Link>
      </div>

      {params.saved ? <Notice tone="success" message="通知条件を保存しました。" /> : null}
      {params.deleted ? <Notice tone="success" message="通知条件を削除しました。" /> : null}
      {params.error ? <Notice tone="danger" message={`処理できませんでした: ${decodeURIComponent(params.error)}`} /> : null}
      {setupError ? (
        <Notice
          tone="danger"
          message={`通知DBの拡張が未適用、または接続に問題があります。Supabase SQL migration を適用してください。詳細: ${setupError}`}
        />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="font-black text-slate-950">新着通知</h2>
              <p className="mt-1 text-xs text-slate-500">未読 {unreadCount}件 / 表示 {eventsResult.data.length}件</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/notifications?unread=1" className={`rounded border px-3 py-2 text-xs font-bold focus-ring ${unreadOnly ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-700"}`}>
                未読のみ
              </Link>
              <Link href="/notifications" className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus-ring">
                すべて
              </Link>
              <form action={markAllTenderNotificationsReadAction}>
                <button className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus-ring">
                  すべて既読
                </button>
              </form>
            </div>
          </div>
          <div className="divide-y divide-slate-200">
            {eventsResult.data.length ? (
              eventsResult.data.map((event) => (
                <article key={event.id} className={`p-4 ${event.is_read ? "bg-white" : "bg-brand-50/50"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-bold ${event.is_read ? "bg-slate-100 text-slate-600" : "bg-brand-700 text-white"}`}>
                          {event.is_read ? "既読" : "未読"}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                          {event.tender_notifications?.name ?? "通知条件"}
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-black leading-6 text-slate-950">
                        {event.tenders ? (
                          <Link href={`/tenders/${event.tender_id}`} className="hover:text-brand-700">
                            {event.tenders.title}
                          </Link>
                        ) : (
                          "案件情報を取得できません"
                        )}
                      </h3>
                      {event.tenders ? (
                        <p className="mt-1 text-sm leading-6 text-slate-700">
                          {event.tenders.agency_name} / {event.tenders.region} / {event.tenders.prefecture} / {notificationDeadlineLabel(event)}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs leading-5 text-slate-500">{event.match_reason ?? "通知条件に一致しました。"}</p>
                      <p className="mt-1 text-xs text-slate-500">通知作成: {formatDate(event.created_at)}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {!event.is_read ? (
                        <form action={markTenderNotificationReadAction}>
                          <input type="hidden" name="id" value={event.id} />
                          <button className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus-ring">
                            <Check className="h-3.5 w-3.5" />
                            既読
                          </button>
                        </form>
                      ) : null}
                      <form action={deleteTenderNotificationEventAction}>
                        <input type="hidden" name="id" value={event.id} />
                        <button className="inline-flex items-center gap-1 rounded border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 focus-ring">
                          <Trash2 className="h-3.5 w-3.5" />
                          削除
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-slate-600">表示できる通知はありません。</div>
            )}
          </div>
        </section>

        <aside className="grid gap-5">
          <RuleForm />
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-black text-slate-950">通知条件</h2>
            <div className="mt-4 grid gap-3">
              {rulesResult.data.length ? (
                rulesResult.data.map((rule) => (
                  <RuleCard key={rule.id} rule={rule} previewCount={previewCounts.get(rule.id) ?? 0} selected={selectedRuleId === rule.id} />
                ))
              ) : (
                <div className="rounded border border-dashed border-slate-300 p-4 text-sm text-slate-600">通知条件はまだ登録されていません。</div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function RuleForm({ rule }: { rule?: TenderNotificationRule }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="flex items-center gap-2 font-black text-slate-950">
        {rule ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {rule ? "通知条件を編集" : "通知条件を作成"}
      </h2>
      <form action={saveTenderNotificationRuleAction} className="mt-4 grid gap-3">
        {rule ? <input type="hidden" name="id" value={rule.id} /> : null}
        <Field name="name" label="通知条件名" defaultValue={rule?.name ?? ""} placeholder="例: 防衛省の清掃・警備案件" required />
        <Field name="keyword" label="キーワード" defaultValue={rule?.keyword ?? ""} placeholder="清掃 警備 備品など" />
        <Field name="exclude_keyword" label="除外キーワード" defaultValue={rule?.exclude_keyword ?? ""} placeholder="契約条項 様式 結果など" />
        <Field name="agency_name" label="発注機関" defaultValue={rule?.agency_name ?? ""} placeholder="防衛省、国土交通省など" />
        <Select name="region" label="地域" defaultValue={rule?.region ?? ""} options={[["", "指定なし"], ...REGIONS.filter((region) => region !== "全国").map((region) => [region, region])]} />
        <Select name="prefecture" label="都道府県" defaultValue={rule?.prefecture ?? ""} options={[["", "指定なし"], ...PREFECTURES.map((prefecture) => [prefecture, prefecture])]} />
        <Select name="tender_type" label="案件区分" defaultValue={rule?.tender_type ?? ""} options={[["", "すべて"], ...Object.entries(TENDER_TYPE_LABELS)]} />
        <Select
          name="participation_condition"
          label="参加条件"
          defaultValue={rule?.participation_condition ?? ""}
          options={[
            ["", "すべて"],
            ["not_required", "資格不要・オープンカウンター"],
            ["unified_qualification", "全省庁統一資格対象"],
            ["area_specified", "エリア指定"],
            ["other_conditions", "その他条件あり"]
          ]}
        />
        <Field name="min_days_until_deadline" label="締切までの最低残日数" type="number" defaultValue={String(rule?.min_days_until_deadline ?? 0)} min={0} />
        <div className="grid gap-2 rounded border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
          <Checkbox name="defense_only" label="防衛省・自衛隊のみ" defaultChecked={rule?.defense_only ?? false} />
          <Checkbox name="open_counter_only" label="オープンカウンターのみ" defaultChecked={rule?.open_counter_only ?? false} />
          <Checkbox name="qualification_required_only" label="参加条件ありのみ" defaultChecked={rule?.qualification_required_only ?? false} />
          <Checkbox name="deadline_soon_only" label="締切間近のみ" defaultChecked={rule?.deadline_soon_only ?? false} />
          <Checkbox name="include_unknown_deadline" label="期限不明も含める" defaultChecked={rule?.include_unknown_deadline ?? true} />
          <Checkbox name="app_enabled" label="アプリ内通知ON" defaultChecked={rule?.app_enabled ?? true} />
          <Checkbox name="email_enabled" label="メール通知を送信待ちにする（実送信なし）" defaultChecked={rule?.email_enabled ?? false} />
          <Checkbox name="is_active" label="通知ON" defaultChecked={rule?.is_active ?? true} />
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
          <Bell className="h-4 w-4" />
          保存
        </button>
      </form>
    </section>
  );
}

function RuleCard({ rule, previewCount, selected }: { rule: TenderNotificationRule; previewCount: number; selected: boolean }) {
  return (
    <div className={`rounded border p-3 ${selected ? "border-brand-400 bg-brand-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-slate-950">{rule.name}</h3>
          <p className="mt-1 text-xs text-slate-500">現在の該当案件: {previewCount}件</p>
          <p className="mt-1 text-xs text-slate-500">{rule.is_active ? "通知ON" : "通知OFF"} / {rule.app_enabled ? "アプリ内ON" : "アプリ内OFF"} / {rule.email_enabled ? "メール送信待ちON" : "メールOFF"}</p>
        </div>
        <Link href={`/notifications?ruleId=${rule.id}`} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 focus-ring">
          絞込
        </Link>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-600">
        {[rule.keyword, rule.exclude_keyword ? `除外: ${rule.exclude_keyword}` : null, rule.agency_name, rule.region, rule.prefecture, rule.tender_type, rule.defense_only ? "防衛省・自衛隊のみ" : null].filter(Boolean).join(" / ") || "条件指定なし"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <details className="w-full">
          <summary className="cursor-pointer rounded border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">編集・削除</summary>
          <div className="mt-3 grid gap-3">
            <RuleForm rule={rule} />
            <form action={toggleTenderNotificationRuleAction}>
              <input type="hidden" name="id" value={rule.id} />
              <input type="hidden" name="is_active" value={rule.is_active ? "off" : "on"} />
              <button className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus-ring">
                {rule.is_active ? "通知OFFにする" : "通知ONにする"}
              </button>
            </form>
            <form action={deleteTenderNotificationRuleAction} className="rounded border border-rose-200 bg-rose-50 p-3">
              <input type="hidden" name="id" value={rule.id} />
              <label className="grid gap-1 text-xs font-bold text-rose-900">
                削除確認
                <input name="confirm_delete" placeholder="delete と入力" className="rounded border border-rose-200 px-3 py-2 font-normal" />
              </label>
              <button className="mt-2 rounded border border-rose-300 bg-white px-3 py-2 text-xs font-bold text-rose-700 focus-ring">
                通知条件を削除
              </button>
            </form>
          </div>
        </details>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  placeholder,
  type = "text",
  required = false,
  min
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  min?: number;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <input name={name} type={type} min={min} defaultValue={defaultValue} placeholder={placeholder} required={required} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
    </label>
  );
}

function Select({ name, label, defaultValue, options }: { name: string; label: string; defaultValue: string; options: string[][] }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <select name={name} defaultValue={defaultValue} className="rounded border border-slate-300 bg-white px-3 py-2 font-normal focus-ring">
        {options.map(([value, labelText]) => (
          <option key={value} value={value}>{labelText}</option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}

function Notice({ tone, message }: { tone: "success" | "danger"; message: string }) {
  const className = tone === "success"
    ? "mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900"
    : "mb-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-900";
  return <div className={className}>{message}</div>;
}
