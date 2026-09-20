/**
 * Customer models.
 *
 * **There is no admin customer API.** `/admin/users` is *staff* (tagged
 * Backoffice Staff, guarded by `USER_MANAGEMENT`) — that is the Staff screen,
 * not this one. Shoppers exist only behind self-service endpoints:
 * `/auth/customer/*`, `/customer/addresses`, `/customer/wishlist`. Nothing
 * lists them, reads one from the back office, or blocks one.
 *
 * So this screen runs on the fixture in `./sample-data`, and the shapes below
 * follow `CustomerSummaryResponse` and `CustomerAddressResponse` where the
 * spec defines them. Two things are taken straight from the API and are worth
 * not "simplifying" later:
 *
 * - **`customerType` is a trade, not a tier.** Eight values, from `PERSONAL`
 *   through `CONTRACTOR` to `CORPORATE` — not retail-vs-business. The
 *   retail/trade split this panel shows is *derived* from it, by
 *   `isTradeAccount`, and lives nowhere in the API.
 * - **An address carries a label**, including `CONSTRUCTION_SITE` — which is
 *   why a delivery address here is not simply "home or office".
 *
 * Everything the API has no field for is marked `Not in the API` at its
 * declaration, so nobody wires it to a response that will never carry it.
 */

import type { Tone } from "@/lib/tone";

/** The eight values `CustomerSummaryResponse.customerType` can hold. */
export type CustomerType =
  | "PERSONAL"
  | "BUILDER"
  | "CONTRACTOR"
  | "ENGINEER"
  | "ARCHITECT"
  | "DESIGNER"
  | "DEALER"
  | "CORPORATE";

export const CUSTOMER_TYPES: CustomerType[] = [
  "PERSONAL",
  "BUILDER",
  "CONTRACTOR",
  "ENGINEER",
  "ARCHITECT",
  "DESIGNER",
  "DEALER",
  "CORPORATE",
];

export const customerTypeLabels: Record<CustomerType, string> = {
  PERSONAL: "Personal",
  BUILDER: "Builder",
  CONTRACTOR: "Contractor",
  ENGINEER: "Engineer",
  ARCHITECT: "Architect",
  DESIGNER: "Designer",
  DEALER: "Dealer",
  CORPORATE: "Corporate",
};

/**
 * Everything except `PERSONAL` buys for a job rather than for a house.
 *
 * The distinction is this panel's, not the API's: it decides whether a row
 * gets the business mark and whether "trade accounts" counts it.
 */
export function isTradeAccount(type: CustomerType): boolean {
  return type !== "PERSONAL";
}

/** The five values `CustomerAddressResponse.addressLabel` can hold. */
export type AddressLabel =
  | "HOME"
  | "OFFICE"
  | "CONSTRUCTION_SITE"
  | "WAREHOUSE"
  | "OTHER";

export const addressLabelNames: Record<AddressLabel, string> = {
  HOME: "Home",
  OFFICE: "Office",
  CONSTRUCTION_SITE: "Site",
  WAREHOUSE: "Warehouse",
  OTHER: "Other",
};

export type CustomerAddress = {
  id: string;
  addressLabel: AddressLabel;
  contactName: string;
  phone: string;
  addressLine1: string;
  division: string;
  district: string;
  upazila: string;
  postalCode: string;
  formattedAddress: string;
  isDefault: boolean;
};

/**
 * Not in the API.
 *
 * There is no account state on a customer anywhere in the spec — no block, no
 * deactivate, no status field. This exists because an admin panel that cannot
 * say "this account is blocked" is not describing a real business, but it is
 * the first thing to check against the API before anyone builds on it.
 */
export type CustomerStatus = "ACTIVE" | "DORMANT" | "BLOCKED";

export const CUSTOMER_STATUSES: CustomerStatus[] = [
  "ACTIVE",
  "DORMANT",
  "BLOCKED",
];

export const customerStatusLabels: Record<CustomerStatus, string> = {
  ACTIVE: "Active",
  DORMANT: "Dormant",
  BLOCKED: "Blocked",
};

export const customerStatusHints: Record<CustomerStatus, string> = {
  ACTIVE: "Signed in or ordered recently",
  DORMANT: "No order in the last six months",
  BLOCKED: "Barred from checkout by an admin",
};

export const customerStatusTone: Record<CustomerStatus, Tone> = {
  ACTIVE: "success",
  DORMANT: "neutral",
  BLOCKED: "danger",
};

export type Customer = {
  id: string;
  fullName: string;
  /** Not in the API: the trading name a `CORPORATE` or `DEALER` invoices as. */
  businessName: string | null;
  email: string;
  phone: string;
  customerType: CustomerType;
  /** Phone verified by OTP — the one account flag the API really has. */
  verified: boolean;
  /** Not in the API — see `CustomerStatus`. */
  status: CustomerStatus;
  addresses: CustomerAddress[];
  /** Not in the API: `/customer/wishlist` is the owner's own view only. */
  wishlistCount: number;
  /**
   * Not in the API. Lifetime, so it counts orders older than the orders
   * fixture — the customer's "Recent orders" table will always be shorter.
   */
  lifetimeOrders: number;
  /** Not in the API. Lifetime spend in BDT, net of refunds. */
  lifetimeSpend: number;
  /** Not in the API. Null for an account that has never ordered. */
  lastOrderAt: string | null;
  createdAt: string;
  /** Not in the API: what the desk wants the next person to know. */
  note: string | null;
};

/** One page of customers, shaped like every other paged response here. */
export type CustomerPage = {
  content: Customer[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export const CUSTOMER_PAGE_SIZE_DEFAULT = 12;

/** Sentinel for "no filter", which a select cannot carry as "". */
export const ALL = "ALL";

export const VERIFIED_FILTERS = ["verified", "unverified"] as const;

export type VerifiedFilter = (typeof VERIFIED_FILTERS)[number];

export const verifiedFilterLabels: Record<VerifiedFilter, string> = {
  verified: "Phone verified",
  unverified: "Not verified",
};

export type CustomerSort =
  | "recent"
  | "name"
  | "orders-desc"
  | "spend-desc"
  | "newest";

export const CUSTOMER_SORTS: CustomerSort[] = [
  "recent",
  "newest",
  "name",
  "orders-desc",
  "spend-desc",
];

export const customerSortLabels: Record<CustomerSort, string> = {
  recent: "Recently active",
  newest: "Newest sign-ups",
  name: "Name A–Z",
  "orders-desc": "Most orders",
  "spend-desc": "Highest spend",
};

export function parseCustomerSort(value: string | undefined): CustomerSort {
  return CUSTOMER_SORTS.includes(value as CustomerSort)
    ? (value as CustomerSort)
    : "recent";
}

export function parseCustomerStatus(
  value: string | undefined,
): CustomerStatus | typeof ALL {
  return CUSTOMER_STATUSES.includes(value as CustomerStatus)
    ? (value as CustomerStatus)
    : ALL;
}

export function parseCustomerType(
  value: string | undefined,
): CustomerType | typeof ALL {
  return CUSTOMER_TYPES.includes(value as CustomerType)
    ? (value as CustomerType)
    : ALL;
}

export function parseVerifiedFilter(
  value: string | undefined,
): VerifiedFilter | typeof ALL {
  return VERIFIED_FILTERS.includes(value as VerifiedFilter)
    ? (value as VerifiedFilter)
    : ALL;
}

/** The address a delivery defaults to, or the first one on file. */
export function defaultAddress(customer: Customer): CustomerAddress | null {
  return (
    customer.addresses.find((address) => address.isDefault) ??
    customer.addresses[0] ??
    null
  );
}

/**
 * Lifetime spend over lifetime orders.
 *
 * Zero orders returns null rather than 0 — "never bought anything" and
 * "averages nothing per order" are different facts and must not render alike.
 */
export function averageOrderValue(customer: Customer): number | null {
  if (customer.lifetimeOrders === 0) return null;

  return Math.round(customer.lifetimeSpend / customer.lifetimeOrders);
}

export function sortCustomers(
  customers: Customer[],
  sort: CustomerSort,
): Customer[] {
  const sorted = [...customers];

  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "name":
      return sorted.sort((a, b) => a.fullName.localeCompare(b.fullName));
    case "orders-desc":
      return sorted.sort((a, b) => b.lifetimeOrders - a.lifetimeOrders);
    case "spend-desc":
      return sorted.sort((a, b) => b.lifetimeSpend - a.lifetimeSpend);
    case "recent":
    default:
      // Never-ordered accounts sort last rather than first — an empty string
      // would otherwise win a descending comparison.
      return sorted.sort((a, b) =>
        (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? ""),
      );
  }
}
