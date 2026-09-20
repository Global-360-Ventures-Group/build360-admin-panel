/**
 * The coupon fixture.
 *
 * Fourteen campaigns standing in for an admin voucher API that does not exist
 * — see the note at the top of `./types` for exactly what the API does and
 * does not have.
 *
 * `usageCount` and `discountGiven` are **lifetime** figures, the same
 * arrangement the customer fixture uses for `lifetimeOrders`: they cover the
 * campaign's whole run, most of which predates the thirty orders in the orders
 * fixture. The detail screen shows the orders-fixture redemptions separately
 * and calls them recent, so the shorter list never contradicts the larger
 * number. That join happens in the route — this file does not import orders.
 */

import { SAMPLE_TODAY } from "@/lib/fixtures";

import {
  ALL,
  COUPON_ENDING_SOON_DAYS,
  COUPON_PAGE_SIZE_DEFAULT,
  COUPON_STATUSES,
  daysUntilEnd,
  isLive,
  sortCoupons,
  type Audience,
  type Coupon,
  type CouponPage,
  type CouponSort,
  type CouponStatus,
  type DiscountType,
} from "./types";

/* -------------------------------------------------------------------------- */
/* The campaigns                                                              */
/* -------------------------------------------------------------------------- */

const SAMPLE_COUPONS: Coupon[] = [
  {
    id: "cpn_sept10",
    code: "SEPT10",
    name: "September 10% off",
    description: "Ten percent off any order over ৳5,000 for the whole month.",
    audience: "PUBLIC",
    discountType: "PERCENTAGE",
    discountValue: 10,
    scopeType: "ALL",
    scopeLabel: "Everything",
    minimumOrderAmount: 5_000,
    maximumDiscountAmount: 5_000,
    startDate: "2026-09-01T00:00:00",
    endDate: "2026-09-30T23:59:00",
    usageLimit: 500,
    usageCount: 138,
    perCustomerLimit: 2,
    issuedTo: null,
    status: "ACTIVE",
    discountGiven: 412_000,
    createdAt: "2026-08-26T11:20:00",
    createdBy: "Nadia H.",
  },
  {
    id: "cpn_bulksteel",
    code: "BULKSTEEL",
    name: "Bulk steel rebate",
    description:
      "Flat ৳6,000 off rod and angle orders over ৳100,000. Runs alongside the mill's own quarterly rebate.",
    audience: "PUBLIC",
    discountType: "FIXED_AMOUNT",
    discountValue: 6_000,
    scopeType: "CATEGORY",
    scopeLabel: "Steel & Rods",
    minimumOrderAmount: 100_000,
    maximumDiscountAmount: null,
    startDate: "2026-08-15T00:00:00",
    endDate: "2026-10-15T23:59:00",
    usageLimit: 100,
    usageCount: 31,
    perCustomerLimit: 3,
    issuedTo: null,
    status: "ACTIVE",
    discountGiven: 214_000,
    createdAt: "2026-08-11T09:05:00",
    createdBy: "Rafiq A.",
  },
  {
    id: "cpn_bulk200",
    code: "BULK200",
    name: "200-bag cement deal",
    description: "৳8,000 off cement orders over ৳90,000. Depot pickup included.",
    audience: "PUBLIC",
    discountType: "FIXED_AMOUNT",
    discountValue: 8_000,
    scopeType: "CATEGORY",
    scopeLabel: "Cement",
    minimumOrderAmount: 90_000,
    maximumDiscountAmount: null,
    startDate: "2026-09-05T00:00:00",
    endDate: "2026-09-25T23:59:00",
    usageLimit: 60,
    usageCount: 22,
    perCustomerLimit: null,
    issuedTo: null,
    status: "ACTIVE",
    discountGiven: 176_000,
    createdAt: "2026-09-01T14:42:00",
    createdBy: "Nadia H.",
  },
  {
    id: "cpn_tile15",
    code: "TILE15",
    name: "Tile clearance 15%",
    description:
      "Fifteen percent off tiles, capped at ৳8,000. Clearing the 2025 batches before the new shades land.",
    audience: "PUBLIC",
    discountType: "PERCENTAGE",
    discountValue: 15,
    scopeType: "CATEGORY",
    scopeLabel: "Tiles",
    minimumOrderAmount: 10_000,
    maximumDiscountAmount: 8_000,
    startDate: "2026-09-18T00:00:00",
    endDate: "2026-09-24T23:59:00",
    usageLimit: 200,
    usageCount: 11,
    perCustomerLimit: 1,
    issuedTo: null,
    status: "ACTIVE",
    discountGiven: 41_300,
    createdAt: "2026-09-16T16:10:00",
    createdBy: "Shamim R.",
  },
  {
    id: "cpn_freeship",
    code: "FREESHIP",
    name: "Free delivery over ৳20,000",
    description:
      "Standing offer: no delivery charge on any order over ৳20,000. No redemption cap.",
    audience: "PUBLIC",
    discountType: "FREE_DELIVERY",
    discountValue: 0,
    scopeType: "ALL",
    scopeLabel: "Everything",
    minimumOrderAmount: 20_000,
    maximumDiscountAmount: null,
    startDate: "2026-09-10T00:00:00",
    endDate: "2026-10-10T23:59:00",
    usageLimit: null,
    usageCount: 96,
    perCustomerLimit: null,
    issuedTo: null,
    status: "ACTIVE",
    discountGiven: 78_400,
    createdAt: "2026-09-08T10:33:00",
    createdBy: "Rafiq A.",
  },
  {
    id: "cpn_welcome500",
    code: "WELCOME500",
    name: "New customer ৳500",
    description:
      "Issued automatically on registration. One use per account, first order only.",
    audience: "TARGETED",
    discountType: "FIXED_AMOUNT",
    discountValue: 500,
    scopeType: "ALL",
    scopeLabel: "Everything",
    minimumOrderAmount: 3_000,
    maximumDiscountAmount: null,
    startDate: "2026-06-01T00:00:00",
    endDate: "2026-12-31T23:59:00",
    usageLimit: null,
    usageCount: 386,
    perCustomerLimit: 1,
    issuedTo: 1_240,
    status: "ACTIVE",
    discountGiven: 193_000,
    createdAt: "2026-05-28T13:00:00",
    createdBy: "Rafiq A.",
  },
  {
    id: "cpn_dealer5",
    code: "DEALER5",
    name: "Dealer loyalty 5%",
    description:
      "Standing five percent for the dealer book, capped at ৳15,000 an order. Reviewed each quarter.",
    audience: "TARGETED",
    discountType: "PERCENTAGE",
    discountValue: 5,
    scopeType: "ALL",
    scopeLabel: "Everything",
    minimumOrderAmount: 50_000,
    maximumDiscountAmount: 15_000,
    startDate: "2026-01-01T00:00:00",
    endDate: "2026-12-31T23:59:00",
    usageLimit: null,
    usageCount: 173,
    perCustomerLimit: null,
    issuedTo: 48,
    status: "ACTIVE",
    discountGiven: 892_000,
    createdAt: "2025-12-18T15:45:00",
    createdBy: "Nadia H.",
  },
  {
    id: "cpn_brick1000",
    code: "BRICK1000",
    name: "Brick bulk ৳1,000",
    description: "৳1,000 off brick orders over ৳40,000 through the dry season.",
    audience: "PUBLIC",
    discountType: "FIXED_AMOUNT",
    discountValue: 1_000,
    scopeType: "CATEGORY",
    scopeLabel: "Bricks & Blocks",
    minimumOrderAmount: 40_000,
    maximumDiscountAmount: null,
    startDate: "2026-09-12T00:00:00",
    endDate: "2026-11-30T23:59:00",
    usageLimit: 300,
    usageCount: 27,
    perCustomerLimit: 5,
    issuedTo: null,
    status: "ACTIVE",
    discountGiven: 27_000,
    createdAt: "2026-09-09T08:50:00",
    createdBy: "Shamim R.",
  },

  /* Not running yet. */

  {
    id: "cpn_ramadan26",
    code: "RAMADAN26",
    name: "Ramadan 2026 campaign",
    description:
      "Twelve percent off everything, capped at ৳6,000. Approved, waiting on the start date.",
    audience: "PUBLIC",
    discountType: "PERCENTAGE",
    discountValue: 12,
    scopeType: "ALL",
    scopeLabel: "Everything",
    minimumOrderAmount: 8_000,
    maximumDiscountAmount: 6_000,
    startDate: "2026-10-05T00:00:00",
    endDate: "2026-11-05T23:59:00",
    usageLimit: 1_000,
    usageCount: 0,
    perCustomerLimit: 2,
    issuedTo: null,
    status: "SCHEDULED",
    discountGiven: 0,
    createdAt: "2026-09-14T12:15:00",
    createdBy: "Nadia H.",
  },
  {
    id: "cpn_siteopen",
    code: "SITEOPEN",
    name: "Site opening 20%",
    description:
      "One-off for the twelve accounts opening sites in October. Capped at ৳20,000 each.",
    audience: "TARGETED",
    discountType: "PERCENTAGE",
    discountValue: 20,
    scopeType: "ALL",
    scopeLabel: "Everything",
    minimumOrderAmount: 100_000,
    maximumDiscountAmount: 20_000,
    startDate: "2026-10-01T00:00:00",
    endDate: "2026-10-31T23:59:00",
    usageLimit: 12,
    usageCount: 0,
    perCustomerLimit: 1,
    issuedTo: 12,
    status: "SCHEDULED",
    discountGiven: 0,
    createdAt: "2026-09-19T17:30:00",
    createdBy: "Shamim R.",
  },

  /* Switched off, used up, or over. */

  {
    id: "cpn_winback750",
    code: "WINBACK750",
    name: "Win-back ৳750",
    description:
      "Issued to accounts with no order in six months. Paused while the dormant list is rebuilt.",
    audience: "TARGETED",
    discountType: "FIXED_AMOUNT",
    discountValue: 750,
    scopeType: "ALL",
    scopeLabel: "Everything",
    minimumOrderAmount: 5_000,
    maximumDiscountAmount: null,
    startDate: "2026-08-20T00:00:00",
    endDate: "2026-10-20T23:59:00",
    usageLimit: 96,
    usageCount: 18,
    perCustomerLimit: 1,
    issuedTo: 96,
    status: "PAUSED",
    discountGiven: 13_500,
    createdAt: "2026-08-18T09:25:00",
    createdBy: "Rafiq A.",
  },
  {
    id: "cpn_paintday",
    code: "PAINTDAY",
    name: "Paint day ৳1,000 off",
    description:
      "Hit its 150-redemption cap eleven days early. Dates still run to the end of the month.",
    audience: "PUBLIC",
    discountType: "FIXED_AMOUNT",
    discountValue: 1_000,
    scopeType: "CATEGORY",
    scopeLabel: "Paint & Finishes",
    minimumOrderAmount: 15_000,
    maximumDiscountAmount: null,
    startDate: "2026-09-02T00:00:00",
    endDate: "2026-09-30T23:59:00",
    usageLimit: 150,
    usageCount: 150,
    perCustomerLimit: 1,
    issuedTo: null,
    status: "EXHAUSTED",
    discountGiven: 150_000,
    createdAt: "2026-08-30T10:40:00",
    createdBy: "Shamim R.",
  },
  {
    id: "cpn_monsoon8",
    code: "MONSOON8",
    name: "Monsoon 8% off",
    description: "Ran through the wet season. Best-performing campaign this year.",
    audience: "PUBLIC",
    discountType: "PERCENTAGE",
    discountValue: 8,
    scopeType: "ALL",
    scopeLabel: "Everything",
    minimumOrderAmount: 5_000,
    maximumDiscountAmount: 4_000,
    startDate: "2026-06-15T00:00:00",
    endDate: "2026-08-31T23:59:00",
    usageLimit: 400,
    usageCount: 212,
    perCustomerLimit: 2,
    issuedTo: null,
    status: "EXPIRED",
    discountGiven: 604_000,
    createdAt: "2026-06-10T11:55:00",
    createdBy: "Nadia H.",
  },
  {
    id: "cpn_rod12free",
    code: "ROD12FREE",
    name: "12mm rod free delivery",
    description:
      "Free delivery on 12mm rod orders over ৳20,000. Single-product scope.",
    audience: "PUBLIC",
    discountType: "FREE_DELIVERY",
    discountValue: 0,
    scopeType: "PRODUCT",
    scopeLabel: "Steel Rod 12mm — BSRM",
    minimumOrderAmount: 20_000,
    maximumDiscountAmount: null,
    startDate: "2026-07-01T00:00:00",
    endDate: "2026-08-15T23:59:00",
    usageLimit: 80,
    usageCount: 54,
    perCustomerLimit: 2,
    issuedTo: null,
    status: "EXPIRED",
    discountGiven: 47_200,
    createdAt: "2026-06-27T14:05:00",
    createdBy: "Rafiq A.",
  },
];

/* -------------------------------------------------------------------------- */
/* Querying                                                                   */
/* -------------------------------------------------------------------------- */

export type CouponFilters = {
  search: string;
  status: CouponStatus | typeof ALL;
  discountType: DiscountType | typeof ALL;
  audience: Audience | typeof ALL;
  sort: CouponSort;
  /** 1-based, as it appears in the URL. */
  page: number;
};

export type StatusCounts = Record<CouponStatus | typeof ALL, number>;

export type CouponListing = {
  coupons: CouponPage;
  /** Counted *before* the status filter, so the tabs never read zero. */
  counts: StatusCounts;
};

function matchesSearch(coupon: Coupon, search: string): boolean {
  if (!search) return true;

  const needle = search.toLowerCase();
  return (
    coupon.code.toLowerCase().includes(needle) ||
    coupon.name.toLowerCase().includes(needle) ||
    coupon.scopeLabel.toLowerCase().includes(needle)
  );
}

/**
 * One page of coupons.
 *
 * Same URL contract as every other list in the panel, so swapping in a real
 * endpoint is a change of body, not of interface.
 */
export function listSampleCoupons(filters: CouponFilters): CouponListing {
  // Everything except the status filter, so the tab counts stay meaningful
  // while a status is selected.
  const scoped = SAMPLE_COUPONS.filter(
    (coupon) =>
      matchesSearch(coupon, filters.search) &&
      (filters.discountType === ALL ||
        coupon.discountType === filters.discountType) &&
      (filters.audience === ALL || coupon.audience === filters.audience),
  );

  const counts = { ALL: scoped.length } as StatusCounts;
  for (const status of COUPON_STATUSES) counts[status] = 0;
  for (const coupon of scoped) counts[coupon.status] += 1;

  const matched =
    filters.status === ALL
      ? scoped
      : scoped.filter((coupon) => coupon.status === filters.status);

  const ordered = sortCoupons(matched, filters.sort);

  const size = COUPON_PAGE_SIZE_DEFAULT;
  const totalPages = Math.max(1, Math.ceil(ordered.length / size));
  const start = (filters.page - 1) * size;

  return {
    coupons: {
      // Left unclamped on purpose: a page past the end comes back empty, which
      // is what sends the visitor to the last real page.
      content: ordered.slice(start, start + size),
      page: filters.page - 1,
      size,
      totalElements: ordered.length,
      totalPages,
      first: filters.page <= 1,
      last: filters.page >= totalPages,
    },
    counts,
  };
}

/** One coupon, or null. Stands in for `GET /admin/vouchers/{id}`. */
export function findSampleCoupon(id: string): Coupon | null {
  return SAMPLE_COUPONS.find((coupon) => coupon.id === id) ?? null;
}

export type CouponSummary = {
  active: number;
  endingSoon: number;
  redemptions: number;
  discountGiven: number;
};

/**
 * The four headline numbers.
 *
 * Read over the whole fixture, never the current filter — these describe the
 * promotion book, and a number that moved when you typed in the search box
 * would be describing the search box.
 */
export function sampleCouponSummary(): CouponSummary {
  const live = SAMPLE_COUPONS.filter((coupon) => isLive(coupon.status));

  return {
    active: live.length,
    // Only live coupons can be "ending soon": a scheduled or paused campaign
    // running past its date is a different problem, and not an urgent one.
    endingSoon: live.filter(
      (coupon) =>
        daysUntilEnd(coupon, SAMPLE_TODAY) <= COUPON_ENDING_SOON_DAYS,
    ).length,
    redemptions: SAMPLE_COUPONS.reduce(
      (total, coupon) => total + coupon.usageCount,
      0,
    ),
    discountGiven: SAMPLE_COUPONS.reduce(
      (total, coupon) => total + coupon.discountGiven,
      0,
    ),
  };
}
