export const GPS_SIM_TOTAL_DATA_MB = 500;
export const GPS_SIM_OPERATION_MONTHS = 60;
export const GPS_MONTHLY_TARGET_MB = 6.5;
export const GPS_MONTHLY_AVERAGE_LIMIT_MB = Number((GPS_SIM_TOTAL_DATA_MB / GPS_SIM_OPERATION_MONTHS).toFixed(2));

export type GpsUsageInput = {
  currentMonthMb: number | null;
  totalMb: number | null;
  observedMonths: number | null;
};

export type GpsUsageSummary = GpsUsageInput & {
  fiveYearProjectionMb: number | null;
  warning: "unavailable" | "within_target" | "over_target" | "over_average_limit" | "over_total_limit";
};

export function buildGpsUsageSummary(input: GpsUsageInput): GpsUsageSummary {
  const currentMonthMb = validNonNegative(input.currentMonthMb);
  const totalMb = validNonNegative(input.totalMb);
  const observedMonths = validPositive(input.observedMonths);
  const fiveYearProjectionMb =
    totalMb !== null && observedMonths !== null
      ? Number(((totalMb / observedMonths) * GPS_SIM_OPERATION_MONTHS).toFixed(2))
      : null;

  let warning: GpsUsageSummary["warning"] = "unavailable";
  if (totalMb !== null && totalMb > GPS_SIM_TOTAL_DATA_MB) warning = "over_total_limit";
  else if (currentMonthMb !== null && currentMonthMb > GPS_MONTHLY_AVERAGE_LIMIT_MB) warning = "over_average_limit";
  else if (currentMonthMb !== null && currentMonthMb > GPS_MONTHLY_TARGET_MB) warning = "over_target";
  else if (currentMonthMb !== null) warning = "within_target";

  return {
    currentMonthMb,
    totalMb,
    observedMonths,
    fiveYearProjectionMb,
    warning
  };
}
function validNonNegative(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function validPositive(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}
