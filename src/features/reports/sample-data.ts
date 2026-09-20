/**
 * The report aggregation.
 *
 * **This file invents nothing.** Every figure is summed from the orders,
 * refunds and inventory fixtures, so the revenue on this page and the totals on
 * the orders list are the same number by construction — a report that
 * disagreed with the list it reports on is worse than no report.
 *
 * It sits at the bottom of the fixture graph and is imported by nothing:
 *
 *     inventory ─┐
 *                ├→ orders ← refunds
 *     customers ─┘      ↑        ↑
 *                       └── reports ──┘
 *
 * Two conventions worth keeping:
 *
 * 1. **Revenue excludes cancelled orders.** Money that was never collected is
 *    not revenue. Refunds are reported separately rather than netted off, so a
 *    reader can see both the gross and the giveback.
 * 2. **Days with no orders are present, at zero.** Dropping empty days would
 *    compress the x-axis and draw a line that implies trading on days the
 *    warehouse was shut.
 */

import {
  catalogForProductId,
  inventoryForProductId,
} from "@/features/inventory/sample-data";
import { availableStock } from "@/features/inventory/types";
import { allSampleOrders } from "@/features/orders/sample-data";
import {
  ORDER_STATUSES,
  paymentMethodLabels,
  type Order,
  type PaymentMethod,
} from "@/features/orders/types";
import { allSampleRefunds } from "@/features/refunds/sample-data";
import { SAMPLE_TODAY, shiftDateTime } from "@/lib/fixtures";

import {
  reportRangeDays,
  type DailyPoint,
  type Kpi,
  type PaymentSlice,
  type ReportData,
  type ReportRange,
  type Slice,
  type StatusSlice,
  type TopProduct,
} from "./types";

/** How many payment methods get their own slot before the tail folds up. */
const PAYMENT_SLOTS = 4;

/** How many products the table lists. */
const TOP_PRODUCT_COUNT = 8;

/** `YYYY-MM-DD`, `days` before the fixtures' today. */
function dayBefore(days: number): string {
  return shiftDateTime(`${SAMPLE_TODAY}T12:00:00`, -days * 24 * 60).slice(0, 10);
}

/** Every date from `from` to `to` inclusive, as `YYYY-MM-DD`. */
function daysBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  let cursor = `${from}T12:00:00`;

  while (cursor.slice(0, 10) <= to) {
    dates.push(cursor.slice(0, 10));
    cursor = shiftDateTime(cursor, 24 * 60);
  }

  return dates;
}

/** Orders placed on a day inside `[from, to]`, both inclusive. */
function inWindow(orders: Order[], from: string, to: string): Order[] {
  return orders.filter((order) => {
    const day = order.createdAt.slice(0, 10);
    return day >= from && day <= to;
  });
}

/** Cancelled orders are excluded: that money was never collected. */
function revenueOf(orders: Order[]): number {
  return orders
    .filter((order) => order.orderStatus !== "CANCELLED")
    .reduce((total, order) => total + order.totalAmount, 0);
}

function sellingOrders(orders: Order[]): Order[] {
  return orders.filter((order) => order.orderStatus !== "CANCELLED");
}

/**
 * Everything the reports screen shows, for one window.
 *
 * The window is `[from, to]` in whole days, ending on the fixtures' today. The
 * comparison window is the same length immediately before it, and is dropped
 * entirely when it reaches back past the first order in the fixture — see the
 * note on `Kpi`.
 */
export function buildSampleReport(range: ReportRange): ReportData {
  const orders = allSampleOrders();
  const refunds = allSampleRefunds();

  const earliest = orders
    .map((order) => order.createdAt.slice(0, 10))
    .sort()[0];

  const days = reportRangeDays[range];
  const to = SAMPLE_TODAY;
  const from = days === null ? earliest : dayBefore(days - 1);

  const current = inWindow(orders, from, to);

  // The same length again, immediately before the window.
  const previousTo = days === null ? null : dayBefore(days);
  const previousFrom = days === null ? null : dayBefore(days * 2 - 1);
  const hasComparison =
    previousFrom !== null && previousTo !== null && previousTo >= earliest;

  const previous = hasComparison
    ? inWindow(orders, previousFrom, previousTo)
    : null;

  const kpi = (
    pick: (window: Order[]) => number,
  ): Kpi => ({
    value: pick(current),
    previous: previous === null ? null : pick(previous),
  });

  const refundedIn = (windowFrom: string, windowTo: string) =>
    refunds
      .filter((request) => {
        if (request.status !== "REFUNDED" || request.resolvedAt === null) {
          return false;
        }
        const day = request.resolvedAt.slice(0, 10);
        return day >= windowFrom && day <= windowTo;
      })
      .reduce((total, request) => total + (request.approvedAmount ?? 0), 0);

  return {
    range,
    from,
    to,
    comparedWith: hasComparison
      ? { from: previousFrom, to: previousTo }
      : null,

    revenue: kpi(revenueOf),
    orders: kpi((window) => window.length),
    averageOrderValue: kpi((window) => {
      const selling = sellingOrders(window);
      return selling.length === 0
        ? 0
        : Math.round(revenueOf(selling) / selling.length);
    }),
    refunded: {
      value: refundedIn(from, to),
      previous: hasComparison ? refundedIn(previousFrom, previousTo) : null,
    },

    daily: dailySeries(current, from, to),
    byCategory: byCategory(current),
    byStatus: byStatus(current),
    byPayment: byPayment(current),
    byDivision: byDivision(current),
    topProducts: topProducts(current),
  };
}

/** One point per day in the window, including the days nothing was sold. */
function dailySeries(orders: Order[], from: string, to: string): DailyPoint[] {
  const byDay = new Map<string, { revenue: number; orders: number }>();

  for (const order of orders) {
    const day = order.createdAt.slice(0, 10);
    const bucket = byDay.get(day) ?? { revenue: 0, orders: 0 };

    bucket.orders += 1;
    if (order.orderStatus !== "CANCELLED") bucket.revenue += order.totalAmount;

    byDay.set(day, bucket);
  }

  return daysBetween(from, to).map((date) => ({
    date,
    revenue: byDay.get(date)?.revenue ?? 0,
    orders: byDay.get(date)?.orders ?? 0,
  }));
}

/**
 * Revenue by catalogue category, biggest first.
 *
 * Priced at line value rather than a share of `totalAmount`: a voucher
 * discount applies to the order, not to a category, and splitting it pro-rata
 * would invent a precision the data does not have. The category totals
 * therefore sum to the *subtotal*, not to revenue, which is what the card's
 * subtitle says.
 */
function byCategory(orders: Order[]): Slice[] {
  const totals = new Map<string, { value: number; count: number }>();

  for (const order of sellingOrders(orders)) {
    const seen = new Set<string>();

    for (const item of order.items) {
      const product = catalogForProductId(item.productId);
      if (!product) continue;

      const bucket = totals.get(product.category) ?? { value: 0, count: 0 };
      bucket.value += item.lineTotal;
      // An order counts once per category, however many of its lines land
      // there — otherwise "orders" would count lines.
      if (!seen.has(product.category)) {
        bucket.count += 1;
        seen.add(product.category);
      }

      totals.set(product.category, bucket);
    }
  }

  return [...totals.entries()]
    .map(([label, bucket]) => ({ key: label, label, ...bucket }))
    .sort((a, b) => b.value - a.value);
}

/** Every status, in pipeline order, including the ones at zero. */
function byStatus(orders: Order[]): StatusSlice[] {
  return ORDER_STATUSES.map((status) => {
    const matching = orders.filter((order) => order.orderStatus === status);

    return {
      status,
      count: matching.length,
      value: matching.reduce((total, order) => total + order.totalAmount, 0),
    };
  });
}

/**
 * Revenue by payment method, top four plus a folded tail.
 *
 * The categorical palette has five slots and the skill's rule is that a ninth
 * hue is never generated — so the tail folds into "Other" rather than growing
 * the palette. With six methods in the fixture that is four named slots and
 * one fold.
 */
function byPayment(orders: Order[]): PaymentSlice[] {
  const totals = new Map<PaymentMethod, { value: number; count: number }>();

  for (const order of sellingOrders(orders)) {
    const bucket = totals.get(order.paymentMethod) ?? { value: 0, count: 0 };
    bucket.value += order.totalAmount;
    bucket.count += 1;
    totals.set(order.paymentMethod, bucket);
  }

  const ranked = [...totals.entries()]
    .map(([method, bucket]) => ({
      method,
      label: paymentMethodLabels[method],
      ...bucket,
    }))
    .sort((a, b) => b.value - a.value);

  const named: PaymentSlice[] = ranked.slice(0, PAYMENT_SLOTS);
  const tail = ranked.slice(PAYMENT_SLOTS);

  if (tail.length > 0) {
    named.push({
      method: null,
      label: tail.length === 1 ? tail[0].label : `Other (${tail.length})`,
      value: tail.reduce((total, one) => total + one.value, 0),
      count: tail.reduce((total, one) => total + one.count, 0),
    });
  }

  return named;
}

/** Revenue by the division the order shipped to, biggest first. */
function byDivision(orders: Order[]): Slice[] {
  const totals = new Map<string, { value: number; count: number }>();

  for (const order of sellingOrders(orders)) {
    const division = order.address.division;
    const bucket = totals.get(division) ?? { value: 0, count: 0 };

    bucket.value += order.totalAmount;
    bucket.count += 1;
    totals.set(division, bucket);
  }

  return [...totals.entries()]
    .map(([label, bucket]) => ({ key: label, label, ...bucket }))
    .sort((a, b) => b.value - a.value);
}

/**
 * The best-selling products, joined to what is left on the shelf.
 *
 * The join is the point: "we sold sixty of these and have four left" is the
 * one thing a sales report can tell a buyer that neither screen says alone.
 */
function topProducts(orders: Order[]): TopProduct[] {
  const totals = new Map<
    string,
    { name: string; unit: string; units: number; revenue: number }
  >();

  for (const order of sellingOrders(orders)) {
    for (const item of order.items) {
      const bucket = totals.get(item.productId) ?? {
        name: item.name,
        unit: item.unit,
        units: 0,
        revenue: 0,
      };

      bucket.units += item.quantity;
      bucket.revenue += item.lineTotal;
      totals.set(item.productId, bucket);
    }
  }

  return [...totals.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, TOP_PRODUCT_COUNT)
    .map(([productId, bucket]) => {
      const product = catalogForProductId(productId);
      const stock = inventoryForProductId(productId);

      return {
        productId,
        name: bucket.name,
        sku: product?.sku ?? "—",
        unit: bucket.unit,
        units: bucket.units,
        revenue: bucket.revenue,
        inventoryId: stock?.id ?? null,
        available: stock ? availableStock(stock) : null,
      };
    });
}
