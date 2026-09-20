/**
 * The refund fixture.
 *
 * Eighteen requests standing in for a resource the API does not have at all —
 * see the note at the top of `./types`.
 *
 * Every request is raised **against a real order from the orders fixture**, by
 * id. `requireSampleOrder` throws on a typo, so a request cannot end up
 * floating free of an order, and the customer, the payment method, the line
 * prices and the order total are all read from that order rather than typed
 * again. The dependency runs refunds → orders → customers, one way; nothing
 * here may be imported by either of the other two.
 */

import { requireSampleOrder } from "@/features/orders/sample-data";
import { fixtureDaysAgo, shiftDateTime } from "@/lib/fixtures";

import {
  ALL,
  REFUND_PAGE_SIZE_DEFAULT,
  REFUND_PIPELINE,
  isOpen,
  pipelineIndex,
  sortRefunds,
  type RefundDestination,
  type RefundEvent,
  type RefundKind,
  type RefundLine,
  type RefundPage,
  type RefundReason,
  type RefundRequest,
  type RefundSort,
  type RefundStatus,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Builder                                                                    */
/* -------------------------------------------------------------------------- */

/** How long after the request each step lands, in minutes. */
const STEP_DELAY: Record<RefundStatus, number> = {
  PENDING: 0,
  UNDER_REVIEW: 95,
  APPROVED: 1_250,
  REFUNDED: 2_900,
  REJECTED: 1_400,
};

/** Who signs off. Real-sounding desk names, not a user id. */
const AGENTS = ["Nadia H.", "Rafiq A.", "Shamim R."] as const;

type RefundSeed = {
  no: number;
  /** An id from the orders fixture, e.g. `"ord_10023"`. */
  order: string;
  kind: RefundKind;
  reason: RefundReason;
  reasonNote: string;
  status: RefundStatus;
  destination: RefundDestination;
  /** Naive local, as the API sends them — see `parseApiDateTime`. */
  requestedAt: string;
  /**
   * `[order line index, quantity]` for a partial return. Omit and the whole
   * order comes back, which is what a cancellation always means.
   */
  lines?: [number, number][];
  /** Deducted from the approved amount. Change-of-mind returns carry one. */
  restockingFee?: number;
  /** Why it was refused, or the condition attached to approving it. */
  decisionNote?: string;
};

function refund(seed: RefundSeed): RefundRequest {
  const order = requireSampleOrder(seed.order);

  // A cancellation takes the whole order back, delivery charge and all. A
  // partial return takes named lines and leaves the delivery charge alone —
  // the van still drove.
  const whole = seed.lines === undefined;

  const lines: RefundLine[] = (
    seed.lines ?? order.items.map((_, index): [number, number] => [
      index,
      order.items[index].quantity,
    ])
  ).map(([index, quantity]) => {
    const item = order.items[index];
    if (!item) {
      throw new Error(`Order ${order.orderNo} has no line ${index}`);
    }

    return {
      productId: item.productId,
      name: item.name,
      unit: item.unit,
      quantity,
      orderedQuantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.unitPrice * quantity,
    };
  });

  /*
   * A whole-order request refunds exactly what was paid — `totalAmount`,
   * which already has the voucher discount taken off it. A partial one is
   * priced at line value, which can come to slightly more than the customer
   * paid pro-rata once a discount is involved. That gap is real and is the
   * reason `approvedAmount` exists: the desk settles the number, the customer
   * only ever states one.
   */
  const requestedAmount = whole
    ? order.totalAmount
    : lines.reduce((total, line) => total + line.lineTotal, 0);

  const restockingFee = seed.restockingFee ?? 0;

  const decided =
    seed.status === "APPROVED" ||
    seed.status === "REFUNDED" ||
    seed.status === "REJECTED";

  const approvedAmount = !decided
    ? null
    : seed.status === "REJECTED"
      ? 0
      : requestedAmount - restockingFee;

  const timeline = timelineFor(seed);

  return {
    id: `rfd_${seed.no}`,
    refNo: `RFD-${seed.no}`,

    orderId: order.id,
    orderNo: order.orderNo,
    orderTotal: order.totalAmount,
    orderDeliveryCharge: order.deliveryCharge,
    paymentMethod: order.paymentMethod,

    customerId: order.customerId,
    customerName: order.address.contactName,
    customerPhone: order.address.phone,

    kind: seed.kind,
    reason: seed.reason,
    reasonNote: seed.reasonNote,

    lines,
    deliveryIncluded: whole,
    requestedAmount,
    approvedAmount,
    restockingFee,

    status: seed.status,
    destination: seed.destination,

    requestedAt: seed.requestedAt,
    resolvedAt: isOpen(seed.status)
      ? null
      : (timeline[timeline.length - 1]?.at ?? null),
    decisionNote: seed.decisionNote ?? null,

    timeline,
  };
}

/**
 * The steps a request actually took.
 *
 * Derived rather than typed out: a fixture whose timeline disagreed with its
 * status would be a bug the screen faithfully rendered. A rejection keeps the
 * steps it reached before the decision, then gets its terminal node.
 *
 * The agent is picked from the request number rather than at random, so the
 * same request always shows the same name across a reload.
 */
function timelineFor(seed: RefundSeed): RefundEvent[] {
  const agent = AGENTS[seed.no % AGENTS.length];

  const reached =
    seed.status === "REJECTED"
      ? REFUND_PIPELINE.slice(0, 2)
      : REFUND_PIPELINE.slice(0, pipelineIndex(seed.status) + 1);

  const steps: RefundEvent[] = reached.map((status) => ({
    status,
    at: shiftDateTime(seed.requestedAt, STEP_DELAY[status]),
    // The opening step is the customer's; every later one is the desk's.
    by: status === "PENDING" ? null : agent,
  }));

  if (seed.status === "REJECTED") {
    steps.push({
      status: "REJECTED",
      at: shiftDateTime(seed.requestedAt, STEP_DELAY.REJECTED),
      by: agent,
      note: seed.decisionNote,
    });
  } else if (seed.status === "REFUNDED" && seed.decisionNote) {
    steps[steps.length - 1].note = seed.decisionNote;
  }

  return steps;
}

/* -------------------------------------------------------------------------- */
/* The requests                                                               */
/* -------------------------------------------------------------------------- */

/** Newest first; the screen's default sort puts the longest waiting on top. */
const SAMPLE_REFUNDS: RefundRequest[] = [
  /* Open — the work this screen exists for. */

  refund({
    no: 2051,
    order: "ord_10023",
    kind: "CANCELLATION",
    reason: "CHANGED_MIND",
    reasonNote:
      "Site pour is pushed to next month, we cannot store 120 bags. Please cancel the whole order.",
    status: "PENDING",
    destination: "BANK_TRANSFER",
    requestedAt: "2026-09-20T15:10:00",
  }),
  refund({
    no: 2050,
    order: "ord_10026",
    kind: "CANCELLATION",
    reason: "DUPLICATE_ORDER",
    reasonNote:
      "Placed the same board order twice by mistake — the other one is B360-10012.",
    status: "PENDING",
    destination: "ORIGINAL",
    requestedAt: "2026-09-20T13:05:00",
  }),
  refund({
    no: 2049,
    order: "ord_10022",
    kind: "CANCELLATION",
    reason: "LATE_DELIVERY",
    reasonNote:
      "Express was promised for this morning and the van has not arrived. Tiler has left the site.",
    status: "UNDER_REVIEW",
    destination: "ORIGINAL",
    requestedAt: "2026-09-20T11:20:00",
  }),
  refund({
    no: 2048,
    order: "ord_10015",
    kind: "REFUND",
    reason: "WRONG_ITEM",
    reasonNote:
      "Collected 1.5mm wire but the invoice and the box say 2.5mm. Returning both rolls.",
    status: "PENDING",
    destination: "BKASH",
    requestedAt: "2026-09-19T16:40:00",
    lines: [[0, 2]],
  }),
  refund({
    no: 2047,
    order: "ord_10013",
    kind: "REFUND",
    reason: "DAMAGED",
    reasonNote:
      "Four bags split open on the truck bed, cement is half gone. Photos sent on WhatsApp.",
    status: "UNDER_REVIEW",
    destination: "ORIGINAL",
    requestedAt: "2026-09-19T10:05:00",
    lines: [[0, 4]],
  }),
  refund({
    no: 2046,
    order: "ord_10012",
    kind: "REFUND",
    reason: "SHORT_DELIVERY",
    reasonNote:
      "Delivery note says 80 sheets, we counted 74 off the truck. Six short.",
    status: "PENDING",
    destination: "BANK_TRANSFER",
    requestedAt: "2026-09-18T14:22:00",
    lines: [[0, 6]],
  }),
  refund({
    no: 2045,
    order: "ord_10011",
    kind: "REFUND",
    reason: "QUALITY",
    reasonNote:
      "Roughly a fifth of the bricks are cracked through. Setting those aside for collection.",
    status: "UNDER_REVIEW",
    destination: "BANK_TRANSFER",
    requestedAt: "2026-09-17T09:15:00",
    lines: [[0, 1000]],
  }),
  refund({
    no: 2044,
    order: "ord_10014",
    kind: "CANCELLATION",
    reason: "PAYMENT_ISSUE",
    reasonNote:
      "Only half the amount cleared and the bank cannot trace the rest. Cancel and we will re-order.",
    status: "PENDING",
    destination: "BANK_TRANSFER",
    requestedAt: "2026-09-17T18:50:00",
  }),

  /* Agreed, money not out yet. */

  refund({
    no: 2043,
    order: "ord_10009",
    kind: "REFUND",
    reason: "SHORT_DELIVERY",
    reasonNote: "Twelve bags short against the delivery note.",
    status: "APPROVED",
    destination: "BANK_TRANSFER",
    requestedAt: "2026-09-15T11:30:00",
    lines: [[0, 12]],
    decisionNote: "Warehouse count confirmed the shortfall. Pay out on Sunday's run.",
  }),
  refund({
    no: 2042,
    order: "ord_10006",
    kind: "REFUND",
    reason: "QUALITY",
    reasonNote:
      "Six of the pipes are out of round and will not take a coupling.",
    status: "APPROVED",
    destination: "BKASH",
    requestedAt: "2026-09-13T15:05:00",
    lines: [[0, 6]],
    decisionNote: "Supplier credit agreed; refund the customer and reclaim from RFL.",
  }),

  /* Paid out. */

  refund({
    no: 2041,
    order: "ord_10018",
    kind: "CANCELLATION",
    reason: "CHANGED_MIND",
    reasonNote: "Found the same shade cheaper locally, sorry.",
    status: "REFUNDED",
    destination: "ORIGINAL",
    requestedAt: "2026-09-19T13:50:00",
    decisionNote: "Nothing had shipped, so refunded in full to the card.",
  }),
  refund({
    no: 2040,
    order: "ord_10004",
    kind: "REFUND",
    reason: "WRONG_ITEM",
    reasonNote:
      "Whole delivery is the wrong batch shade, it does not match the floor already laid.",
    status: "REFUNDED",
    destination: "BANK_TRANSFER",
    requestedAt: "2026-09-08T10:12:00",
    decisionNote: "Our batching error. Full refund including delivery, replaced under B360-10014.",
  }),
  refund({
    no: 2039,
    order: "ord_10010",
    kind: "REFUND",
    reason: "DAMAGED",
    reasonNote:
      "Two of the six boxes are chipped along the edge — we would rather send the lot back than lay a mixed batch.",
    status: "REFUNDED",
    destination: "BKASH",
    requestedAt: "2026-09-17T12:05:00",
    decisionNote: "Collected and credited in full — the whole order came back.",
  }),
  refund({
    no: 2038,
    order: "ord_10008",
    kind: "REFUND",
    reason: "DAMAGED",
    reasonNote: "One putty bucket had split and hardened.",
    status: "REFUNDED",
    destination: "NAGAD",
    requestedAt: "2026-09-14T17:26:00",
    lines: [[0, 1]],
    decisionNote: "One bucket credited. The rest of the order stands.",
  }),

  /* Refused. */

  refund({
    no: 2037,
    order: "ord_10005",
    kind: "REFUND",
    reason: "CHANGED_MIND",
    reasonNote: "Ordered too much sand, would like to send half back.",
    status: "REJECTED",
    destination: "ORIGINAL",
    requestedAt: "2026-09-11T09:40:00",
    decisionNote:
      "Loose aggregate is not returnable once tipped — stated at checkout. Offered 5% off the next order instead.",
  }),
  refund({
    no: 2036,
    order: "ord_10003",
    kind: "REFUND",
    reason: "LATE_DELIVERY",
    reasonNote: "Paint arrived in the afternoon slot, not the midday one.",
    status: "REJECTED",
    destination: "ORIGINAL",
    requestedAt: "2026-09-05T14:18:00",
    decisionNote:
      "Delivered inside the booked window at 13:40. Slot evidence attached to the order.",
  }),
  refund({
    no: 2035,
    order: "ord_10002",
    kind: "REFUND",
    reason: "CHANGED_MIND",
    reasonNote: "Bought more board than the ceiling needed.",
    status: "REJECTED",
    destination: "STORE_CREDIT",
    requestedAt: "2026-09-08T11:02:00",
    decisionNote: "Raised 8 days after collection; the return window is 7.",
  }),
  refund({
    no: 2034,
    order: "ord_10007",
    kind: "CANCELLATION",
    reason: "PAYMENT_ISSUE",
    reasonNote: "Card was charged but the order says unpaid.",
    status: "REJECTED",
    destination: "ORIGINAL",
    requestedAt: "2026-09-12T18:20:00",
    decisionNote:
      "No payment was ever captured — the gateway declined it and the order expired. Nothing to refund.",
  }),
];

/* -------------------------------------------------------------------------- */
/* Querying                                                                   */
/* -------------------------------------------------------------------------- */

export type RefundFilters = {
  search: string;
  status: RefundStatus | typeof ALL;
  kind: RefundKind | typeof ALL;
  reason: RefundReason | typeof ALL;
  sort: RefundSort;
  /** 1-based, as it appears in the URL. */
  page: number;
};

export type StatusCounts = Record<RefundStatus | typeof ALL, number>;

export type RefundListing = {
  requests: RefundPage;
  /** Counted *before* the status filter, so the tabs never read zero. */
  counts: StatusCounts;
};

function matchesSearch(request: RefundRequest, search: string): boolean {
  if (!search) return true;

  const needle = search.toLowerCase();
  const digits = needle.replace(/\D/g, "");

  return (
    request.refNo.toLowerCase().includes(needle) ||
    request.orderNo.toLowerCase().includes(needle) ||
    request.customerName.toLowerCase().includes(needle) ||
    (digits.length > 0 &&
      request.customerPhone.replace(/\D/g, "").includes(digits)) ||
    request.lines.some((line) => line.name.toLowerCase().includes(needle))
  );
}

/**
 * One page of requests.
 *
 * Same URL contract as products, orders and customers, so swapping in a real
 * endpoint is a change of body, not of interface.
 */
export function listSampleRefunds(filters: RefundFilters): RefundListing {
  // Everything except the status filter, so the tab counts stay meaningful
  // while a status is selected.
  const scoped = SAMPLE_REFUNDS.filter(
    (request) =>
      matchesSearch(request, filters.search) &&
      (filters.kind === ALL || request.kind === filters.kind) &&
      (filters.reason === ALL || request.reason === filters.reason),
  );

  const counts: StatusCounts = {
    ALL: scoped.length,
    PENDING: 0,
    UNDER_REVIEW: 0,
    APPROVED: 0,
    REFUNDED: 0,
    REJECTED: 0,
  };
  for (const request of scoped) counts[request.status] += 1;

  const matched =
    filters.status === ALL
      ? scoped
      : scoped.filter((request) => request.status === filters.status);

  const ordered = sortRefunds(matched, filters.sort);

  const size = REFUND_PAGE_SIZE_DEFAULT;
  const totalPages = Math.max(1, Math.ceil(ordered.length / size));
  const start = (filters.page - 1) * size;

  return {
    requests: {
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

/** One request, or null. Stands in for `GET /admin/refunds/{id}`. */
export function findSampleRefund(id: string): RefundRequest | null {
  return SAMPLE_REFUNDS.find((request) => request.id === id) ?? null;
}

/** Every request raised against one order, newest first. */
export function listSampleRefundsForOrder(orderId: string): RefundRequest[] {
  return SAMPLE_REFUNDS.filter((request) => request.orderId === orderId).sort(
    (a, b) => b.requestedAt.localeCompare(a.requestedAt),
  );
}

export type RefundSummary = {
  open: number;
  /** Open requests past the service level — the number that means "hurry". */
  overdue: number;
  /** What the open requests would cost if every one were approved in full. */
  exposure: number;
  /** Actually paid out in the last thirty days. */
  refundedThisMonth: number;
};

/**
 * The four headline numbers.
 *
 * Read over the whole fixture, never the current filter — these describe the
 * queue, and a number that moved when you typed in the search box would be
 * describing the search box.
 */
export function sampleRefundSummary(): RefundSummary {
  const open = SAMPLE_REFUNDS.filter((request) => isOpen(request.status));
  const slaCutoff = fixtureDaysAgo(2);
  const monthCutoff = fixtureDaysAgo(29);

  return {
    open: open.length,
    overdue: open.filter((request) => request.requestedAt < slaCutoff).length,
    exposure: open.reduce((total, request) => total + request.requestedAmount, 0),
    refundedThisMonth: SAMPLE_REFUNDS.filter(
      (request) =>
        request.status === "REFUNDED" &&
        request.resolvedAt !== null &&
        request.resolvedAt >= monthCutoff,
    ).reduce((total, request) => total + (request.approvedAmount ?? 0), 0),
  };
}


/**
 * Every request in the fixture. For the reports screen, which aggregates
 * rather than pages. Returns a copy — see `allSampleOrders`.
 */
export function allSampleRefunds(): RefundRequest[] {
  return [...SAMPLE_REFUNDS];
}
