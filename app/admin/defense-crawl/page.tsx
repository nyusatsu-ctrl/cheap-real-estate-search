import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { runDefenseCrawlAction, runDefenseDiscoveryAction } from "@/app/admin/defense-crawl/actions";
import { AdminShell } from "@/components/AdminShell";
import { getCurrentAdmin } from "@/lib/admin";
import { getTenderCandidates, getTenderSources } from "@/lib/tenders";
import { isDefenseLike, isWesternAreaAccounting, normalizeDefenseTender, tenderRegion } from "@/lib/tender-normalization";
import type { Tender, TenderCandidate, TenderSource } from "@/lib/types";

const sourcePath = path.join(process.cwd(), "data", "defense-sources.json");
const candidatePath = path.join(process.cwd(), "data", "defense-candidates.json");
const summaryPath = path.join(process.cwd(), "data", "defense-crawl-summary.json");
const tenderImportPath = path.join(process.cwd(), "data", "tender-imports.json");

export default async function DefenseCrawlPage() {
  const admin = await getCurrentAdmin();
  const localSources = readJson<TenderSource[]>(sourcePath, []);
  const localCandidates = readJson<TenderCandidate[]>(candidatePath, []);
  const localTenders = readJson<Tender[]>(tenderImportPath, []);
  const crawlSummary = readJson<DefenseCrawlSummary>(summaryPath, null);
  const [dbSources, pendingCandidates] = admin
    ? await Promise.all([getTenderSources(), getTenderCandidates("pending")])
    : [[], localCandidates.filter((candidate) => candidate.review_status === "pending")];
  const sources = localSources.length ? localSources : dbSources.filter((source) => String(source.organization_type ?? "").includes("defense") || String(source.crawler_type ?? "").includes("defense"));
  const candidates = localCandidates.map(normalizeDefenseTender);
  const candidateStatusCounts = countCandidateStatuses(candidates);
  const publishedTenders = localTenders.map(normalizeDefenseTender).filter((tender) => tender.status === "published");
  const publicDefenseTenderCount = publishedTenders.filter(isDefenseLike).length;
  const defenseMetrics = countDefenseMetrics(candidates, publishedTenders);
  const counts = countSources(sources);
  const sourceErrors = sources.filter((source) => source.last_error_message);
  const crawlErrors = crawlSummary?.errors ?? [];
  const errors = [...sourceErrors.map((source) => ({
    source_name: source.source_name ?? source.name,
    url: source.tender_list_url ?? source.url,
    error: source.last_error_message ?? ""
  })), ...crawlErrors];

  const content = (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950">空き家・古家・土地・山林取得状況</h2>
          <p className="mt-1 text-sm text-slate-600">公式ページのみを対象に、取得元発見と候補抽出の状態を確認します。</p>
        </div>
        {admin ? (
          <Link href="/admin/tender-candidates" className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
            未確認物件を確認する
          </Link>
        ) : (
          <Link href="/admin/login" className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
            管理者ログイン
          </Link>
        )}
      </div>

      {!admin ? (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          現在は読み取り専用表示です。再スキャン、手動クロール、候補承認には管理者ログインが必要です。
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Metric label="陸上古家 取得元数" value={counts.ground_self_defense_force} />
        <Metric label="海上古家 取得元数" value={counts.maritime_self_defense_force} />
        <Metric label="航空古家 取得元数" value={counts.air_self_defense_force} />
        <Metric label="地方防衛局 取得元数" value={counts.defense_bureau} />
        <Metric label="防衛装備庁 取得元数" value={counts.defense_equipment_agency} />
        <Metric label="最終クロール日時" value={crawlSummary?.finished_at ? formatDateTime(crawlSummary.finished_at) : "-"} />
        <Metric label="抽出候補件数" value={candidates.length} />
        <Metric label="空き家候補件数" value={defenseMetrics.defenseCandidates} />
        <Metric label="空き家公開済み件数" value={defenseMetrics.defensePublished} />
        <Metric label="九州の空き家候補件数" value={defenseMetrics.kyushuDefenseCandidates} />
        <Metric label="九州の空き家公開済み件数" value={defenseMetrics.kyushuDefensePublished} />
        <Metric label="西部方面会計隊候補件数" value={defenseMetrics.westernCandidates} />
        <Metric label="西部方面会計隊公開済み件数" value={defenseMetrics.westernPublished} />
        <Metric label="確認待ち件数" value={candidateStatusCounts.pending || pendingCandidates.length} />
        <Metric label="承認済み件数" value={candidateStatusCounts.approved} />
        <Metric label="公開済み件数" value={publicDefenseTenderCount} />
        <Metric label="却下件数" value={candidateStatusCounts.rejected} />
        <Metric label="重複件数" value={candidateStatusCounts.duplicate} />
        <Metric label="エラー件数" value={errors.length} />
      </div>

      {admin ? (
        <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-black text-slate-950">操作</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton action={runDefenseDiscoveryAction} group="all" label="空き家リンク集を再スキャン" />
            <ActionButton action={runDefenseDiscoveryAction} group="gsdf" label="陸上古家を再スキャン" />
            <ActionButton action={runDefenseDiscoveryAction} group="msdf" label="海上古家を再スキャン" />
            <ActionButton action={runDefenseDiscoveryAction} group="asdf" label="航空古家を再スキャン" />
            <ActionButton action={runDefenseDiscoveryAction} group="defense-bureaus" label="地方防衛局を再スキャン" />
            <ActionButton action={runDefenseCrawlAction} group="all" label="全古家を手動クロール" primary />
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="font-black text-slate-950">取得元別件数</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-3 py-3">取得元</th>
                  <th className="px-3 py-3">組織</th>
                  <th className="px-3 py-3">候補</th>
                  <th className="px-3 py-3">robots</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sources.slice(0, 80).map((source) => (
                  <tr key={source.tender_list_url ?? source.url}>
                    <td className="px-3 py-3">
                      <a href={source.tender_list_url ?? source.url} target="_blank" rel="noreferrer" className="font-bold text-slate-950 hover:text-brand-700">{source.source_name ?? source.name}</a>
                      <p className="mt-1 break-all text-xs text-slate-500">{source.tender_list_url ?? source.url}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{source.organization_type ?? "-"}</td>
                    <td className="px-3 py-3 text-slate-700">{candidates.filter((candidate) => candidate.source_name === (source.source_name ?? source.name)).length}</td>
                    <td className="px-3 py-3 text-slate-700">{source.crawl_ready ? "確認済み" : "未確認"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="font-black text-slate-950">エラー/文字化け</h3>
          </div>
          <div className="p-4 text-sm text-slate-700">
            <p>文字化け検出: {candidates.some((candidate) => /�|縺|譁|荳|螟/.test(candidate.raw_text ?? "")) ? "あり" : "なし"}</p>
            <div className="mt-3 grid gap-2">
              {errors.length ? errors.slice(0, 20).map((error) => (
                <div key={`${error.source_name}-${error.url}`} className="rounded border border-rose-200 bg-rose-50 p-2 text-rose-800">
                  <p className="font-bold">{error.source_name}</p>
                  <p className="break-all text-xs">{error.url}</p>
                  <p className="text-xs">{error.error}</p>
                </div>
              )) : <p className="text-slate-500">記録されたエラーはありません。</p>}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  if (admin) {
    return <AdminShell email={admin.email}>{content}</AdminShell>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        {content}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function ActionButton({ action, group, label, primary = false }: { action: (formData: FormData) => Promise<void>; group: string; label: string; primary?: boolean }) {
  return (
    <form action={action}>
      <input type="hidden" name="group" value={group} />
      <button className={`rounded px-4 py-2 text-sm font-bold focus-ring ${primary ? "bg-brand-700 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>
        {label}
      </button>
    </form>
  );
}

function countSources(sources: TenderSource[]) {
  const counts: Record<string, number> = {
    ground_self_defense_force: 0,
    maritime_self_defense_force: 0,
    air_self_defense_force: 0,
    defense_bureau: 0,
    defense_equipment_agency: 0
  };
  for (const source of sources) {
    const key = String(source.organization_type ?? "");
    if (key in counts) counts[key] += 1;
  }
  return counts;
}

function countCandidateStatuses(candidates: TenderCandidate[]) {
  const counts = {
    pending: 0,
    approved: 0,
    rejected: 0,
    duplicate: 0
  };
  for (const candidate of candidates) {
    if (candidate.review_status in counts) counts[candidate.review_status as keyof typeof counts] += 1;
  }
  return counts;
}

function countDefenseMetrics(candidates: TenderCandidate[], tenders: Tender[]) {
  return {
    defenseCandidates: candidates.filter(isDefenseLike).length,
    defensePublished: tenders.filter(isDefenseLike).length,
    kyushuDefenseCandidates: candidates.filter((candidate) => isDefenseLike(candidate) && tenderRegion(candidate) === "九州").length,
    kyushuDefensePublished: tenders.filter((tender) => isDefenseLike(tender) && tenderRegion(tender) === "九州").length,
    westernCandidates: candidates.filter(isWesternAreaAccounting).length,
    westernPublished: tenders.filter(isWesternAreaAccounting).length
  };
}

function readJson<T>(filePath: string, fallback: T) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

type DefenseCrawlSummary = {
  finished_at: string;
  candidate_count: number;
  error_count: number;
  errors: { source_name: string; url: string; error: string }[];
} | null;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Tokyo"
  }).format(new Date(value));
}
