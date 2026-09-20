/**
 * Coupon models.
 *
 * Unlike stock, vouchers **do** exist in the API — but only from the shopper's
 * side. There are exactly three operations: `GET /vouchers` (the signed-in
 * customer's own vouchers), `POST /checkout/apply-voucher` and
 * `DELETE /checkout/voucher`. Nothing lists every voucher, creates one, edits
 * one, pauses one, or reports on redemptions, and there is no `VOUCHER_*` or
 * `COUPON_*` permission.
 *
 * So the *rule* below is real — `discountType`, `scopeType`, `audience`,
 * `minimumOrderAmount`, `maximumDiscountAmount` and `endDate` are copied
 * field-for-field from `VoucherSummaryResponse` — and everything an operator
 * needs on top of it is a proposal, marked `Not in the API` at its
 * declaration.
 *
 * One trap worth naming. `VoucherSummaryResponse.status` is
 * `AVAILABLE | USED | EXPIRED`, and that is **the asking customer's
 * relationship with the voucher**, not the voucher's own state — "used" means
 * *you* used it. An admin list needs the campaign's lifecycle instead, which is
 * what `CouponStatus` is. Wiring one to the other would be wrong in a way that
 * looks right.
 */

import type { Tone } from "@/lib/tone";

/** From `VoucherSummaryResponse.discountType`. */
export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_DELIVERY";

export const DISCOUNT_TYPES: DiscountType[] = [
  "PERCENTAGE",
  "FIXED_AMOUNT",
  "FREE_DELIVERY",
];

export const discountTypeLabels: Record<DiscountType, string> = {
  PERCENTAGE: "Percentage off",
  FIXED_AMOUNT: "Fixed amount off",
  FREE_DELIVERY: "Free delivery",
};

/** From `VoucherSummaryResponse.audience`. */
export type Audience = "PUBLIC" | "TARGETED";

export const AUDIENCES: Audience[] = ["PUBLIC", "TARGETED"];

export const audienceLabels: Record<Audience, string> = {
  PUBLIC: "Public",
  TARGETED: "Targeted",
};

export const audienceHints: Record<Audience, string> = {
  PUBLIC: "Anyone who knows the code can use it",
  TARGETED: "Only works for customers it was issued to",
};

/** From `VoucherSummaryResponse.scopeType`. */
export type ScopeType = "ALL" | "CATEGORY" | "PRODUCT";

export const scopeTypeLabels: Record<ScopeType, string> = {
  ALL: "Everything",
  CATEGORY: "Category",
  PRODUCT: "Product",
};

/**
 * Not in the API — see the note at the top of this file.
 *
 * The campaign's own lifecycle, which is what an operator manages.
 * `EXHAUSTED` is separate from `EXPIRED` on purpose: one ran out of budget,
 * the other ran out of time, and the fix is different.
 */
export type CouponStatus =
  | "SCHEDULED"
  | "ACTIVE"
  | "PAUSED"
  | "EXPIRED"
  | "EXHAUSTED";

export const COUPON_STATUSES: CouponStatus[] = [
  "SCHEDULED",
  "ACTIVE",
  "PAUSED",
  "EXPIRED",
  "EXHAUSTED",
];

export const couponStatusLabels: Record<CouponStatus, string> = {
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  PAUSED: "Paused",
  EXPIRED: "Expired",
  EXHAUSTED: "Used up",
};

export const couponStatusHints: Record<CouponStatus, string> = {
  SCHEDULED: "Starts on a future date; nobody can use it yet",
  ACTIVE: "Live at checkout right now",
  PAUSED: "Switched off by an admin, dates untouched",
  EXPIRED: "Past its end date",
  EXHAUSTED: "Hit its redemption limit",
};

/**
 * Status colour.
 *
 * Only `ACTIVE` is green: it is the one state that is spending money right
 * now. Everything else is a shade of "not running", and none of them is an
 * error — so none of them is red.
 */
export const couponStatusTone: Record<CouponStatus, Tone> = {
  SCHEDULED: "info",
  ACTIVE: "success",
  PAUSED: "warning",
  EXPIRED: "neutral",
  EXHAUSTED: "violet",
};

export type Coupon = {
  id: string;
  /* Fields `VoucherSummaryResponse` really has. */
  code: string;
  name: string;
  description: string;
  audience: Audience;
  discountType: DiscountType;
  /** Percent for `PERCENTAGE`, taka for `FIXED_AMOUNT`, 0 for free delivery. */
  discountValue: number;
  scopeType: ScopeType;
  /** Null when there is no minimum. */
  minimumOrderAmount: number | null;
  /** Caps a percentage discount. Null when uncapped or not applicable. */
  maximumDiscountAmount: number | null;
  endDate: string;

  /* Everything below is a proposal — the API has no equivalent. */

  /** Not in the API: what the scope actually points at, in words. */
  scopeLabel: string;
  /** Not in the API: `VoucherSummaryResponse` has no start date. */
  startDate: string;
  /** Not in the API. Null means unlimited redemptions. */
  usageLimit: number | null;
  /** Not in the API: how many times it has actually been redeemed. */
  usageCount: number;
  /** Not in the API. Null means no per-customer cap. */
  perCustomerLimit: number | null;
  /** Not in the API: for `TARGETED`, how many customers hold it. */
  issuedTo: number | null;
  /** Not in the API — see `CouponStatus`. */
  status: CouponStatus;
  /** Not in the API: total taka discounted across every redemption. */
  discountGiven: number;
  /** Not in the API. */
  createdAt: string;
  createdBy: string;
};

/** One page of coupons, shaped like every other paged response here. */
export type CouponPage = {
  content: Coupon[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export const COUPON_PAGE_SIZE_DEFAULT = 12;

/** Sentinel for "no filter", which a select cannot carry as "". */
export const ALL = "ALL";

/** "10%", "৳500 off", "Free delivery" — the rule in three words or fewer. */
export function discountLabel(coupon: Coupon): string {
  switch (coupon.discountType) {
    case "PERCENTAGE":
      return `${coupon.discountValue}%`;
    case "FIXED_AMOUNT":
      return `৳${coupon.discountValue.toLocaleString("en-US")} off`;
    case "FREE_DELIVERY":
      return "Free delivery";
  }
}

/** True while the coupon can actually be redeemed at checkout. */
export function isLive(status: CouponStatus): boolean {
  return status === "ACTIVE";
}

/**
 * How much of the redemption budget is gone, as a percentage.
 *
 * Returns null for an unlimited coupon — there is no "80% used" when there is
 * no denominator, and rendering one would invent a ceiling that does not
 * exist.
 */
export function usagePercent(coupon: Coupon): number | null {
  if (coupon.usageLimit === null) return null;
  if (coupon.usageLimit <= 0) return 100;

  return Math.min(100, Math.round((coupon.usageCount / coupon.usageLimit) * 100));
}

/** The average taka taken off an order that used this code. */
export function averageDiscount(coupon: Coupon): number | null {
  if (coupon.usageCount === 0) return null;

  return Math.round(coupon.discountGiven / coupon.usageCount);
}

/**
 * Whole days until the end date, measured from the fixtures' today.
 *
 * Negative once it is past, which is what makes "ends in 3 days" and "ended 9
 * days ago" the same calculation.
 */
export function daysUntilEnd(coupon: Coupon, today: string): number {
  const end = new Date(`${coupon.endDate.slice(0, 10)}T00:00:00`);
  const from = new Date(`${today}T00:00:00`);

  return Math.round((end.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

/** Inside this many days of its end date, a live coupon is worth flagging. */
export const COUPON_ENDING_SOON_DAYS = 7;

export type CouponSort = "ending" | "newest" | "used-desc" | "given-desc";

export const COUPON_SORTS: CouponSort[] = [
  "ending",
  "newest",
  "used-desc",
  "given-desc",
];

export const couponSortLabels: Record<CouponSort, string> = {
  ending: "Ending soonest",
  newest: "Newest first",
  "used-desc": "Most redeemed",
  "given-desc": "Most discount given",
};

export function parseCouponSort(value: string | undefined): CouponSort {
  return COUPON_SORTS.includes(value as CouponSort)
    ? (value as CouponSort)
    : "ending";
}

export function parseCouponStatus(
  value: string | undefined,
): CouponStatus | typeof ALL {
  return COUPON_STATUSES.includes(value as CouponStatus)
    ? (value as CouponStatus)
    : ALL;
}

export function parseDiscountType(
  value: string | undefined,
): DiscountType | typeof ALL {
  return DISCOUNT_TYPES.includes(value as DiscountType)
    ? (value as DiscountType)
    : ALL;
}

export function parseAudience(
  value: string | undefined,
): Audience | typeof ALL {
  return AUDIENCES.includes(value as Audience) ? (value as Audience) : ALL;
}

export function sortCoupons(coupons: Coupon[], sort: CouponSort): Coupon[] {
  const sorted = [...coupons];

  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "used-desc":
      return sorted.sort((a, b) => b.usageCount - a.usageCount);
    case "given-desc":
      return sorted.sort((a, b) => b.discountGiven - a.discountGiven);
    case "ending":
    default:
      // The default this screen opens on: whatever is live and closest to its
      // end date, with everything already finished pushed behind it.
      return sorted.sort((a, b) => {
        const liveA = isLive(a.status);
        const liveB = isLive(b.status);
        if (liveA !== liveB) return liveA ? -1 : 1;

        return a.endDate.localeCompare(b.endDate);
      });
  }
}
