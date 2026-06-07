import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Star } from "lucide-react";
import { saveFavoriteTenderAction } from "@/app/tenders/actions";
import { FAVORITE_TENDER_STATUS_LABELS, TENDER_SOURCE_ORGANIZATION_TYPE_LABELS, TENDER_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { canUseMemberFeatures, getPublishedTender } from "@/lib/tenders";
import { getCurrentMember } from "@/lib/user";

export default async function TenderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [member, tender] = await Promise.all([getCurrentMember(), getPublishedTender(id)]);
  if (!tender) notFound();

  const usable = canUseMemberFeatures(member);
  if (member && !usable) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h1 className="text-xl font-black text-amber-950">詳細閲覧には有料プランが必要です</h1>
          <p className="mt-2 text-sm leading-6 text-amber-900">14日間の無料トライアル終了後は、案件詳細・お気に入り・通知機能を制限しています。</p>
          <Link href="/billing?trial=expired" className="mt-5 inline-block rounded bg-brand-700 px-4 py-2 font-bold text-white focus-ring">
            課金管理へ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link href="/tenders" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-brand-700">
        <ArrowLeft className="h-4 w-4" />
        一覧に戻る
      </Link>
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{TENDER_TYPE_LABELS[tender.tender_type]}</span>
          {tender.is_new ? <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">新着</span> : null}
          {tender.is_deadline_soon ? <span className="rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">締切間近</span> : null}
          {tender.is_defense ? <span className="rounded bg-slate-900 px-2 py-1 text-xs font-bold text-white">防衛省・自衛隊</span> : null}
          {tender.is_admin_verified ? <span className="rounded bg-brand-100 px-2 py-1 text-xs font-bold text-brand-700">管理者確認済み</span> : null}
        </div>
        <h1 className="mt-3 text-2xl font-black leading-tight text-slate-950">{tender.title}</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">{tender.agency_name}</p>

        <dl className="mt-6 grid overflow-hidden rounded border border-slate-200 sm:grid-cols-2">
          {[
            ["案件種別", TENDER_TYPE_LABELS[tender.tender_type]],
            ["組織区分", organizationLabel(tender.tender_sources?.organization_type)],
            ["取得元", tender.tender_sources?.source_name ?? tender.tender_sources?.name ?? "-"],
            ["オープンカウンター相当ラベル", tender.tender_type === "open_counter" ? "オープンカウンター" : "-"],
            ["original_label", tender.original_label ?? "-"],
            ["地域", `${tender.region} / ${tender.prefecture}`],
            ["公告日", formatDate(tender.published_at)],
            ["締切日", formatDate(tender.deadline_at)],
            ["入札日または見積期限", formatDate(tender.bid_at)],
            ["参加資格", tender.qualification_required ? "必要" : "不要"],
            ["必要資格", tender.required_qualification ?? "-"],
            ["取得日時", formatDate(tender.fetched_at)]
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[9rem_1fr] border-b border-slate-200 sm:border-r">
              <dt className="bg-slate-50 px-3 py-3 text-sm font-bold text-slate-600">{label}</dt>
              <dd className="px-3 py-3 text-sm text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 rounded border border-slate-200 bg-slate-50 p-4">
          <h2 className="font-black text-slate-950">案件詳細メモ</h2>
          <p className="mt-2 text-sm leading-7 text-slate-700">{tender.detail_memo ?? "詳細メモは未登録です。"}</p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a href={tender.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded bg-brand-700 px-4 py-3 font-bold text-white focus-ring">
            <ExternalLink className="h-4 w-4" />
            公式ページを確認する
          </a>
          {tender.pdf_url ? (
            <a href={tender.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded border border-slate-300 bg-white px-4 py-3 font-bold text-slate-800 focus-ring">
              <FileText className="h-4 w-4" />
              仕様書PDFを開く
            </a>
          ) : null}
        </div>

        <div id="favorite" className="mt-6 rounded-lg border border-brand-200 bg-brand-50 p-4">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
            <Star className="h-5 w-5 text-brand-700" />
            お気に入りに保存
          </h2>
          <form action={saveFavoriteTenderAction} className="mt-4 grid gap-3">
            <input type="hidden" name="tender_id" value={tender.id} />
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              対応ステータス
              <select name="status" className="rounded border border-slate-300 bg-white px-3 py-2 font-normal focus-ring">
                {Object.entries(FAVORITE_TENDER_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              メモ
              <textarea name="memo" rows={3} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" />
            </label>
            <button className="justify-self-start rounded bg-brand-700 px-4 py-2 font-bold text-white focus-ring">保存する</button>
          </form>
        </div>

        <p className="mt-6 text-xs leading-5 text-slate-500">
          仕様書や公告文の全文は転載せず、公式URLへのリンクを中心に表示しています。入札・見積参加前には必ず公式ページ・仕様書・公告文を確認してください。当アプリは落札を保証するものではありません。
        </p>
      </article>
    </div>
  );
}

function organizationLabel(value?: string | null) {
  if (!value) return "-";
  return TENDER_SOURCE_ORGANIZATION_TYPE_LABELS[value as keyof typeof TENDER_SOURCE_ORGANIZATION_TYPE_LABELS] ?? value;
}
