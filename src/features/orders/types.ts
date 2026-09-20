/**
 * Order models.
 *
 * **There is no admin order API yet.** The spec has only the storefront side —
 * `POST /orders`, `GET /orders`, `GET /orders/{id}`, `/orders/{id}/cancel` and
 * `/orders/{id}/confirm-cod` — all scoped to the signed-in customer or a guest
 * id. Nothing lists another shopper's orders, nothing moves an order along the
 * pipeline, and there is no `ORDER_*` permission in the catalogue.
 *
 * So this screen runs on the fixture in `./sample-data`. Everything below is
 * shaped to `OrderResponse` / `OrderItemResponse` / `OrderAddressResponse` as
 * the spec defines them today, so that when `/admin/orders` lands the fixture
 * is deleted and the types mostly stand. The four fields the storefront
 * response does *not* carry — `customerType`, `pickupLocationName`,
 * `timeline`, `previousOrders` — are marked where they appear.
 *
 * Money is plain numbers in BDT, matching the rest of the panel.
 */

import type { DeliveryMethodCode } from "@/features/delivery/methods/types";
import type { CustomerType } from "@/features/customers/types";
import type { Tone } from "@/lib/tone";
import { formatDate } from "@/lib/utils";

/** The seven values `OrderResponse.orderStatus` can hold. */
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED";

export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "PARTIALLY_PAID"
  | "FAILED"
  | "REFUNDED";

export type PaymentMethod =
  | "COD"
  | "BKASH"
  | "NAGAD"
  | "ROCKET"
  | "CARD"
  | "BANK_TRANSFER";

export const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "PENDING",
  "PAID",
  "PARTIALLY_PAID",
  "FAILED",
  "REFUNDED",
];

/**
 * The happy path, in order.
 *
 * `CANCELLED` and `RETURNED` are off-ramps rather than steps, so they are not
 * in here — the detail timeline draws them as a terminal node instead.
 */
export const ORDER_PIPELINE: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
];

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};

/** What each status means for the person reading the row. */
export const orderStatusHints: Record<OrderStatus, string> = {
  PENDING: "Placed, not yet paid or confirmed",
  CONFIRMED: "Paid or COD-confirmed, waiting to be picked",
  PROCESSING: "Being picked and packed at the warehouse",
  SHIPPED: "Loaded and on the way to the customer",
  DELIVERED: "Handed over and signed for",
  CANCELLED: "Called off before it shipped",
  RETURNED: "Came back after delivery",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Unpaid",
  PAID: "Paid",
  PARTIALLY_PAID: "Part paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  COD: "Cash on delivery",
  BKASH: "bKash",
  NAGAD: "Nagad",
  ROCKET: "Rocket",
  CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
};

/**
 * Status colour.
 *
 * The five pipeline steps walk amber → blue → violet → teal → green so the
 * stage is readable at a glance without reading the word; grey and red are the
 * two off-ramps. The palette itself lives in `@/lib/tone`, shared with refunds
 * and customers.
 */
export const orderStatusTone: Record<OrderStatus, Tone> = {
  PENDING: "warning",
  CONFIRMED: "info",
  PROCESSING: "violet",
  SHIPPED: "teal",
  DELIVERED: "success",
  CANCELLED: "neutral",
  RETURNED: "danger",
};

export const paymentStatusTone: Record<PaymentStatus, Tone> = {
  PENDING: "warning",
  PAID: "success",
  PARTIALLY_PAID: "info",
  FAILED: "danger",
  REFUNDED: "neutral",
};

export type OrderItem = {
  productId: string;
  name: string;
  /** Carried alongside the API's fields so a line can read "× 10 bags". */
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderAddress = {
  contactName: string;
  phone: string;
  division: string;
  district: string;
  upazila: string;
  addressLine1: string;
  addressLine2?: string;
  formattedAddress: string;
  postalCode: string;
};

/** One step that actually happened, for the detail page's timeline. */
export type OrderEvent = {
  status: OrderStatus;
  at: string;
  note?: string;
};

export type Order = {
  id: string;
  orderNo: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discount: number;
  tax: number;
  deliveryCharge: number;
  totalAmount: number;
  voucherCode: string | null;
  deliveryMethodCode: DeliveryMethodCode;
  deliverySlotLabel: string;
  /** `YYYY-MM-DD`, the booked calendar day. */
  deliveryDate: string;
  /** Not in `OrderResponse`: set only for `CLICK_AND_COLLECT`. */
  pickupLocationName: string | null;
  address: OrderAddress;
  items: OrderItem[];
  createdAt: string;
  /** When a `PENDING` order's payment window closes. Null once it is past. */
  expiresAt: string | null;
  /** Not in `OrderResponse`: the buyer's trade, copied from their account. */
  customerType: CustomerType;
  /**
   * Not in `OrderResponse`: the account's lifetime order count, copied from
   * the customer record. Lifetime, so it is larger than the number of orders
   * this fixture holds for them.
   */
  customerLifetimeOrders: number;
  /** Not in `OrderResponse`: the account this order was placed from. */
  customerId: string;
  /** Not in `OrderResponse`: the steps this order has actually taken. */
  timeline: OrderEvent[];
};

/** One page of orders, shaped like every other paged response in the panel. */
export type OrderPage = {
  content: Order[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export const ORDER_PAGE_SIZE_DEFAULT = 12;

/** Sentinel for "no filter", which a select cannot carry as "". */
export const ALL = "ALL";

/** How far back the list reaches. Anchored on the fixture's own "today". */
export type DateRange = "today" | "7d" | "30d" | "all";

export const DATE_RANGES: DateRange[] = ["today", "7d", "30d", "all"];

export const dateRangeLabels: Record<DateRange, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
};

export function parseDateRange(value: string | undefined): DateRange {
  return DATE_RANGES.includes(value as DateRange)
    ? (value as DateRange)
    : "30d";
}

export type OrderSort = "newest" | "oldest" | "amount-desc" | "amount-asc";

export const ORDER_SORTS: OrderSort[] = [
  "newest",
  "oldest",
  "amount-desc",
  "amount-asc",
];

export const orderSortLabels: Record<OrderSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  "amount-desc": "Highest value",
  "amount-asc": "Lowest value",
};

export function parseOrderSort(value: string | undefined): OrderSort {
  return ORDER_SORTS.includes(value as OrderSort)
    ? (value as OrderSort)
    : "newest";
}

export function parseOrderStatus(
  value: string | undefined,
): OrderStatus | typeof ALL {
  return ORDER_STATUSES.includes(value as OrderStatus)
    ? (value as OrderStatus)
    : ALL;
}

export function parsePaymentStatus(
  value: string | undefined,
): PaymentStatus | typeof ALL {
  return PAYMENT_STATUSES.includes(value as PaymentStatus)
    ? (value as PaymentStatus)
    : ALL;
}

export function parseDeliveryMethod(
  value: string | undefined,
): DeliveryMethodCode | typeof ALL {
  const codes: DeliveryMethodCode[] = [
    "STANDARD",
    "EXPRESS",
    "CLICK_AND_COLLECT",
  ];
  return codes.includes(value as DeliveryMethodCode)
    ? (value as DeliveryMethodCode)
    : ALL;
}

/** Units ordered, not lines — three lines of ten bags is thirty bags. */
export function unitCount(order: Order): number {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

/** Where the order sits on the happy path, or -1 if it left it. */
export function pipelineIndex(status: OrderStatus): number {
  return ORDER_PIPELINE.indexOf(status);
}

/** True once an order can no longer move: delivered, cancelled or returned. */
export function isSettled(status: OrderStatus): boolean {
  return (
    status === "DELIVERED" || status === "CANCELLED" || status === "RETURNED"
  );
}

/** The step an order is waiting on, or null once it is settled. */
export function nextStatus(status: OrderStatus): OrderStatus | null {
  const index = pipelineIndex(status);
  if (index < 0 || index >= ORDER_PIPELINE.length - 1) return null;

  return ORDER_PIPELINE[index + 1];
}

export function sortOrders(orders: Order[], sort: OrderSort): Order[] {
  const sorted = [...orders];

  switch (sort) {
    case "oldest":
      return sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case "amount-desc":
      return sorted.sort((a, b) => b.totalAmount - a.totalAmount);
    case "amount-asc":
      return sorted.sort((a, b) => a.totalAmount - b.totalAmount);
    case "newest":
    default:
      // ISO-ish timestamps sort lexicographically, so no Date is built here.
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

/**
 * `formatDate` for a date-only value such as `deliveryDate`.
 *
 * `new Date("2026-09-22")` is parsed as **UTC** midnight — the one case where
 * the "naive string means local time" rule in `parseApiDateTime` does not
 * hold — so the day renders one earlier anywhere west of Greenwich. Appending
 * a time puts it back in the local frame every other timestamp already uses.
 */
export function formatDeliveryDate(date: string): string {
  return formatDate(`${date}T00:00:00`);
}
