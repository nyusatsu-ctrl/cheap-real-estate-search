import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";
import { TENDER_SOURCE_ORGANIZATION_TYPE_LABELS, TENDER_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { Tender } from "@/lib/types";

export function TenderTable({ tenders, restricted = false }: { tenders: Tender[]; restricted?: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">案件名</th>
              <th className="px-3 py-3">発注機関</th>
              <th className="px-3 py-3">種別</th>
              <th className="px-3 py-3">地域</th>
              <th className="px-3 py-3">公告日</th>
              <th className="px-3 py-3">締切</th>
              <th className="px-3 py-3">資格</th>
              <th className="px-3 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {tenders.map((tender) => (
              <tr key={tender.id} className={tender.is_deadline_soon ? "bg-amber-50/70" : undefined}>
                <td className="min-w-72 px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {tender.is_new ? <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">新着</span> : null}
                    {tender.is_deadline_soon ? <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">締切間近</span> : null}
                    {tender.is_defense ? <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">防衛省・自衛隊</span> : null}
                    {tender.tender_type === "open_counter" ? <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700">初心者向け</span> : null}
                    {tender.is_admin_verified ? <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700">管理者確認済み</span> : null}
                  </div>
                  <Link href={restricted ? "/billing?trial=expired" : `/tenders/${tender.id}`} className="mt-2 block font-black leading-6 text-slate-950 hover:text-brand-700">
                    {tender.title}
                  </Link>
                  {tender.original_label ? <p className="mt-1 text-xs font-semibold text-slate-500">元ラベル: {tender.original_label}</p> : null}
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{tender.detail_memo}</p>
                </td>
                <td className="px-3 py-3 text-slate-700">
                  {tender.agency_name}
                  <br />
                  <span className="text-xs text-slate-500">{organizationLabel(tender.tender_sources?.organization_type)}</span>
                </td>
                <td className="px-3 py-3 text-slate-700">{TENDER_TYPE_LABELS[tender.tender_type]}</td>
                <td className="px-3 py-3 text-slate-700">{tender.region}<br />{tender.prefecture}</td>
                <td className="px-3 py-3 text-slate-700">{formatDate(tender.published_at)}</td>
                <td className="px-3 py-3 font-bold text-slate-900">{formatDate(tender.deadline_at)}</td>
                <td className="px-3 py-3">
                  <span className={`rounded px-2 py-1 text-xs font-bold ${tender.qualification_required ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {tender.qualification_required ? "資格必要" : "資格不要"}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={restricted ? "/billing?trial=expired" : `/tenders/${tender.id}`} className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus-ring">
                      詳細
                    </Link>
                    <a href={tender.source_url} target="_blank" rel="noreferrer" className="rounded border border-slate-300 bg-white p-2 text-slate-700 focus-ring" aria-label="公式ページを開く">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <Link href={restricted ? "/billing?trial=expired" : `/tenders/${tender.id}#favorite`} className="rounded border border-slate-300 bg-white p-2 text-slate-700 focus-ring" aria-label="お気に入り">
                      <Star className="h-4 w-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function organizationLabel(value?: string | null) {
  if (!value) return "-";
  return TENDER_SOURCE_ORGANIZATION_TYPE_LABELS[value as keyof typeof TENDER_SOURCE_ORGANIZATION_TYPE_LABELS] ?? value;
}
