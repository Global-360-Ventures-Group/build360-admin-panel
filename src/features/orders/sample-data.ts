/**
 * The order fixture.
 *
 * Thirty orders standing in for `/admin/orders`, which does not exist — see
 * the note at the top of `./types`. This file is the *only* place the screen
 * gets data from, so deleting it and pointing `listOrders` at a real `api.ts`
 * is the whole migration.
 *
 * Three rules keep the fixture honest:
 *
 * 1. **Nothing is hand-totalled.** `order()` derives every line total, the
 *    subtotal and `totalAmount` from the catalogue price and the quantity, so
 *    a fixture row cannot quietly disagree with itself the way a typed-out
 *    ৳12,500 would.
 * 2. **Nobody is hand-copied.** The buyer's name, phone, trade and address all
 *    come from the customer fixture, and every line item comes from the
 *    catalogue in the inventory fixture — so an order cannot drift from the
 *    account that placed it or from the product it sold.
 * 3. **No `Date.now()`.** Every timestamp is anchored on `SAMPLE_TODAY` — see
 *    `@/lib/fixtures`.
 */

import type { DeliveryMethodCode } from "@/features/delivery/methods/types";
import { requireSampleCustomer } from "@/features/customers/sample-data";
import { defaultAddress } from "@/features/customers/types";
import {
  CATALOG,
  productIdFor,
  type ProductKey,
} from "@/features/inventory/sample-data";
import { SAMPLE_TODAY, fixtureDaysAgo, shiftDateTime } from "@/lib/fixtures";

import {
  ALL,
  ORDER_PAGE_SIZE_DEFAULT,
  ORDER_PIPELINE,
  pipelineIndex,
  sortOrders,
  type DateRange,
  type Order,
  type OrderAddress,
  type OrderEvent,
  type OrderItem,
  type OrderPage,
  type OrderSort,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "./types";



/* -------------------------------------------------------------------------- */
/* Builder                                                                    */
/* -------------------------------------------------------------------------- */

/** How long after the order each pipeline step lands, in minutes. */
const STEP_DELAY: Record<OrderStatus, number> = {
  PENDING: 0,
  CONFIRMED: 25,
  PROCESSING: 190,
  SHIPPED: 1_180,
  DELIVERED: 1_640,
  CANCELLED: 0,
  RETURNED: 0,
};

type OrderSeed = {
  no: number;
  /** An id from the customer fixture, e.g. `"cus_rahim"`. */
  customer: string;
  /** `[catalogue key, quantity]`, in the order they were added to the cart. */
  lines: [ProductKey, number][];
  status: OrderStatus;
  payment: PaymentStatus;
  method: PaymentMethod;
  delivery: DeliveryMethodCode;
  /** Naive local, as the API sends them — see `parseApiDateTime`. */
  createdAt: string;
  deliveryDate: string;
  slot: string;
  deliveryCharge: number;
  discount?: number;
  tax?: number;
  voucher?: string;
  pickupLocation?: string;
  /** Why it was cancelled or returned; shown on the timeline. */
  closingNote?: string;
};

function order(seed: OrderSeed): Order {
  const customer = requireSampleCustomer(seed.customer);
  // Every fixture customer who places an order has an address on file; the one
  // who has none has never ordered, which is the point of that record.
  const home = defaultAddress(customer);
  if (!home) {
    throw new Error(`Fixture customer ${customer.id} has no address to ship to`);
  }

  const items: OrderItem[] = seed.lines.map(([key, quantity]) => {
    const product = CATALOG[key];
    return {
      productId: productIdFor(key),
      name: product.name,
      unit: product.unit,
      quantity,
      unitPrice: product.unitPrice,
      lineTotal: product.unitPrice * quantity,
    };
  });

  const subtotal = items.reduce((total, item) => total + item.lineTotal, 0);
  const discount = seed.discount ?? 0;
  const tax = seed.tax ?? 0;

  // `OrderAddress` is a snapshot taken at checkout, not a live reference — the
  // API models it that way so editing an address never rewrites old orders.
  const address: OrderAddress = {
    contactName: home.contactName,
    phone: home.phone,
    division: home.division,
    district: home.district,
    upazila: home.upazila,
    addressLine1: home.addressLine1,
    formattedAddress: home.formattedAddress,
    postalCode: home.postalCode,
  };

  return {
    id: `ord_${seed.no}`,
    orderNo: `B360-${seed.no}`,
    orderStatus: seed.status,
    paymentStatus: seed.payment,
    paymentMethod: seed.method,
    subtotal,
    discount,
    tax,
    deliveryCharge: seed.deliveryCharge,
    totalAmount: subtotal - discount + tax + seed.deliveryCharge,
    voucherCode: seed.voucher ?? null,
    deliveryMethodCode: seed.delivery,
    deliverySlotLabel: seed.slot,
    deliveryDate: seed.deliveryDate,
    pickupLocationName: seed.pickupLocation ?? null,
    address,
    items,
    createdAt: seed.createdAt,
    // Only an unpaid order still has a window to pay in.
    expiresAt:
      seed.status === "PENDING"
        ? shiftDateTime(seed.createdAt, 24 * 60)
        : null,
    customerId: customer.id,
    customerType: customer.customerType,
    customerLifetimeOrders: customer.lifetimeOrders,
    timeline: timelineFor(seed),
  };
}

/**
 * The steps an order actually took.
 *
 * Derived rather than typed out: a fixture where the timeline disagreed with
 * the status would be a bug the screen faithfully rendered. `CANCELLED` and
 * `RETURNED` keep the steps they reached before leaving the pipeline, then get
 * their terminal node.
 */
function timelineFor(seed: OrderSeed): OrderEvent[] {
  const reached =
    seed.status === "CANCELLED"
      ? ORDER_PIPELINE.slice(0, 2)
      : seed.status === "RETURNED"
        ? ORDER_PIPELINE
        : ORDER_PIPELINE.slice(0, pipelineIndex(seed.status) + 1);

  const steps: OrderEvent[] = reached.map((status) => ({
    status,
    at: shiftDateTime(seed.createdAt, STEP_DELAY[status]),
  }));

  if (seed.status === "CANCELLED" || seed.status === "RETURNED") {
    steps.push({
      status: seed.status,
      at: shiftDateTime(seed.createdAt, seed.status === "CANCELLED" ? 320 : 3_600),
      note: seed.closingNote,
    });
  }

  return steps;
}

/* -------------------------------------------------------------------------- */
/* The orders                                                                 */
/* -------------------------------------------------------------------------- */

const MORNING = "8:00 AM – 11:00 AM";
const MIDDAY = "11:00 AM – 2:00 PM";
const AFTERNOON = "2:00 PM – 5:00 PM";
const EVENING = "5:00 PM – 8:00 PM";

/** Newest first, which is also the order the list defaults to. */
const SAMPLE_ORDERS: Order[] = [
  order({
    no: 10030,
    customer: "cus_rahim",
    lines: [["cementShah", 40], ["sand", 120]],
    status: "PENDING",
    payment: "PENDING",
    method: "COD",
    delivery: "STANDARD",
    createdAt: "2026-09-20T14:42:00",
    deliveryDate: "2026-09-22",
    slot: MORNING,
    deliveryCharge: 850,
  }),
  order({
    no: 10029,
    customer: "cus_sadia",
    lines: [["tileWall", 6], ["putty", 2]],
    status: "PENDING",
    payment: "FAILED",
    method: "CARD",
    delivery: "STANDARD",
    createdAt: "2026-09-20T13:58:00",
    deliveryDate: "2026-09-23",
    slot: AFTERNOON,
    deliveryCharge: 400,
  }),
  order({
    no: 10028,
    customer: "cus_hub",
    lines: [["rod16", 60], ["rod12", 40]],
    status: "CONFIRMED",
    payment: "PARTIALLY_PAID",
    method: "BANK_TRANSFER",
    delivery: "STANDARD",
    createdAt: "2026-09-20T12:30:00",
    deliveryDate: "2026-09-24",
    slot: MORNING,
    deliveryCharge: 2400,
    discount: 6000,
    voucher: "BULKSTEEL",
  }),
  order({
    no: 10027,
    customer: "cus_tanvir",
    lines: [["paint", 1], ["nail", 4]],
    status: "PENDING",
    payment: "PENDING",
    method: "BKASH",
    delivery: "EXPRESS",
    createdAt: "2026-09-20T11:46:00",
    deliveryDate: "2026-09-21",
    slot: MIDDAY,
    deliveryCharge: 1200,
  }),
  order({
    no: 10026,
    customer: "cus_nova",
    lines: [["gypsum", 55], ["angle", 12]],
    status: "PROCESSING",
    payment: "PAID",
    method: "BKASH",
    delivery: "STANDARD",
    createdAt: "2026-09-20T10:55:00",
    deliveryDate: "2026-09-22",
    slot: AFTERNOON,
    deliveryCharge: 900,
    tax: 3465,
  }),
  order({
    no: 10025,
    customer: "cus_karim",
    lines: [["brick", 2000]],
    status: "CONFIRMED",
    payment: "PAID",
    method: "NAGAD",
    delivery: "STANDARD",
    createdAt: "2026-09-20T10:12:00",
    deliveryDate: "2026-09-23",
    slot: MORNING,
    deliveryCharge: 3200,
  }),
  order({
    no: 10024,
    customer: "cus_imran",
    lines: [["pipe", 8], ["nail", 3]],
    status: "PENDING",
    payment: "PENDING",
    method: "COD",
    delivery: "CLICK_AND_COLLECT",
    createdAt: "2026-09-20T09:38:00",
    deliveryDate: "2026-09-21",
    slot: MIDDAY,
    deliveryCharge: 0,
    pickupLocation: "Build360 Barishal Point",
  }),
  order({
    no: 10023,
    customer: "cus_metro",
    lines: [["cementCrown", 120], ["stone", 200]],
    status: "PROCESSING",
    payment: "PAID",
    method: "BANK_TRANSFER",
    delivery: "STANDARD",
    createdAt: "2026-09-20T09:05:00",
    deliveryDate: "2026-09-22",
    slot: MORNING,
    deliveryCharge: 4100,
    discount: 3500,
    voucher: "SEPT10",
  }),
  order({
    no: 10022,
    customer: "cus_skyline",
    lines: [["tileFloor", 24]],
    status: "SHIPPED",
    payment: "PAID",
    method: "CARD",
    delivery: "EXPRESS",
    createdAt: "2026-09-20T08:20:00",
    deliveryDate: "2026-09-20",
    slot: AFTERNOON,
    deliveryCharge: 1500,
  }),
  order({
    no: 10021,
    customer: "cus_dilara",
    lines: [["putty", 3], ["wire", 1]],
    status: "PENDING",
    payment: "PENDING",
    method: "BKASH",
    delivery: "STANDARD",
    createdAt: "2026-09-19T18:04:00",
    deliveryDate: "2026-09-22",
    slot: EVENING,
    deliveryCharge: 450,
  }),
  order({
    no: 10020,
    customer: "cus_rahim",
    lines: [["rod12", 25], ["angle", 8]],
    status: "SHIPPED",
    payment: "PAID",
    method: "BKASH",
    delivery: "STANDARD",
    createdAt: "2026-09-19T15:20:00",
    deliveryDate: "2026-09-21",
    slot: MORNING,
    deliveryCharge: 1100,
  }),
  order({
    no: 10019,
    customer: "cus_hub",
    lines: [["cementShah", 200]],
    status: "PROCESSING",
    payment: "PAID",
    method: "BANK_TRANSFER",
    delivery: "STANDARD",
    createdAt: "2026-09-19T11:42:00",
    deliveryDate: "2026-09-21",
    slot: MIDDAY,
    deliveryCharge: 5200,
    discount: 8000,
    voucher: "BULK200",
  }),
  order({
    no: 10018,
    customer: "cus_sadia",
    lines: [["tileWall", 10]],
    status: "CANCELLED",
    payment: "REFUNDED",
    method: "CARD",
    delivery: "STANDARD",
    createdAt: "2026-09-19T10:15:00",
    deliveryDate: "2026-09-23",
    slot: AFTERNOON,
    deliveryCharge: 400,
    closingNote: "Customer cancelled — found the shade elsewhere.",
  }),
  order({
    no: 10017,
    customer: "cus_nova",
    lines: [["paint", 4], ["putty", 10]],
    status: "SHIPPED",
    payment: "PAID",
    method: "CARD",
    delivery: "STANDARD",
    createdAt: "2026-09-18T16:35:00",
    deliveryDate: "2026-09-20",
    slot: AFTERNOON,
    deliveryCharge: 1600,
    tax: 3410,
  }),
  order({
    no: 10016,
    customer: "cus_karim",
    lines: [["sand", 300], ["stone", 150]],
    status: "CONFIRMED",
    payment: "PAID",
    method: "NAGAD",
    delivery: "STANDARD",
    createdAt: "2026-09-18T13:11:00",
    deliveryDate: "2026-09-21",
    slot: MORNING,
    deliveryCharge: 3800,
  }),
  order({
    no: 10015,
    customer: "cus_tanvir",
    lines: [["wire", 2], ["pipe", 4]],
    status: "DELIVERED",
    payment: "PAID",
    method: "BKASH",
    delivery: "CLICK_AND_COLLECT",
    createdAt: "2026-09-18T09:50:00",
    deliveryDate: "2026-09-19",
    slot: MIDDAY,
    deliveryCharge: 0,
    pickupLocation: "Build360 Khulna Depot",
  }),
  order({
    no: 10014,
    customer: "cus_metro",
    lines: [["rod16", 120]],
    status: "SHIPPED",
    payment: "PARTIALLY_PAID",
    method: "BANK_TRANSFER",
    delivery: "STANDARD",
    createdAt: "2026-09-17T14:28:00",
    deliveryDate: "2026-09-20",
    slot: MORNING,
    deliveryCharge: 4600,
    discount: 12000,
    voucher: "BULKSTEEL",
  }),
  order({
    no: 10013,
    customer: "cus_imran",
    lines: [["cementCrown", 12]],
    status: "DELIVERED",
    payment: "PAID",
    method: "COD",
    delivery: "STANDARD",
    createdAt: "2026-09-17T10:07:00",
    deliveryDate: "2026-09-19",
    slot: EVENING,
    deliveryCharge: 700,
  }),
  order({
    no: 10012,
    customer: "cus_skyline",
    lines: [["gypsum", 80], ["angle", 30]],
    status: "DELIVERED",
    payment: "PAID",
    method: "CARD",
    delivery: "STANDARD",
    createdAt: "2026-09-16T17:22:00",
    deliveryDate: "2026-09-18",
    slot: AFTERNOON,
    deliveryCharge: 2100,
    tax: 6270,
  }),
  order({
    no: 10011,
    customer: "cus_rahim",
    lines: [["brick", 5000], ["sand", 200]],
    status: "DELIVERED",
    payment: "PAID",
    method: "BANK_TRANSFER",
    delivery: "STANDARD",
    createdAt: "2026-09-16T08:45:00",
    deliveryDate: "2026-09-18",
    slot: MORNING,
    deliveryCharge: 6400,
    discount: 4000,
    voucher: "SEPT10",
  }),
  order({
    no: 10010,
    customer: "cus_dilara",
    lines: [["tileFloor", 6]],
    status: "RETURNED",
    payment: "REFUNDED",
    method: "BKASH",
    delivery: "STANDARD",
    createdAt: "2026-09-15T12:40:00",
    deliveryDate: "2026-09-17",
    slot: MIDDAY,
    deliveryCharge: 500,
    closingNote: "Two boxes arrived chipped — full return accepted.",
  }),
  order({
    no: 10009,
    customer: "cus_hub",
    lines: [["cementShah", 150], ["stone", 400]],
    status: "DELIVERED",
    payment: "PAID",
    method: "BANK_TRANSFER",
    delivery: "STANDARD",
    createdAt: "2026-09-14T15:05:00",
    deliveryDate: "2026-09-16",
    slot: MORNING,
    deliveryCharge: 5800,
    discount: 9000,
    voucher: "BULK200",
  }),
  order({
    no: 10008,
    customer: "cus_sadia",
    lines: [["putty", 4], ["nail", 6]],
    status: "DELIVERED",
    payment: "PAID",
    method: "NAGAD",
    delivery: "EXPRESS",
    createdAt: "2026-09-13T11:19:00",
    deliveryDate: "2026-09-14",
    slot: AFTERNOON,
    deliveryCharge: 1100,
  }),
  order({
    no: 10007,
    customer: "cus_nova",
    lines: [["wire", 8]],
    status: "CANCELLED",
    payment: "FAILED",
    method: "CARD",
    delivery: "STANDARD",
    createdAt: "2026-09-12T16:52:00",
    deliveryDate: "2026-09-15",
    slot: MIDDAY,
    deliveryCharge: 600,
    closingNote: "Payment never cleared; the window expired.",
  }),
  order({
    no: 10006,
    customer: "cus_karim",
    lines: [["pipe", 30], ["angle", 20]],
    status: "DELIVERED",
    payment: "PAID",
    method: "BKASH",
    delivery: "STANDARD",
    createdAt: "2026-09-11T09:31:00",
    deliveryDate: "2026-09-13",
    slot: MORNING,
    deliveryCharge: 1800,
  }),
  order({
    no: 10005,
    customer: "cus_tanvir",
    lines: [["cementCrown", 6], ["sand", 40]],
    status: "DELIVERED",
    payment: "PAID",
    method: "COD",
    delivery: "STANDARD",
    createdAt: "2026-09-09T14:10:00",
    deliveryDate: "2026-09-11",
    slot: EVENING,
    deliveryCharge: 550,
  }),
  order({
    no: 10004,
    customer: "cus_metro",
    lines: [["tileFloor", 60], ["tileWall", 40]],
    status: "RETURNED",
    payment: "REFUNDED",
    method: "BANK_TRANSFER",
    delivery: "STANDARD",
    createdAt: "2026-09-06T10:44:00",
    deliveryDate: "2026-09-08",
    slot: MORNING,
    deliveryCharge: 2600,
    closingNote: "Wrong batch shade shipped; replaced under order 10014.",
  }),
  order({
    no: 10003,
    customer: "cus_skyline",
    lines: [["paint", 6]],
    status: "DELIVERED",
    payment: "PAID",
    method: "CARD",
    delivery: "EXPRESS",
    createdAt: "2026-09-03T13:26:00",
    deliveryDate: "2026-09-04",
    slot: MIDDAY,
    deliveryCharge: 1400,
    tax: 3540,
  }),
  order({
    no: 10002,
    customer: "cus_imran",
    lines: [["gypsum", 20]],
    status: "DELIVERED",
    payment: "PAID",
    method: "COD",
    delivery: "CLICK_AND_COLLECT",
    createdAt: "2026-08-30T11:08:00",
    deliveryDate: "2026-08-31",
    slot: AFTERNOON,
    deliveryCharge: 0,
    pickupLocation: "Build360 Barishal Point",
  }),
  order({
    no: 10001,
    customer: "cus_rahim",
    lines: [["rod12", 80], ["cementShah", 60]],
    status: "DELIVERED",
    payment: "PAID",
    method: "BANK_TRANSFER",
    delivery: "STANDARD",
    createdAt: "2026-08-25T09:15:00",
    deliveryDate: "2026-08-27",
    slot: MORNING,
    deliveryCharge: 3900,
    discount: 5000,
    voucher: "BULKSTEEL",
  }),
];

/* -------------------------------------------------------------------------- */
/* Querying                                                                   */
/* -------------------------------------------------------------------------- */

export type OrderFilters = {
  search: string;
  status: OrderStatus | typeof ALL;
  payment: PaymentStatus | typeof ALL;
  method: DeliveryMethodCode | typeof ALL;
  range: DateRange;
  sort: OrderSort;
  /** 1-based, as it appears in the URL. */
  page: number;
};

/** Orders per status for the filter tabs, plus the unfiltered total. */
export type StatusCounts = Record<OrderStatus | typeof ALL, number>;

export type OrderListing = {
  orders: OrderPage;
  /** Counted *before* the status filter, so the tabs never read zero. */
  counts: StatusCounts;
};

/** The earliest `createdAt` a range admits, or null for "all time". */
function rangeStart(range: DateRange): string | null {
  if (range === "all") return null;

  return fixtureDaysAgo(range === "today" ? 0 : range === "7d" ? 6 : 29);
}

function matchesSearch(order: Order, search: string): boolean {
  if (!search) return true;

  const needle = search.toLowerCase();
  return (
    order.orderNo.toLowerCase().includes(needle) ||
    order.address.contactName.toLowerCase().includes(needle) ||
    // Phones are typed with and without the dash, so compare on digits.
    order.address.phone.replace(/\D/g, "").includes(needle.replace(/\D/g, "")) ||
    order.items.some((item) => item.name.toLowerCase().includes(needle))
  );
}

/**
 * One page of orders.
 *
 * Every filter runs here in memory, which is exactly what the real endpoint
 * will not do — but it keeps the URL contract (`?q=`, `?status=`, `?page=`)
 * identical to the products screen, so swapping in `GET /admin/orders` is a
 * change of body, not of interface.
 */
export function listSampleOrders(filters: OrderFilters): OrderListing {
  const from = rangeStart(filters.range);

  // Everything except the status filter, so the tab counts stay meaningful
  // while a status is selected.
  const scoped = SAMPLE_ORDERS.filter(
    (order) =>
      matchesSearch(order, filters.search) &&
      (filters.payment === ALL || order.paymentStatus === filters.payment) &&
      (filters.method === ALL || order.deliveryMethodCode === filters.method) &&
      (from === null || order.createdAt >= from),
  );

  const counts = { ALL: scoped.length } as StatusCounts;
  for (const status of ORDER_PIPELINE) counts[status] = 0;
  counts.CANCELLED = 0;
  counts.RETURNED = 0;
  for (const order of scoped) counts[order.orderStatus] += 1;

  const matched =
    filters.status === ALL
      ? scoped
      : scoped.filter((order) => order.orderStatus === filters.status);

  const ordered = sortOrders(matched, filters.sort);

  const size = ORDER_PAGE_SIZE_DEFAULT;
  const totalPages = Math.max(1, Math.ceil(ordered.length / size));
  const start = (filters.page - 1) * size;

  return {
    orders: {
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

/** One order, or null. Stands in for `GET /admin/orders/{id}`. */
export function findSampleOrder(id: string): Order | null {
  return SAMPLE_ORDERS.find((order) => order.id === id) ?? null;
}

export type OrderSummary = {
  today: number;
  awaitingAction: number;
  onTheRoad: number;
  revenueToday: number;
};

/**
 * The four headline numbers.
 *
 * Read over the whole fixture, never the current filter — these describe the
 * business, and a number that moved when you typed in the search box would be
 * describing the search box.
 */
export function sampleOrderSummary(): OrderSummary {
  const today = SAMPLE_ORDERS.filter((order) =>
    order.createdAt.startsWith(SAMPLE_TODAY),
  );

  return {
    today: today.length,
    awaitingAction: SAMPLE_ORDERS.filter(
      (order) =>
        order.orderStatus === "PENDING" || order.orderStatus === "CONFIRMED",
    ).length,
    onTheRoad: SAMPLE_ORDERS.filter((order) => order.orderStatus === "SHIPPED")
      .length,
    // Cancelled money was never money.
    revenueToday: today
      .filter((order) => order.orderStatus !== "CANCELLED")
      .reduce((total, order) => total + order.totalAmount, 0),
  };
}

/**
 * Every order this account placed, newest first.
 *
 * Only the orders inside this fixture — the account's `lifetimeOrders` counts
 * history that predates it, so this list is deliberately the shorter of the
 * two. The customer screen joins the two here rather than in the customer
 * fixture, which must not import this file: that direction is a cycle.
 */
export function listSampleOrdersForCustomer(customerId: string): Order[] {
  return sortOrders(
    SAMPLE_ORDERS.filter((order) => order.customerId === customerId),
    "newest",
  );
}

/**
 * Throws rather than returning null.
 *
 * The refunds fixture addresses orders by a literal id; a typo there is a bug
 * in the fixture, not a missing record, and should stop the build rather than
 * render a refund against nothing.
 */
export function requireSampleOrder(id: string): Order {
  const found = findSampleOrder(id);
  if (!found) throw new Error(`Unknown fixture order: ${id}`);

  return found;
}

/**
 * One order by its human-facing number, e.g. `"B360-10019"`.
 *
 * The inventory ledger records which order took stock off a shelf, and it
 * records the number a person would recognise rather than an id. This is how
 * that reference becomes a link — resolved by the route, so the inventory
 * fixture never has to import this one.
 */
export function findSampleOrderByNo(orderNo: string): Order | null {
  return SAMPLE_ORDERS.find((order) => order.orderNo === orderNo) ?? null;
}

/**
 * Every order that redeemed a voucher code, newest first.
 *
 * The coupons fixture has no idea which orders used it — the join happens in
 * the route, so the two fixtures stay independent.
 */
export function listSampleOrdersForVoucher(code: string): Order[] {
  return sortOrders(
    SAMPLE_ORDERS.filter((order) => order.voucherCode === code),
    "newest",
  );
}

/**
 * Every order in the fixture, newest first.
 *
 * For the reports screen, which aggregates rather than pages. Returns a copy:
 * a caller that sorted the array in place would silently reorder the fixture
 * for every other screen in the same request.
 */
export function allSampleOrders(): Order[] {
  return [...SAMPLE_ORDERS];
}
