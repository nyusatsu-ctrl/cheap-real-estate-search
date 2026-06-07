import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { approveTenderCandidateAction, bulkApproveTenderCandidatesAction, updateTenderCandidateReviewAction } from "@/app/admin/tender-candidates/actions";
import { BulkApproveForm } from "@/app/admin/tender-candidates/BulkApproveForm";
import { AdminShell } from "@/components/AdminShell";
import { TENDER_CANDIDATE_REVIEW_STATUS_LABELS, TENDER_CANDIDATE_TYPE_LABELS, TENDER_SOURCE_ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { getCurrentAdmin } from "@/lib/admin";
import { getTenderCandidates } from "@/lib/tenders";
import { isDefenseLike, isWesternAreaAccounting, normalizeDefenseTender, tenderRegion } from "@/lib/tender-normalization";
import type { Tender, TenderAttachment, TenderCandidate } from "@/lib/types";

type SearchParams = {
  status?: string;
  page?: string;
  bulkApproved?: string;
  bulkSkipped?: string;
};

const PAGE_SIZE = 50;
const tenderImportPath = path.join(process.cwd(), "data", "tender-imports.json");

export default async function TenderCandidatesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const admin = await getCurrentAdmin();
  const params = await searchParams;
  const status = params.status ?? "pending";
  const [candidates, allCandidates] = await Promise.all([getTenderCandidates(status), getTenderCandidates("all")]);
  const publishedTenders = readJson<Tender[]>(tenderImportPath, []).map(normalizeDefenseTender).filter((tender) => tender.status === "published");
  const metrics = countDefenseMetrics(allCandidates, publishedTenders);
  const pendingCandidates = candidates.filter((candidate) => candidate.review_status === "pending");
  const currentPage = Math.max(1, Number(params.page ?? "1") || 1);
  const totalPages = Math.max(1, Math.ceil(candidates.length / PAGE_SIZE));
  const pageCandidates = candidates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pagePendingCandidates = pageCandidates.filter((candidate) => candidate.review_status === "pending");
  const bulkCounts = {
    ...countBulkApprovable(pendingCandidates),
    visible: countBulkApprovable(pagePendingCandidates).visible
  };

  const content = (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">候補案件確認</h2>
          <p className="mt-1 text-sm text-slate-600">クローラー結果はここで確認し、承認した案件だけ公開一覧へ登録します。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries({ pending: "確認待ち", all: "すべて", rejected: "却下", duplicate: "重複", approved: "承認済み" }).map(([value, label]) => (
            <Link key={value} href={`/admin/tender-candidates?status=${value}`} className={`rounded border px-3 py-2 text-sm font-bold focus-ring ${status === value ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-700"}`}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {!admin ? (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
          ローカル開発データを表示しています。Supabaseの管理者ログインなしでも、この開発環境では候補確認とローカル公開登録を実行できます。
        </div>
      ) : null}

      {params.bulkApproved || params.bulkSkipped ? (
        <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
          一括承認: {params.bulkApproved ?? 0}件を公開登録、{params.bulkSkipped ?? 0}件をスキップしました。
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Metric label="防衛省候補件数" value={metrics.defenseCandidates} />
        <Metric label="防衛省公開済み件数" value={metrics.defensePublished} />
        <Metric label="九州の防衛省候補件数" value={metrics.kyushuDefenseCandidates} />
        <Metric label="九州の防衛省公開済み件数" value={metrics.kyushuDefensePublished} />
        <Metric label="西部方面会計隊候補件数" value={metrics.westernCandidates} />
        <Metric label="西部方面会計隊公開済み件数" value={metrics.westernPublished} />
        <Metric label="pending 件数" value={metrics.pending} />
        <Metric label="approved 件数" value={metrics.approved} />
        <Metric label="rejected 件数" value={metrics.rejected} />
        <Metric label="duplicate 件数" value={metrics.duplicate} />
      </div>

      {pendingCandidates.length ? (
        <div className="mb-4">
          <BulkApproveForm action={bulkApproveTenderCandidatesAction} candidateIds={pagePendingCandidates.map((candidate) => candidate.id)} counts={bulkCounts} />
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700">
        <span>{candidates.length}件中 {(currentPage - 1) * PAGE_SIZE + 1}〜{Math.min(currentPage * PAGE_SIZE, candidates.length)}件を表示</span>
        <div className="flex gap-2">
          <Link href={`/admin/tender-candidates?status=${status}&page=${Math.max(1, currentPage - 1)}`} className={`rounded border px-3 py-1.5 ${currentPage <= 1 ? "pointer-events-none border-slate-200 text-slate-300" : "border-slate-300 bg-white text-slate-700"}`}>
            前へ
          </Link>
          <span className="px-2 py-1.5">{currentPage} / {totalPages}</span>
          <Link href={`/admin/tender-candidates?status=${status}&page=${Math.min(totalPages, currentPage + 1)}`} className={`rounded border px-3 py-1.5 ${currentPage >= totalPages ? "pointer-events-none border-slate-200 text-slate-300" : "border-slate-300 bg-white text-slate-700"}`}>
            次へ
          </Link>
        </div>
      </div>

      <div className="grid gap-4">
        {pageCandidates.map((candidate) => (
          <CandidateReview key={candidate.id} candidate={candidate} />
        ))}
        {candidates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
            対象の候補案件はありません。
          </div>
        ) : null}
      </div>
    </>
  );

  if (admin) return <AdminShell email={admin.email}>{content}</AdminShell>;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        {content}
      </div>
    </main>
  );
}

function CandidateReview({ candidate }: { candidate: TenderCandidate }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">{TENDER_CANDIDATE_REVIEW_STATUS_LABELS[candidate.review_status]}</span>
            <span className="rounded bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700">{TENDER_CANDIDATE_TYPE_LABELS[candidate.tender_type]}</span>
            {candidate.duplicate_candidate_id ? <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">重複候補あり</span> : null}
          </div>
          <h3 className="mt-2 text-lg font-black leading-7 text-slate-950">{candidate.title}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {candidate.agency_name} / {candidate.region} {candidate.prefecture} / 公告 {formatDate(candidate.published_at)} / 締切 {formatDate(candidate.deadline_at)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            組織区分: {organizationLabel(candidate.organization_type ?? candidate.tender_sources?.organization_type)} / 取得元: {candidate.source_name ?? candidate.tender_sources?.source_name ?? candidate.tender_sources?.name ?? "取得元未設定"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            入札日 {formatDate(candidate.bid_at)} / 取得日時 {formatDate(candidate.fetched_at)} / 信頼度 {candidate.classification_confidence ?? "-"} / 重複候補 {candidate.duplicate_candidate_id ?? "なし"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={candidate.source_url} target="_blank" rel="noreferrer" className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus-ring">元URL</a>
          {candidate.pdf_url ? <a href={candidate.pdf_url} target="_blank" rel="noreferrer" className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus-ring">PDF</a> : null}
        </div>
      </div>

      <form action={approveTenderCandidateAction} className="mt-4 grid gap-3">
        <input type="hidden" name="id" value={candidate.id} />
        <input type="hidden" name="source_id" value={candidate.source_id ?? ""} />
        <input type="hidden" name="source_name" value={candidate.source_name ?? candidate.tender_sources?.source_name ?? candidate.tender_sources?.name ?? ""} />
        <input type="hidden" name="organization_type" value={candidate.organization_type ?? candidate.tender_sources?.organization_type ?? ""} />
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="案件名" name="title" defaultValue={candidate.title} required />
          <Field label="発注機関" name="agency_name" defaultValue={candidate.agency_name} required />
          <Select label="分類" name="tender_type" options={TENDER_CANDIDATE_TYPE_LABELS} defaultValue={candidate.tender_type} />
          <Field label="original_label" name="original_label" defaultValue={candidate.original_label ?? ""} />
          <Field label="地域" name="region" defaultValue={candidate.region} required />
          <Field label="都道府県" name="prefecture" defaultValue={candidate.prefecture} required />
          <Field label="駐屯地/基地" name="base_location" defaultValue={candidate.base_location ?? ""} />
          <Field label="公告日" name="published_at" type="date" defaultValue={dateValue(candidate.published_at)} />
          <Field label="締切日" name="deadline_at" type="date" defaultValue={dateValue(candidate.deadline_at)} />
          <Field label="入札日" name="bid_at" type="date" defaultValue={dateValue(candidate.bid_at)} />
          <Field label="必要資格" name="required_qualification" defaultValue={candidate.required_qualification ?? ""} />
          <Field label="元URL" name="source_url" defaultValue={candidate.source_url} required />
          <Field label="PDF URL" name="pdf_url" defaultValue={candidate.pdf_url ?? ""} />
        </div>
        <Check label="参加資格あり" name="qualification_required" defaultChecked={candidate.qualification_required} />
        <TextArea label="概要/AI要約" name="ai_summary" rows={3} defaultValue={candidate.ai_summary ?? ""} />
        <TextArea label="raw_text" name="raw_text" rows={3} defaultValue={candidate.raw_text ?? ""} />
        <TextArea label="管理者メモ" name="admin_note" rows={2} defaultValue={candidate.admin_note ?? ""} />
        <AttachmentList attachments={candidate.attachments ?? []} />
        <div className="flex flex-wrap gap-2">
          <button className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">承認して公開</button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        <form action={updateTenderCandidateReviewAction}>
          <input type="hidden" name="id" value={candidate.id} />
          <input type="hidden" name="review_status" value="rejected" />
          <input type="hidden" name="admin_note" value={candidate.admin_note ?? ""} />
          <button className="rounded border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 focus-ring">却下</button>
        </form>
        <form action={updateTenderCandidateReviewAction}>
          <input type="hidden" name="id" value={candidate.id} />
          <input type="hidden" name="review_status" value="duplicate" />
          <input type="hidden" name="admin_note" value={candidate.admin_note ?? ""} />
          <button className="rounded border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-800 focus-ring">重複として処理</button>
        </form>
      </div>
    </div>
  );
}

function AttachmentList({ attachments }: { attachments: TenderAttachment[] }) {
  if (!attachments.length) {
    return <p className="text-xs text-slate-500">PDF/添付URL: なし</p>;
  }
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">PDF/添付URL</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {attachments.slice(0, 8).map((attachment) => (
          <a key={attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:text-brand-700">
            {attachment.file_type}: {attachment.label || attachment.title || "添付"}
          </a>
        ))}
        {attachments.length > 8 ? <span className="text-xs text-slate-500">ほか{attachments.length - 8}件</span> : null}
      </div>
    </div>
  );
}

function Field({ label, name, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <input name={name} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" {...props} />
    </label>
  );
}

function TextArea({ label, name, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; name: string }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <textarea name={name} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" {...props} />
    </label>
  );
}

function Select({ label, name, options, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; name: string; options: Record<string, string> }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <select name={name} className="rounded border border-slate-300 px-3 py-2 font-normal focus-ring" {...props}>
        {Object.entries(options).map(([value, labelText]) => (
          <option key={value} value={value}>{labelText}</option>
        ))}
      </select>
    </label>
  );
}

function Check({ label, name, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
      <input name={name} type="checkbox" {...props} />
      {label}
    </label>
  );
}

function dateValue(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function organizationLabel(value?: string | null) {
  if (!value) return "-";
  return TENDER_SOURCE_ORGANIZATION_TYPE_LABELS[value as keyof typeof TENDER_SOURCE_ORGANIZATION_TYPE_LABELS] ?? value;
}

function countBulkApprovable(candidates: TenderCandidate[]) {
  const counts: Record<string, number> = {
    visible: 0,
    defense: 0,
    gsdf: 0,
    msdf: 0,
    asdf: 0,
    open_counter: 0,
    goods_services: 0,
    kyushu_defense: 0,
    western_area: 0,
    kyushu_goods_services: 0,
    kyushu_open_counter: 0
  };
  for (const candidate of candidates) {
    const normalized = normalizeDefenseTender(candidate);
    if (!isBulkApprovable(normalized)) continue;
    counts.visible += 1;
    const isDefense = isDefenseLike(normalized);
    const isKyushu = tenderRegion(normalized) === "九州";
    const isOpenCounter = normalized.tender_type === "open_counter" || normalized.tender_type === "small_discretionary";
    const isGoodsServices = normalized.tender_type === "goods" || normalized.tender_type === "services";
    if (isDefense) counts.defense += 1;
    if (normalized.organization_type === "ground_self_defense_force") counts.gsdf += 1;
    if (normalized.organization_type === "maritime_self_defense_force") counts.msdf += 1;
    if (normalized.organization_type === "air_self_defense_force") counts.asdf += 1;
    if (isOpenCounter) counts.open_counter += 1;
    if (isGoodsServices) counts.goods_services += 1;
    if (isDefense && isKyushu) counts.kyushu_defense += 1;
    if (isWesternAreaAccounting(normalized)) counts.western_area += 1;
    if (isDefense && isKyushu && isGoodsServices) counts.kyushu_goods_services += 1;
    if (isDefense && isKyushu && isOpenCounter) counts.kyushu_open_counter += 1;
  }
  return counts;
}

function isBulkApprovable(candidate: TenderCandidate) {
  if (!candidate.title.trim()) return false;
  if (!candidate.source_url && !candidate.pdf_url) return false;
  if (!candidate.agency_name.trim()) return false;
  if (candidate.review_status !== "pending") return false;
  if (candidate.duplicate_candidate_id) return false;
  if (candidate.tender_type === "unknown" || candidate.tender_type === "construction") return false;
  const target = `${candidate.title} ${candidate.raw_text ?? ""} ${candidate.source_url}`;
  if (/契約|調達|入札|公告|公募|公示|見積|オープンカウンタ|売払/.test(target)) return true;
  return !/採用|広報|イベント|SNS|アクセス|お問い合わせ|部隊紹介|沿革|サイトマップ|プライバシーポリシー|オープンキャンパス|ポスター|リーフレット/.test(target);
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function countDefenseMetrics(candidates: TenderCandidate[], tenders: Tender[]) {
  const normalizedCandidates = candidates.map(normalizeDefenseTender);
  const normalizedTenders = tenders.map(normalizeDefenseTender);
  return {
    defenseCandidates: normalizedCandidates.filter(isDefenseLike).length,
    defensePublished: normalizedTenders.filter(isDefenseLike).length,
    kyushuDefenseCandidates: normalizedCandidates.filter((candidate) => isDefenseLike(candidate) && tenderRegion(candidate) === "九州").length,
    kyushuDefensePublished: normalizedTenders.filter((tender) => isDefenseLike(tender) && tenderRegion(tender) === "九州").length,
    westernCandidates: normalizedCandidates.filter(isWesternAreaAccounting).length,
    westernPublished: normalizedTenders.filter(isWesternAreaAccounting).length,
    pending: normalizedCandidates.filter((candidate) => candidate.review_status === "pending").length,
    approved: normalizedCandidates.filter((candidate) => candidate.review_status === "approved").length,
    rejected: normalizedCandidates.filter((candidate) => candidate.review_status === "rejected").length,
    duplicate: normalizedCandidates.filter((candidate) => candidate.review_status === "duplicate").length
  };
}

function readJson<T>(filePath: string, fallback: T) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}
