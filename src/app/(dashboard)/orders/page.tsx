import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  listSampleOrders,
  sampleOrderSummary,
  type OrderFilters,
} from "@/features/orders/sample-data";
import { OrdersView } from "@/features/orders/orders-view";
import {
  ALL,
  parseDateRange,
  parseDeliveryMethod,
  parseOrderSort,
  parseOrderStatus,
  parsePaymentStatus,
} from "@/features/orders/types";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Orders · Build360 Admin",
};

/**
 * The orders list.
 *
 * **Not permission-gated, on purpose.** Every other screen calls
 * `hasPermission(user, …)` and `forbidden()`s, but the permission catalogue
 * has no `ORDER_*` code — there are no admin order endpoints for one to guard.
 * Gating on an invented `ORDER_VIEW` would lock every real account, including
 * SUPER_ADMIN, out of the screen. Sign-in is still required. When the API
 * ships its order permissions, the check goes here and `can` props go down to
 * the view, the way `ProductsPage` does it.
 */
export default async function OrdersPage({
  searchParams,
}: PageProps<"/orders">) {
  await requireUser();

  const params = await searchParams;

  const filters: OrderFilters = {
    search: firstValue(params.q)?.trim() ?? "",
    status: parseOrderStatus(firstValue(params.status)),
    payment: parsePaymentStatus(firstValue(params.payment)),
    method: parseDeliveryMethod(firstValue(params.method)),
    range: parseDateRange(firstValue(params.range)),
    sort: parseOrderSort(firstValue(params.sort)),
    // The URL is 1-based for humans; the page object is 0-based.
    page: Math.max(1, Number(firstValue(params.page)) || 1),
  };

  const { orders, counts } = listSampleOrders(filters);

  // A page past the end returns empty, which would render "No orders yet" over
  // a list that has plenty. Send the visitor to the last real page.
  if (
    orders.content.length === 0 &&
    orders.totalElements > 0 &&
    filters.page > orders.totalPages
  ) {
    redirect(ordersHref({ ...filters, page: orders.totalPages }));
  }

  return (
    <OrdersView
      orders={orders}
      counts={counts}
      summary={sampleOrderSummary()}
      filters={filters}
    />
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Mirrors `buildHref` in the view — same query contract, both directions. */
function ordersHref(filters: OrderFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.status !== ALL) params.set("status", filters.status);
  if (filters.payment !== ALL) params.set("payment", filters.payment);
  if (filters.method !== ALL) params.set("method", filters.method);
  if (filters.range !== "30d") params.set("range", filters.range);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));

  const queryString = params.toString();
  return queryString ? `/orders?${queryString}` : "/orders";
}
