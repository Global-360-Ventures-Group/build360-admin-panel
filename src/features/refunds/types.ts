/**
 * Refund and cancellation requests.
 *
 * **The API has no refund resource of any kind.** There is one endpoint in the
 * neighbourhood — `POST /orders/{id}/cancel` — and its own description is the
 * clearest statement of the gap: it cancels the *owner's* unpaid or
 * cash-on-delivery order, and *"a PAID order returns 409 (refund required)"*.
 * That 409 is this screen. Everything a paid order's customer asks for lands
 * in a queue the backend does not have: no refund record, no status, no
 * decision, no payout.
 *
 * So the whole feature is a design over the fixture in `./sample-data`, and
 * unlike orders and customers there is no response shape to mirror — nothing
 * below is "what the API returns", it is what the API would have to carry for
 * the screen to work. Treat every type here as a proposal.
 */

import type { Tone } from "@/lib/tone";
import type { PaymentMethod } from "@/features/orders/types";

/**
 * What the customer is asking for.
 *
 * The split is not cosmetic: a cancellation is money back on goods that have
 * not moved, a refund is money back on goods that have to come *back*. Only
 * the second one costs a collection.
 */
export type RefundKind = "CANCELLATION" | "REFUND";

export const REFUND_KINDS: RefundKind[] = ["CANCELLATION", "REFUND"];

export const refundKindLabels: Record<RefundKind, string> = {
  CANCELLATION: "Cancellation",
  REFUND: "Refund",
};

export const refundKindHints: Record<RefundKind, string> = {
  CANCELLATION: "Paid order called off before it was delivered",
  REFUND: "Delivered goods coming back",
};

export type RefundStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REFUNDED"
  | "REJECTED";

export const REFUND_STATUSES: RefundStatus[] = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REFUNDED",
  "REJECTED",
];

/**
 * The happy path, in order.
 *
 * `REJECTED` is an off-ramp rather than a step, so it is not in here — the
 * detail timeline draws it as a terminal node instead.
 */
export const REFUND_PIPELINE: RefundStatus[] = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REFUNDED",
];

export const refundStatusLabels: Record<RefundStatus, string> = {
  PENDING: "New",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REFUNDED: "Refunded",
  REJECTED: "Rejected",
};

export const refundStatusHints: Record<RefundStatus, string> = {
  PENDING: "Raised by the customer, nobody has picked it up",
  UNDER_REVIEW: "An agent is checking the order and the goods",
  APPROVED: "Agreed, waiting for the money to go out",
  REFUNDED: "Money sent back to the customer",
  REJECTED: "Turned down — the reason is on the request",
};

/**
 * Status colour.
 *
 * `REJECTED` is neutral, not red: a refused request is over and quiet, and
 * painting it as an alarm would make a normal outcome look like a fault. The
 * urgency on this screen comes from *age* instead — see `daysOpen`.
 */
export const refundStatusTone: Record<RefundStatus, Tone> = {
  PENDING: "warning",
  UNDER_REVIEW: "info",
  APPROVED: "violet",
  REFUNDED: "success",
  REJECTED: "neutral",
};

export type RefundReason =
  | "DAMAGED"
  | "WRONG_ITEM"
  | "SHORT_DELIVERY"
  | "LATE_DELIVERY"
  | "QUALITY"
  | "CHANGED_MIND"
  | "DUPLICATE_ORDER"
  | "PAYMENT_ISSUE";

export const REFUND_REASONS: RefundReason[] = [
  "DAMAGED",
  "WRONG_ITEM",
  "SHORT_DELIVERY",
  "LATE_DELIVERY",
  "QUALITY",
  "CHANGED_MIND",
  "DUPLICATE_ORDER",
  "PAYMENT_ISSUE",
];

export const refundReasonLabels: Record<RefundReason, string> = {
  DAMAGED: "Arrived damaged",
  WRONG_ITEM: "Wrong item sent",
  SHORT_DELIVERY: "Short delivery",
  LATE_DELIVERY: "Delivered late",
  QUALITY: "Quality complaint",
  CHANGED_MIND: "Changed their mind",
  DUPLICATE_ORDER: "Ordered twice",
  PAYMENT_ISSUE: "Payment problem",
};

/**
 * Whose mistake it was.
 *
 * Drives nothing in the UI except how the row reads, but it is the single
 * most useful thing to be able to filter a refund queue by: "our fault" is a
 * warehouse problem, "their choice" is a policy one.
 */
export const refundReasonFault: Record<RefundReason, "ours" | "theirs" | "neither"> = {
  DAMAGED: "ours",
  WRONG_ITEM: "ours",
  SHORT_DELIVERY: "ours",
  LATE_DELIVERY: "ours",
  QUALITY: "neither",
  CHANGED_MIND: "theirs",
  DUPLICATE_ORDER: "theirs",
  PAYMENT_ISSUE: "neither",
};

/** Where the money goes back to. */
export type RefundDestination =
  | "ORIGINAL"
  | "BKASH"
  | "NAGAD"
  | "BANK_TRANSFER"
  | "STORE_CREDIT";

export const refundDestinationLabels: Record<RefundDestination, string> = {
  ORIGINAL: "Original payment method",
  BKASH: "bKash",
  NAGAD: "Nagad",
  BANK_TRANSFER: "Bank transfer",
  STORE_CREDIT: "Store credit",
};

/** One line of the order being sent back, at the price it was sold at. */
export type RefundLine = {
  productId: string;
  name: string;
  unit: string;
  /** May be fewer than the order line — two chipped boxes out of six. */
  quantity: number;
  /** The quantity on the original order line, for context. */
  orderedQuantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type RefundEvent = {
  status: RefundStatus;
  at: string;
  /** Who did it. Null for the customer's own opening step. */
  by: string | null;
  note?: string;
};

export type RefundRequest = {
  id: string;
  refNo: string;

  /* The order it is against. Copied, not referenced: a refund has to keep
     reading correctly after the order moves on. */
  orderId: string;
  orderNo: string;
  orderTotal: number;
  orderDeliveryCharge: number;
  paymentMethod: PaymentMethod;

  customerId: string;
  customerName: string;
  customerPhone: string;

  kind: RefundKind;
  reason: RefundReason;
  /** What the customer actually wrote. */
  reasonNote: string;

  lines: RefundLine[];
  /** Whether the delivery charge is included in what was asked for. */
  deliveryIncluded: boolean;
  /** Line value plus delivery, if included. What the customer asked for. */
  requestedAmount: number;
  /** What the desk agreed to. Null until a decision is made. */
  approvedAmount: number | null;
  /** Deducted from the approved amount on a change-of-mind return. */
  restockingFee: number;

  status: RefundStatus;
  destination: RefundDestination;

  requestedAt: string;
  /** When it reached `REFUNDED` or `REJECTED`. Null while still open. */
  resolvedAt: string | null;
  decisionNote: string | null;

  timeline: RefundEvent[];
};

/** One page of requests, shaped like every other paged response here. */
export type RefundPage = {
  content: RefundRequest[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export const REFUND_PAGE_SIZE_DEFAULT = 12;

/** Sentinel for "no filter", which a select cannot carry as "". */
export const ALL = "ALL";

/** A request nobody has resolved yet. */
export function isOpen(status: RefundStatus): boolean {
  return status !== "REFUNDED" && status !== "REJECTED";
}

/**
 * How long an open request has been waiting, in whole days.
 *
 * Returns null once it is resolved — a closed request has no age worth
 * showing, and rendering "11 days" beside "Refunded" would read as a
 * complaint about work that is already done.
 */
export function daysOpen(
  request: RefundRequest,
  today: string,
): number | null {
  if (!isOpen(request.status)) return null;

  const from = new Date(`${request.requestedAt.slice(0, 10)}T00:00:00`);
  const to = new Date(`${today}T00:00:00`);
  return Math.max(
    0,
    Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)),
  );
}

/** Past this, an open request is late enough to shout about. */
export const REFUND_SLA_DAYS = 2;

/** Where the request sits on the happy path, or -1 if it left it. */
export function pipelineIndex(status: RefundStatus): number {
  return REFUND_PIPELINE.indexOf(status);
}

/** The step a request is waiting on, or null once it is settled. */
export function nextStatus(status: RefundStatus): RefundStatus | null {
  const index = pipelineIndex(status);
  if (index < 0 || index >= REFUND_PIPELINE.length - 1) return null;

  return REFUND_PIPELINE[index + 1];
}

/** Units coming back, not lines — two lines of ten bags is twenty bags. */
export function unitCount(request: RefundRequest): number {
  return request.lines.reduce((total, line) => total + line.quantity, 0);
}

/** True when only part of the order is coming back. */
export function isPartial(request: RefundRequest): boolean {
  return request.lines.some((line) => line.quantity < line.orderedQuantity);
}

export type RefundSort =
  | "oldest-open"
  | "newest"
  | "amount-desc"
  | "amount-asc";

export const REFUND_SORTS: RefundSort[] = [
  "oldest-open",
  "newest",
  "amount-desc",
  "amount-asc",
];

export const refundSortLabels: Record<RefundSort, string> = {
  "oldest-open": "Longest waiting",
  newest: "Newest first",
  "amount-desc": "Highest value",
  "amount-asc": "Lowest value",
};

export function parseRefundSort(value: string | undefined): RefundSort {
  return REFUND_SORTS.includes(value as RefundSort)
    ? (value as RefundSort)
    : "oldest-open";
}

export function parseRefundStatus(
  value: string | undefined,
): RefundStatus | typeof ALL {
  return REFUND_STATUSES.includes(value as RefundStatus)
    ? (value as RefundStatus)
    : ALL;
}

export function parseRefundKind(
  value: string | undefined,
): RefundKind | typeof ALL {
  return REFUND_KINDS.includes(value as RefundKind)
    ? (value as RefundKind)
    : ALL;
}

export function parseRefundReason(
  value: string | undefined,
): RefundReason | typeof ALL {
  return REFUND_REASONS.includes(value as RefundReason)
    ? (value as RefundReason)
    : ALL;
}

export function sortRefunds(
  requests: RefundRequest[],
  sort: RefundSort,
): RefundRequest[] {
  const sorted = [...requests];

  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    case "amount-desc":
      return sorted.sort((a, b) => b.requestedAmount - a.requestedAmount);
    case "amount-asc":
      return sorted.sort((a, b) => a.requestedAmount - b.requestedAmount);
    case "oldest-open":
    default:
      // The default this screen opens on: whoever has waited longest, first,
      // with resolved requests pushed behind every open one.
      return sorted.sort((a, b) => {
        const openA = isOpen(a.status);
        const openB = isOpen(b.status);
        if (openA !== openB) return openA ? -1 : 1;

        return a.requestedAt.localeCompare(b.requestedAt);
      });
  }
}
