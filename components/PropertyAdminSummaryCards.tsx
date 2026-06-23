import type { PropertyAdminSummary } from "@/lib/property-admin-summary";

const CRAWLER_STATUS_LABELS: Record<string, string> = {
  running: "実行中",
  success: "成功",
  partial_success: "一部成功",
  failed: "失敗",
  skipped: "スキップ"
};

export function PropertyAdminSummaryCards({ summary }: { summary: PropertyAdminSummary }) {
  const hiddenCount = summary.draftCount + summary.soldCount;
  const cards = [
    { label: "公開中物件数", value: summary.publishedCount.toLocaleString("ja-JP") },
    { label: "非公開物件数", value: hiddenCount.toLocaleString("ja-JP") },
    { label: "取込候補数", value: summary.crawlerCandidateCount.toLocaleString("ja-JP") },
    { label: "承認待ち件数", value: summary.approvalPendingCount.toLocaleString("ja-JP") },
    { label: "直近7日取得件数", value: summary.recentDetectedCount.toLocaleString("ja-JP") },
    { label: "直近7日エラー", value: summary.recentCrawlErrorCount.toLocaleString("ja-JP") }
  ];

  return (
    <section className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <div key={card.label} className="rounded border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="text-xs font-bold text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
        {summary.lastCrawlerRun ? (
          <>
            <p className="font-bold text-slate-950">
              最終クローラー実行:
              <span className="ml-2 font-semibold text-slate-700">{formatDateTime(summary.lastCrawlerRun.finishedAt ?? summary.lastCrawlerRun.startedAt)}</span>
              <span className="ml-2 rounded bg-slate-100 px-2 py-1 text-xs">
                {CRAWLER_STATUS_LABELS[summary.lastCrawlerRun.status] ?? summary.lastCrawlerRun.status}
              </span>
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              取得 {summary.lastCrawlerRun.foundCount.toLocaleString("ja-JP")}件 / 候補 {summary.lastCrawlerRun.candidateCount.toLocaleString("ja-JP")}件 / 追加{" "}
              {summary.lastCrawlerRun.insertedCount.toLocaleString("ja-JP")}件 / 更新 {summary.lastCrawlerRun.updatedCount.toLocaleString("ja-JP")}件 / スキップ{" "}
              {summary.lastCrawlerRun.skippedCount.toLocaleString("ja-JP")}件 / 失敗 {summary.lastCrawlerRun.failedCount.toLocaleString("ja-JP")}件
            </p>
          </>
        ) : (
          <p className="font-bold text-slate-700">最終クローラー実行はまだ確認できません。</p>
        )}
        {summary.errorMessage ? (
          <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
            件数取得の一部でエラーがあります: {summary.errorMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
