import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RefundsView } from "@/features/refunds/refunds-view";
import {
  listSampleRefunds,
  sampleRefundSummary,
  type RefundFilters,
} from "@/features/refunds/sample-data";
import {
  ALL,
  parseRefundKind,
  parseRefundReason,
  parseRefundSort,
  parseRefundStatus,
} from "@/features/refunds/types";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Refunds · Build360 Admin",
};

/**
 * The refund queue.
 *
 * **Not permission-gated, on purpose.** There is no `REFUND_*` code in the
 * permission catalogue because there is no refund resource for one to guard —
 * gating on an invented code would lock out every real account, SUPER_ADMIN
 * included. Sign-in is still required. See `@/features/refunds/types` for what
 * the API does and does not have.
 */
export default async function RefundsPage({
  searchParams,
}: PageProps<"/refunds">) {
  await requireUser();

  const params = await searchParams;

  const filters: RefundFilters = {
    search: firstValue(params.q)?.trim() ?? "",
    status: parseRefundStatus(firstValue(params.status)),
    kind: parseRefundKind(firstValue(params.kind)),
    reason: parseRefundReason(firstValue(params.reason)),
    sort: parseRefundSort(firstValue(params.sort)),
    // The URL is 1-based for humans; the page object is 0-based.
    page: Math.max(1, Number(firstValue(params.page)) || 1),
  };

  const { requests, counts } = listSampleRefunds(filters);

  // A page past the end returns empty, which would render "Nothing to refund"
  // over a queue that has plenty. Send the visitor to the last real page.
  if (
    requests.content.length === 0 &&
    requests.totalElements > 0 &&
    filters.page > requests.totalPages
  ) {
    redirect(refundsHref({ ...filters, page: requests.totalPages }));
  }

  return (
    <RefundsView
      requests={requests}
      counts={counts}
      summary={sampleRefundSummary()}
      filters={filters}
    />
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Mirrors `buildHref` in the view — same query contract, both directions. */
function refundsHref(filters: RefundFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.status !== ALL) params.set("status", filters.status);
  if (filters.kind !== ALL) params.set("kind", filters.kind);
  if (filters.reason !== ALL) params.set("reason", filters.reason);
  if (filters.sort !== "oldest-open") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));

  const queryString = params.toString();
  return queryString ? `/refunds?${queryString}` : "/refunds";
}
