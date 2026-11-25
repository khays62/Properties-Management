import type { ReportMetricValue } from "../types";

function toFiniteNumber(value: ReportMetricValue | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatCount(value: ReportMetricValue | undefined): string {
  const parsed = toFiniteNumber(value);
  return parsed === null
    ? "—"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
        parsed,
      );
}

export function formatAmount(value: ReportMetricValue | undefined): string {
  const parsed = toFiniteNumber(value);
  return parsed === null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(parsed);
}

export function formatPercentage(
  value: ReportMetricValue | undefined,
): string {
  const parsed = toFiniteNumber(value);
  return parsed === null
    ? "—"
    : `${new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(parsed)}%`;
}
