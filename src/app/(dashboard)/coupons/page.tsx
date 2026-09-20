import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CouponsView } from "@/features/coupons/coupons-view";
import {
  listSampleCoupons,
  sampleCouponSummary,
  type CouponFilters,
} from "@/features/coupons/sample-data";
import {
  ALL,
  parseAudience,
  parseCouponSort,
  parseCouponStatus,
  parseDiscountType,
} from "@/features/coupons/types";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Coupons · Build360 Admin",
};

/**
 * The coupon book.
 *
 * **Not permission-gated, on purpose.** There is no `VOUCHER_*` or `COUPON_*`
 * code in the permission catalogue, because the API has no back-office voucher
 * operations for one to guard — gating on an invented code would lock out
 * every real account, SUPER_ADMIN included. Sign-in is still required.
 */
export default async function CouponsPage({
  searchParams,
}: PageProps<"/coupons">) {
  await requireUser();

  const params = await searchParams;

  const filters: CouponFilters = {
    search: firstValue(params.q)?.trim() ?? "",
    status: parseCouponStatus(firstValue(params.status)),
    discountType: parseDiscountType(firstValue(params.type)),
    audience: parseAudience(firstValue(params.audience)),
    sort: parseCouponSort(firstValue(params.sort)),
    // The URL is 1-based for humans; the page object is 0-based.
    page: Math.max(1, Number(firstValue(params.page)) || 1),
  };

  const { coupons, counts } = listSampleCoupons(filters);

  // A page past the end returns empty, which would render "No coupons yet"
  // over a book that has plenty. Send the visitor to the last real page.
  if (
    coupons.content.length === 0 &&
    coupons.totalElements > 0 &&
    filters.page > coupons.totalPages
  ) {
    redirect(couponsHref({ ...filters, page: coupons.totalPages }));
  }

  return (
    <CouponsView
      coupons={coupons}
      counts={counts}
      summary={sampleCouponSummary()}
      filters={filters}
    />
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Mirrors `buildHref` in the view — same query contract, both directions. */
function couponsHref(filters: CouponFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.status !== ALL) params.set("status", filters.status);
  if (filters.discountType !== ALL) params.set("type", filters.discountType);
  if (filters.audience !== ALL) params.set("audience", filters.audience);
  if (filters.sort !== "ending") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));

  const queryString = params.toString();
  return queryString ? `/coupons?${queryString}` : "/coupons";
}
