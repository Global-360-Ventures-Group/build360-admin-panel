/**
 * Report models.
 *
 * **The API has no analytics of any kind** — no report, metric, summary or
 * aggregate endpoint anywhere in the spec, and no `REPORT_*` permission.
 *
 * Unlike the other fixture-backed screens, though, this one invents **no
 * data**. Every number here is aggregated from the orders, refunds and
 * inventory fixtures, so a figure on this page and the same figure on the
 * orders list are the same number by construction rather than by luck. When a
 * real reporting API arrives, `./sample-data` is replaced and these shapes
 * stand.
 *
 * That also means the report inherits the fixture's horizon: roughly four
 * weeks of orders. The longer ranges have no comparison period, and the screen
 * says so rather than dividing by zero.
 */

import type { OrderStatus, PaymentMethod } from "@/features/orders/types";

export type ReportRange = "7d" | "14d" | "30d" | "all";

export const REPORT_RANGES: ReportRange[] = ["7d", "14d", "30d", "all"];

export const reportRangeLabels: Record<ReportRange, string> = {
  "7d": "Last 7 days",
  "14d": "Last 14 days",
  "30d": "Last 30 days",
  all: "All time",
};

/** How many days each range covers. `all` has no fixed length. */
export const reportRangeDays: Record<ReportRange, number | null> = {
  "7d": 7,
  "14d": 14,
  "30d": 30,
  all: null,
};

/**
 * The default.
 *
 * Fourteen days rather than thirty: the orders fixture only holds four weeks,
 * so a thirty-day window leaves nothing to compare against and every delta
 * reads "no prior data". Fourteen gives both a full chart and a real previous
 * period.
 */
export const REPORT_RANGE_DEFAULT: ReportRange = "14d";

export function parseReportRange(value: string | undefined): ReportRange {
  return REPORT_RANGES.includes(value as ReportRange)
    ? (value as ReportRange)
    : REPORT_RANGE_DEFAULT;
}

/** One day on the revenue chart. Days with no orders are present, at zero. */
export type DailyPoint = {
  /** `YYYY-MM-DD`. */
  date: string;
  revenue: number;
  orders: number;
};

/** A labelled magnitude — the shape every bar list on this page takes. */
export type Slice = {
  key: string;
  label: string;
  value: number;
  /** Orders behind the value, for the table view. */
  count: number;
};

export type StatusSlice = {
  status: OrderStatus;
  count: number;
  value: number;
};

export type PaymentSlice = {
  /** Null for the folded "Other" slot — see `buildSampleReport`. */
  method: PaymentMethod | null;
  label: string;
  value: number;
  count: number;
};

export type TopProduct = {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  units: number;
  revenue: number;
  /** Null when the product is not tracked in the inventory fixture. */
  inventoryId: string | null;
  available: number | null;
};

/**
 * One figure and its comparison.
 *
 * `previous` is null when the range reaches back past the fixture's first
 * order — there is genuinely nothing to compare against, and inventing a
 * percentage from a zero denominator is how dashboards learn to lie.
 */
export type Kpi = {
  value: number;
  previous: number | null;
};

export type ReportData = {
  range: ReportRange;
  /** Inclusive bounds of the window, `YYYY-MM-DD`. */
  from: string;
  to: string;
  /** Null when the previous window falls entirely outside the fixture. */
  comparedWith: { from: string; to: string } | null;

  revenue: Kpi;
  orders: Kpi;
  averageOrderValue: Kpi;
  refunded: Kpi;

  daily: DailyPoint[];
  byCategory: Slice[];
  byStatus: StatusSlice[];
  byPayment: PaymentSlice[];
  byDivision: Slice[];
  topProducts: TopProduct[];
};

/**
 * Percentage change, or null when there is nothing to compare against.
 *
 * Also null when the previous value is zero: "up from nothing" is not a
 * percentage, and rendering ∞% or 100% would both be inventions.
 */
export function percentChange(kpi: Kpi): number | null {
  if (kpi.previous === null || kpi.previous === 0) return null;

  return Math.round(((kpi.value - kpi.previous) / kpi.previous) * 100);
}

/** A round number at or above `value`: 1, 2 or 5 times a power of ten. */
function niceNumber(value: number): number {
  if (value <= 0) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;

  return step * magnitude;
}

/**
 * A y-axis a reader recognises.
 *
 * The **step** is rounded first and the top follows from it, rather than the
 * other way round. Rounding the top and then dividing it by a fixed tick count
 * is the usual mistake: a 483,140 peak snaps to 500,000, which over four ticks
 * gives 125,000 — a step nobody reads as a round number. Rounding the step
 * gives 100,000 and a five-tick axis that reads 1L, 2L, 3L, 4L, 5L.
 */
export function niceScale(
  maxValue: number,
  targetTicks = 4,
): { max: number; step: number; ticks: number } {
  const step = niceNumber(Math.max(1, maxValue) / targetTicks);
  const ticks = Math.max(1, Math.ceil(Math.max(1, maxValue) / step));

  return { max: step * ticks, step, ticks };
}

/**
 * "৳4.8L" / "৳2L" / "৳62k" / "৳940" — compact taka for an axis tick or a tile.
 *
 * A whole number keeps no decimal: an axis that reads 2.0L, 4.0L, 6.0L is
 * carrying three characters of nothing, and round ticks are the whole point of
 * `niceScale`.
 */
export function compactCurrency(amount: number): string {
  const short = (value: number, suffix: string) => {
    const rounded = value >= 10 ? Math.round(value) : Number(value.toFixed(1));
    return `৳${rounded}${suffix}`;
  };

  if (Math.abs(amount) >= 100_000) return short(amount / 100_000, "L");
  if (Math.abs(amount) >= 1_000) return short(amount / 1_000, "k");

  return `৳${Math.round(amount)}`;
}
