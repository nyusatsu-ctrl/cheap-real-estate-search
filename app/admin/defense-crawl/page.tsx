import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import type { Metadata } from "next";
import { runDailyTenderCrawlAction, runDefenseCrawlAction, runDefenseDiscoveryAction, runPortalTenderCrawlAction } from "@/app/admin/defense-crawl/actions";
import { AdminShell } from "@/components/AdminShell";
import { getCurrentAdmin } from "@/lib/admin";
import { TENDER_SOURCE_ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import { getTenderNotificationDiagnostics } from "@/lib/tender-notifications";
import { assessTenderDeadline, assessTenderSourceAvailability } from "@/lib/tender-deadlines";
import { getAdminTenders, getTenderCandidates, getTenderCrawlLogs, getTenderDatabaseDiagnostics, getTenderSources, type TenderDatabaseDiagnostics } from "@/lib/tenders";
import { isDefenseLike, isWesternAreaAccounting, normalizeDefenseTender, tenderRegion } from "@/lib/tender-normalization";
import type { Tender, TenderCandidate, TenderCrawlLog, TenderSource } from "@/lib/types";

const sourcePath = path.join(process.cwd(), "data", "defense-sources.json");
const candidatePath = path.join(process.cwd(), "data", "defense-candidates.json");
const summaryPath = path.join(process.cwd(), "data", "defense-crawl-summary.json");
const tenderImportPath = path.join(process.cwd(), "data", "tender-imports.json");

export const metadata: Metadata = {
  title: "官公庁案件 取得状況｜株式会社エコループ",
  description: "官公庁案件サーチの取得元、手動クロール、日次取得ログを確認する管理画面です。",
  openGraph: {
    title: "官公庁案件 取得状況｜株式会社エコループ",
    description: "官公庁案件サーチの取得元、手動クロール、日次取得ログを確認する管理画面です。",
    siteName: "官公庁案件サーチ"
  },
  twitter: {
    card: "summary",
    title: "官公庁案件 取得状況｜株式会社エコループ",
    description: "官公庁案件サーチの取得元、手動クロール、日次取得ログを確認する管理画面です。"
  }
};

export default async function DefenseCrawlPage() {
  const admin = await getCurrentAdmin();
  const localSources = readJson<TenderSource[]>(sourcePath, []);
  const localCandidates = readJson<TenderCandidate[]>(candidatePath, []);
  const localTenders = readJson<Tender[]>(tenderImportPath, []);
  const crawlSummary = readJson<DefenseCrawlSummary>(summaryPath, null);
  const [dbSources, dbCandidates, dbTenders, crawlLogs, notificationDiagnostics] = admin
    ? await Promise.all([getTenderSources(), getTenderCandidates("all"), getAdminTenders(), getTenderCrawlLogs(20), getTenderNotificationDiagnostics()])
    : [[], [], [], [] as TenderCrawlLog[], null];
  const dbDiagnostics = admin ? await getTenderDatabaseDiagnostics() : null;
  const sources = admin && dbSources.length ? dbSources : localSources;
  const candidates = (admin ? dbCandidates : localCandidates).map(normalizeDefenseTender);
  const pendingCandidates = candidates.filter((candidate) => candidate.review_status === "pending");
  const candidateStatusCounts = countCandidateStatuses(candidates);
  const publishedTenders = (admin ? dbTenders : localTenders).map(normalizeDefenseTender).filter((tender) => tender.status === "published");
  const publicDefenseTenderCount = publishedTenders.filter(isDefenseLike).length;
  const defenseMetrics = countDefenseMetrics(candidates, publishedTenders);
  const deadlineMetrics = countDeadlineMetrics(publishedTenders);
  const sourceDeadlineMetrics = countDeadlineMetricsBySource(publishedTenders);
  const counts = countSources(sources);
  const crawlReadyCount = sources.filter((source) => source.is_active && source.crawl_ready && source.crawler_type !== "manual_only").length;
  const latestLog = crawlLogs.find((log) => !isDailyPipelineLog(log) && !isTenderNotificationLog(log)) ?? dbDiagnostics?.latestLog ?? null;
  const pipelineLog = crawlLogs.find(isDailyPipelineLog) ?? null;
  const pipelineSummary = parseDailyPipelineSummary(pipelineLog?.error_message);
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
          <h2 className="text-xl font-black text-slate-950">官公庁案件 取得状況</h2>
          <p className="mt-1 text-sm text-slate-600">調達ポータル、防衛省・自衛隊、各省庁などの取得元とクロール実行ログを確認します。</p>
        </div>
        {admin ? (
          <Link href="/admin/tender-candidates" className="rounded bg-brand-700 px-4 py-2 text-sm font-bold text-white focus-ring">
            未確認候補を確認する
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

      {admin && dbDiagnostics ? (
        <TenderDatabaseStatus diagnostics={dbDiagnostics} displayedPublishedCount={publishedTenders.length} displayedCandidateCount={candidates.length} />
      ) : null}

      {admin ? (
        <DailyPipelineStatus log={pipelineLog} summary={pipelineSummary} />
      ) : null}

      {admin ? (
        <TenderNotificationStatus diagnostics={notificationDiagnostics} summary={pipelineSummary} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Metric label="登録取得元数" value={sources.length} />
        <Metric label="自動取得対象" value={crawlReadyCount} />
        <Metric label="公開案件件数" value={publishedTenders.length} />
        <Metric label="active件数" value={deadlineMetrics.active} />
        <Metric label="closing_soon件数" value={deadlineMetrics.closingSoon} />
        <Metric label="expired件数" value={deadlineMetrics.expired} />
        <Metric label="unknown件数" value={deadlineMetrics.unknown} />
        <Metric label="公式ページ掲載中" value={deadlineMetrics.sourceOpen} />
        <Metric label="公式ページ掲載終了" value={deadlineMetrics.sourceClosed} />
        <Metric label="掲載状態不明" value={deadlineMetrics.sourceUnknown} />
        <Metric label="直近7日取得件数" value={deadlineMetrics.recent7Days} />
        <Metric label="候補件数" value={candidates.length} />
        <Metric label="陸上自衛隊 取得元数" value={counts.ground_self_defense_force} />
        <Metric label="海上自衛隊 取得元数" value={counts.maritime_self_defense_force} />
        <Metric label="航空自衛隊 取得元数" value={counts.air_self_defense_force} />
        <Metric label="地方防衛局 取得元数" value={counts.defense_bureau} />
        <Metric label="防衛装備庁 取得元数" value={counts.defense_equipment_agency} />
        <Metric label="最終DBログ日時" value={latestLog?.started_at ? formatDateTime(latestLog.started_at) : "-"} />
        <Metric label="最終取得件数" value={latestLog?.fetched_count ?? "-"} />
        <Metric label="最終登録件数" value={latestLog?.created_count ?? "-"} />
        <Metric label="最終既存/更新件数" value={latestLog?.duplicate_count ?? "-"} />
        <Metric label="防衛系候補件数" value={defenseMetrics.defenseCandidates} />
        <Metric label="防衛系公開済み件数" value={defenseMetrics.defensePublished} />
        <Metric label="九州の防衛系候補件数" value={defenseMetrics.kyushuDefenseCandidates} />
        <Metric label="九州の防衛系公開済み件数" value={defenseMetrics.kyushuDefensePublished} />
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
            <SimpleActionButton action={runPortalTenderCrawlAction} label="調達ポータルを手動取得" />
            <SimpleActionButton action={runDailyTenderCrawlAction} label="日次取得を手動実行" primary />
            <ActionButton action={runDefenseDiscoveryAction} group="all" label="防衛系リンク集を再スキャン" />
            <ActionButton action={runDefenseDiscoveryAction} group="gsdf" label="陸上自衛隊を再スキャン" />
            <ActionButton action={runDefenseDiscoveryAction} group="msdf" label="海上自衛隊を再スキャン" />
            <ActionButton action={runDefenseDiscoveryAction} group="asdf" label="航空自衛隊を再スキャン" />
            <ActionButton action={runDefenseDiscoveryAction} group="defense-bureaus" label="地方防衛局を再スキャン" />
            <ActionButton action={runDefenseCrawlAction} group="all" label="防衛系を手動クロール" />
          </div>
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="font-black text-slate-950">クロール実行ログ</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
              <tr>
                <th className="px-3 py-3">開始</th>
                <th className="px-3 py-3">取得元</th>
                <th className="px-3 py-3">状態</th>
                <th className="px-3 py-3">取得</th>
                <th className="px-3 py-3">登録</th>
                <th className="px-3 py-3">既存/更新</th>
                <th className="px-3 py-3">エラー/スキップ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {crawlLogs.length ? crawlLogs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{formatDateTime(log.started_at)}</td>
                  <td className="px-3 py-3 text-slate-700">{log.tender_sources?.source_name ?? log.tender_sources?.name ?? "防衛系一括"}</td>
                  <td className="px-3 py-3 font-bold text-slate-900">{crawlStatusLabel(log.status)}</td>
                  <td className="px-3 py-3 text-slate-700">{log.fetched_count}</td>
                  <td className="px-3 py-3 text-slate-700">{log.created_count}</td>
                  <td className="px-3 py-3 text-slate-700">{log.duplicate_count}</td>
                  <td className="px-3 py-3 text-slate-700">
                    {log.skipped_count}
                    {log.error_message ? <p className="mt-1 max-w-xl text-xs text-rose-700">{log.error_message}</p> : null}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className="px-3 py-5 text-slate-500" colSpan={7}>DBにクロールログはまだありません。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                  <th className="px-3 py-3">組織/状態</th>
                  <th className="px-3 py-3">最終取得</th>
                  <th className="px-3 py-3">件数</th>
                  <th className="px-3 py-3">期限取得</th>
                  <th className="px-3 py-3">直近エラー</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sources.slice(0, 120).map((source) => {
                  const deadline = sourceDeadlineMetrics.get(sourceKey(source)) ?? emptySourceDeadlineMetric();
                  const rate = deadline.published ? Math.round((deadline.known / deadline.published) * 100) : 0;
                  return (
                    <tr key={source.tender_list_url ?? source.url}>
                      <td className="px-3 py-3">
                        <a href={source.tender_list_url ?? source.url} target="_blank" rel="noreferrer" className="font-bold text-slate-950 hover:text-brand-700">{source.source_name ?? source.name}</a>
                        <p className="mt-1 break-all text-xs text-slate-500">{source.tender_list_url ?? source.url}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        <p>{organizationLabel(source.organization_type)}</p>
                        <div className="mt-2 flex flex-wrap gap-1 text-xs font-bold">
                          <span className={source.is_active ? "rounded bg-sky-100 px-2 py-0.5 text-sky-700" : "rounded bg-slate-200 px-2 py-0.5 text-slate-600"}>
                            {source.is_active ? "有効" : "無効"}
                          </span>
                          <span className={source.crawl_ready ? "rounded bg-emerald-100 px-2 py-0.5 text-emerald-700" : "rounded bg-amber-100 px-2 py-0.5 text-amber-800"}>
                            {source.crawl_ready ? "自動取得対象" : "手動確認"}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-700">{source.last_crawled_at ? formatDateTime(source.last_crawled_at) : "-"}</td>
                      <td className="px-3 py-3 text-slate-700">
                        <p>公開: {deadline.published || source.tender_count || 0}</p>
                        <p className="text-xs text-slate-500">候補: {candidates.filter((candidate) => candidate.source_name === (source.source_name ?? source.name)).length}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        <p>期限あり: {deadline.known}</p>
                        <p>unknown: {deadline.unknown}</p>
                        <p className="text-xs text-slate-500">掲載中: {deadline.sourceOpen} / 終了: {deadline.sourceClosed}</p>
                        <p className="text-xs font-bold text-slate-500">取得率: {rate}%</p>
                        <p className="mt-1 text-xs text-slate-500">最終期限更新: {deadline.lastDeadlineUpdatedAt ? formatDateTime(deadline.lastDeadlineUpdatedAt) : "-"}</p>
                      </td>
                      <td className="max-w-sm px-3 py-3 text-xs text-rose-700">
                        {source.latest_error ?? source.last_error_message ?? "-"}
                        {source.last_error_message && /pdf|html|HTTP|timeout|fetch/i.test(source.last_error_message) ? (
                          <p className="mt-1 font-bold">HTML/PDF取得エラーあり</p>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
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
    return <AdminShell email={admin.email} systemName="官公庁案件サーチ">{content}</AdminShell>;
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

function TenderDatabaseStatus({
  diagnostics,
  displayedPublishedCount,
  displayedCandidateCount
}: {
  diagnostics: TenderDatabaseDiagnostics;
  displayedPublishedCount: number;
  displayedCandidateCount: number;
}) {
  const connected = diagnostics.canUseServiceRole && diagnostics.errors.length === 0;
  const dbPublishedCount = diagnostics.counts.publishedTenders;
  const dbCandidateCount = diagnostics.counts.candidates;
  const likelyFallback = !diagnostics.canUseServiceRole || dbPublishedCount === null || dbCandidateCount === null;
  const mismatch = (dbPublishedCount !== null && dbPublishedCount !== displayedPublishedCount) || (dbCandidateCount !== null && dbCandidateCount !== displayedCandidateCount);

  return (
    <div className={`mb-5 rounded-lg border p-4 text-sm shadow-sm ${connected && !mismatch ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-black">官公庁案件DB 接続状態</h3>
          <p className="mt-1">
            表示データ: {likelyFallback ? "ローカルfallbackの可能性あり" : "Supabase DB"}
            {mismatch ? "（DB件数と表示件数に差があります）" : ""}
          </p>
        </div>
        <span className={`rounded px-2 py-1 text-xs font-bold ${connected && !mismatch ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
          {connected ? "DB疎通OK" : "確認が必要"}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatusItem label="Project Ref" value={diagnostics.config.projectRef ?? "-"} />
        <StatusItem label="URL" value={diagnostics.config.hasUrl ? "設定済み" : "未設定"} />
        <StatusItem label="ANON KEY" value={formatKeyStatus(diagnostics.config.hasAnonKey, diagnostics.config.anonKeyFormat)} />
        <StatusItem label="SERVICE ROLE KEY" value={formatKeyStatus(diagnostics.config.hasServiceRoleKey, diagnostics.config.serviceRoleKeyFormat)} />
        <StatusItem label="DB取得元" value={formatNullableCount(diagnostics.counts.sources)} />
        <StatusItem label="自動取得対象" value={formatNullableCount(diagnostics.counts.crawlReadySources)} />
        <StatusItem label="DB公開案件" value={formatNullableCount(diagnostics.counts.publishedTenders)} />
        <StatusItem label="DB候補" value={formatNullableCount(diagnostics.counts.candidates)} />
        <StatusItem label="DBログ" value={formatNullableCount(diagnostics.counts.crawlLogs)} />
        <StatusItem label="DBエラー" value={formatNullableCount(diagnostics.counts.sourceErrors)} />
        <StatusItem label="画面の公開案件" value={String(displayedPublishedCount)} />
        <StatusItem label="画面の候補" value={String(displayedCandidateCount)} />
      </div>

      {diagnostics.latestLog ? (
        <p className="mt-3 text-xs">
          最新DBログ: {formatDateTime(diagnostics.latestLog.started_at)} / 状態: {crawlStatusLabel(diagnostics.latestLog.status)} / 取得: {diagnostics.latestLog.fetched_count} / 登録: {diagnostics.latestLog.created_count} / 既存: {diagnostics.latestLog.duplicate_count} / エラー: {diagnostics.latestLog.error_count ?? 0}
        </p>
      ) : (
        <p className="mt-3 text-xs">最新DBログ: -</p>
      )}

      {diagnostics.latestSourceError ? (
        <p className="mt-2 break-all text-xs">
          最新エラー: {diagnostics.latestSourceError.error_type ?? "crawl_error"} / {diagnostics.latestSourceError.error_message}
        </p>
      ) : null}

      {diagnostics.errors.length ? (
        <div className="mt-3 grid gap-1 text-xs">
          {diagnostics.errors.slice(0, 5).map((error) => (
            <p key={error}>確認事項: {error}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DailyPipelineStatus({
  log,
  summary
}: {
  log: TenderCrawlLog | null;
  summary: DailyPipelineSummary | null;
}) {
  const status = summary ? crawlStatusLabel(summary.status) : log ? crawlStatusLabel(log.status) : "-";
  const duration = summary?.duration_seconds !== undefined ? `${summary.duration_seconds}秒` : "-";
  const warnings = summary?.warnings ?? [];

  return (
    <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-950">日次パイプライン 最終実行状況</h3>
          <p className="mt-1 text-slate-600">案件取得、品質判定、公開、期限更新、掲載状態更新をまとめて実行する日次処理です。</p>
        </div>
        <span className={`rounded px-2 py-1 text-xs font-bold ${summary?.status === "success" ? "bg-emerald-100 text-emerald-800" : summary ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
          {status}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatusItem label="最終日次実行日時" value={log?.started_at ? formatDateTime(log.started_at) : "-"} />
        <StatusItem label="所要時間" value={duration} />
        <StatusItem label="新規取得" value={String(summary?.created_count ?? log?.fetched_count ?? "-")} />
        <StatusItem label="自動公開" value={String(summary?.auto_published_count ?? log?.created_count ?? "-")} />
        <StatusItem label="pending" value={String(summary?.pending_candidates ?? "-")} />
        <StatusItem label="エラー数" value={String(summary?.error_count ?? log?.error_count ?? "-")} />
        <StatusItem label="最終成功日時" value={summary?.status === "success" && log?.finished_at ? formatDateTime(log.finished_at) : "-"} />
        <StatusItem label="次回予定時刻" value={nextDailyPipelineRunLabel()} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatusItem label="公開案件" value={String(summary?.published_tenders ?? "-")} />
        <StatusItem label="active" value={String(summary?.active ?? "-")} />
        <StatusItem label="closing_soon" value={String(summary?.closing_soon ?? "-")} />
        <StatusItem label="expired" value={String(summary?.expired ?? "-")} />
        <StatusItem label="unknown" value={String(summary?.unknown ?? "-")} />
        <StatusItem label="source_closed" value={String(summary?.source_closed ?? "-")} />
      </div>

      {warnings.length ? (
        <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-amber-900">
          <p className="font-bold">警告</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500">警告: なし</p>
      )}
    </div>
  );
}

function TenderNotificationStatus({
  diagnostics,
  summary
}: {
  diagnostics: Awaited<ReturnType<typeof getTenderNotificationDiagnostics>> | null;
  summary: DailyPipelineSummary | null;
}) {
  return (
    <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-950">新着案件通知 診断</h3>
          <p className="mt-1 text-slate-600">通知条件と日次パイプラインで作成されたアプリ内通知の状態を確認します。個人のメールアドレスは表示しません。</p>
        </div>
        <span className={`rounded px-2 py-1 text-xs font-bold ${diagnostics?.error ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
          {diagnostics?.error ? "確認が必要" : "確認OK"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatusItem label="有効通知条件数" value={String(diagnostics?.activeRuleCount ?? summary?.notification_rule_count ?? "-")} />
        <StatusItem label="通知対象ユーザー数" value={String(diagnostics?.targetUserCount ?? summary?.notification_target_user_count ?? "-")} />
        <StatusItem label="今回作成通知数" value={String(diagnostics?.latestCreatedCount ?? summary?.notification_created_count ?? "-")} />
        <StatusItem label="重複スキップ数" value={String(diagnostics?.latestDuplicateSkippedCount ?? summary?.notification_duplicate_skipped_count ?? "-")} />
        <StatusItem label="通知エラー数" value={String(diagnostics?.latestErrorCount ?? summary?.notification_error_count ?? "-")} />
        <StatusItem label="メール送信待ち数" value={String(diagnostics?.emailPendingCount ?? summary?.email_outbox_pending_count ?? "-")} />
        <StatusItem label="最終通知処理日時" value={diagnostics?.latestProcessedAt ? formatDateTime(diagnostics.latestProcessedAt) : "-"} />
        <StatusItem label="実メール送信" value="無効" />
      </div>
      {diagnostics?.error ? (
        <p className="mt-3 break-all text-xs text-amber-800">確認事項: {diagnostics.error}</p>
      ) : null}
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/70 bg-white/70 p-3">
      <p className="text-xs font-bold opacity-70">{label}</p>
      <p className="mt-1 font-black">{value}</p>
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

function SimpleActionButton({ action, label, primary = false }: { action: () => Promise<void>; label: string; primary?: boolean }) {
  return (
    <form action={action}>
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

function countDeadlineMetrics(tenders: Tender[]) {
  const now = new Date();
  const recentThreshold = now.getTime() - 7 * 86_400_000;
  const counts = {
    active: 0,
    closingSoon: 0,
    expired: 0,
    unknown: 0,
    archived: 0,
    sourceOpen: 0,
    sourceClosed: 0,
    sourceUnknown: 0,
    recent7Days: 0,
    defensePublished: 0
  };

  for (const tender of tenders) {
    const deadline = assessTenderDeadline(tender, now);
    const availability = assessTenderSourceAvailability(tender, now);
    if (deadline.status === "active") counts.active += 1;
    if (deadline.status === "closing_soon") counts.closingSoon += 1;
    if (deadline.status === "expired") counts.expired += 1;
    if (deadline.status === "unknown") counts.unknown += 1;
    if (deadline.status === "archived") counts.archived += 1;
    if (availability.status === "source_open") counts.sourceOpen += 1;
    if (availability.status === "source_closed") counts.sourceClosed += 1;
    if (availability.status === "source_unknown") counts.sourceUnknown += 1;
    if (isDefenseLike(tender)) counts.defensePublished += 1;

    const fetchedAt = new Date(tender.fetched_at ?? tender.created_at ?? 0).getTime();
    if (Number.isFinite(fetchedAt) && fetchedAt >= recentThreshold) counts.recent7Days += 1;
  }

  return counts;
}

function countDeadlineMetricsBySource(tenders: Tender[]) {
  const now = new Date();
  const map = new Map<string, SourceDeadlineMetric>();

  for (const tender of tenders) {
    const key = tenderSourceKey(tender);
    const current = map.get(key) ?? emptySourceDeadlineMetric();
    const deadline = assessTenderDeadline(tender, now);
    const availability = assessTenderSourceAvailability(tender, now);
    current.published += 1;
    if (deadline.status === "unknown") current.unknown += 1;
    else current.known += 1;
    if (deadline.status === "active") current.active += 1;
    if (deadline.status === "closing_soon") current.closingSoon += 1;
    if (deadline.status === "expired") current.expired += 1;
    if (availability.status === "source_open") current.sourceOpen += 1;
    if (availability.status === "source_closed") current.sourceClosed += 1;
    if (availability.status === "source_unknown") current.sourceUnknown += 1;
    if ((tender.deadline_at || tender.bid_at) && newerThan(current.lastDeadlineUpdatedAt, tender.updated_at)) {
      current.lastDeadlineUpdatedAt = tender.updated_at;
    }
    map.set(key, current);
  }

  return map;
}

function emptySourceDeadlineMetric(): SourceDeadlineMetric {
  return {
    published: 0,
    known: 0,
    unknown: 0,
    active: 0,
    closingSoon: 0,
    expired: 0,
    sourceOpen: 0,
    sourceClosed: 0,
    sourceUnknown: 0,
    lastDeadlineUpdatedAt: null
  };
}

function sourceKey(source: TenderSource) {
  return source.source_name ?? source.name ?? source.url;
}

function tenderSourceKey(tender: Tender) {
  return tender.source_name ?? tender.tender_sources?.source_name ?? tender.tender_sources?.name ?? "unknown";
}

function newerThan(current: string | null, candidate: string | null) {
  if (!candidate) return false;
  if (!current) return true;
  return new Date(candidate).getTime() > new Date(current).getTime();
}

type SourceDeadlineMetric = {
  published: number;
  known: number;
  unknown: number;
  active: number;
  closingSoon: number;
  expired: number;
  sourceOpen: number;
  sourceClosed: number;
  sourceUnknown: number;
  lastDeadlineUpdatedAt: string | null;
};

function organizationLabel(value: TenderSource["organization_type"]) {
  if (!value) return "-";
  return TENDER_SOURCE_ORGANIZATION_TYPE_LABELS[value] ?? value;
}

function crawlStatusLabel(status: TenderCrawlLog["status"]) {
  if (status === "success") return "成功";
  if (status === "partial_success") return "一部成功";
  return "失敗";
}

function formatNullableCount(value: number | null) {
  return value === null ? "-" : String(value);
}

function isDailyPipelineLog(log: TenderCrawlLog) {
  return String(log.error_message ?? "").startsWith("daily_pipeline_summary:");
}

function isTenderNotificationLog(log: TenderCrawlLog) {
  return String(log.error_message ?? "").startsWith("tender_notifications_summary:");
}

function parseDailyPipelineSummary(value?: string | null): DailyPipelineSummary | null {
  const text = String(value ?? "");
  if (!text.startsWith("daily_pipeline_summary:")) return null;
  try {
    return JSON.parse(text.slice("daily_pipeline_summary:".length)) as DailyPipelineSummary;
  } catch {
    return null;
  }
}

function nextDailyPipelineRunLabel() {
  const now = new Date();
  const todayAtFiveJst = new Date(now);
  todayAtFiveJst.setUTCHours(20, 0, 0, 0);
  if (now >= todayAtFiveJst) todayAtFiveJst.setUTCDate(todayAtFiveJst.getUTCDate() + 1);
  return formatDateTime(todayAtFiveJst.toISOString());
}

function formatKeyStatus(hasValue: boolean, format: string) {
  if (!hasValue) return "未設定";
  return `設定済み (${format})`;
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

type DailyPipelineSummary = {
  status: TenderCrawlLog["status"];
  duration_seconds: number;
  created_count: number;
  auto_published_count: number;
  pending_candidates: number;
  published_tenders: number;
  active: number;
  closing_soon: number;
  expired: number;
  unknown: number;
  source_closed: number;
  notification_rule_count?: number;
  notification_target_user_count?: number;
  notification_created_count?: number;
  notification_duplicate_skipped_count?: number;
  notification_error_count?: number;
  email_outbox_pending_count?: number;
  error_count: number;
  warnings: string[];
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Tokyo"
  }).format(new Date(value));
}
