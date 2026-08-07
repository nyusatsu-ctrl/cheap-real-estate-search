import {
  GPS_MONTHLY_AVERAGE_LIMIT_MB,
  GPS_MONTHLY_TARGET_MB,
  GPS_SIM_TOTAL_DATA_MB,
  buildGpsUsageSummary
} from "@/lib/gps/usage";

export function GpsDataUsagePanel({ compact = false }: { compact?: boolean }) {
  const usage = buildGpsUsageSummary({
    currentMonthMb: null,
    totalMb: null,
    observedMonths: null
  });

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-black text-slate-950">1NCE SIM 通信量</h2>
        <p className="mt-1 text-sm text-slate-600">1NCE APIには未接続です。取得できていない値は「未取得」と表示します。</p>
      </div>
      <dl className={`mt-4 grid gap-3 text-sm ${compact ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
        <UsageValue label="今月の通信量" value={formatMb(usage.currentMonthMb)} />
        <UsageValue label="累計通信量" value={formatMb(usage.totalMb)} />
        <UsageValue label="通常運用目標" value={`${GPS_MONTHLY_TARGET_MB} MB/月 以下`} />
        <UsageValue label="5年間の月平均上限" value={`${GPS_MONTHLY_AVERAGE_LIMIT_MB} MB/月`} />
        <UsageValue label="5年間の総容量" value={`${GPS_SIM_TOTAL_DATA_MB} MB`} />
        <UsageValue label="5年間の使用予測" value={formatMb(usage.fiveYearProjectionMb)} />
        <UsageValue label="超過警告" value={usage.warning === "unavailable" ? "判定不可（未取得）" : warningLabel(usage.warning)} />
      </dl>
    </section>
  );
}
function UsageValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-3">
      <dt className="font-bold text-slate-500">{label}</dt>
      <dd className="mt-1 font-black text-slate-950">{value}</dd>
    </div>
  );
}

function formatMb(value: number | null) {
  return value === null ? "未取得" : `${value.toFixed(2)} MB`;
}

function warningLabel(warning: Exclude<ReturnType<typeof buildGpsUsageSummary>["warning"], "unavailable">) {
  return {
    within_target: "目標内",
    over_target: "月間目標超過",
    over_average_limit: "月平均上限超過",
    over_total_limit: "総容量超過"
  }[warning];
}
