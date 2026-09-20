/**
 * The customer fixture.
 *
 * Fourteen accounts standing in for an admin customer API that does not exist
 * — see the note at the top of `./types`.
 *
 * This file is the **root** of the fixture set: the orders fixture reads its
 * customers from here, and the refunds fixture reads them through the orders.
 * That direction is deliberate and must not be reversed — a customer record
 * that counted its own orders would import the orders fixture, which imports
 * this one, and the cycle would break the build. Joining the two is the
 * *route's* job (see `/users/[id]`), not the fixture's.
 *
 * `lifetimeOrders` and `lifetimeSpend` therefore cover the account's whole
 * history, most of which predates the thirty orders in the orders fixture.
 * "Recent orders" on the detail screen will always be the shorter list, and
 * that is the honest relationship between the two numbers.
 */

import { SAMPLE_TODAY } from "@/lib/fixtures";

import {
  ALL,
  CUSTOMER_PAGE_SIZE_DEFAULT,
  isTradeAccount,
  sortCustomers,
  type Customer,
  type CustomerAddress,
  type CustomerPage,
  type CustomerSort,
  type CustomerStatus,
  type CustomerType,
  type VerifiedFilter,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Builder                                                                    */
/* -------------------------------------------------------------------------- */

type AddressSeed = Omit<CustomerAddress, "id" | "formattedAddress"> & {
  formattedAddress?: string;
};

type CustomerSeed = Omit<Customer, "addresses"> & {
  addresses: AddressSeed[];
};

/**
 * Fills in the two fields that are always derivable.
 *
 * `formattedAddress` is what the API returns pre-assembled; writing it out by
 * hand fourteen times is fourteen chances for it to disagree with its own
 * parts.
 */
function customer(seed: CustomerSeed): Customer {
  return {
    ...seed,
    addresses: seed.addresses.map((address, index) => ({
      ...address,
      id: `adr_${seed.id.replace(/^cus_/, "")}_${index + 1}`,
      formattedAddress:
        address.formattedAddress ??
        `${address.addressLine1}, ${address.upazila}, ${address.district} ${address.postalCode}`,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* The customers                                                              */
/* -------------------------------------------------------------------------- */

export const SAMPLE_CUSTOMERS: Customer[] = [
  customer({
    id: "cus_rahim",
    fullName: "Abdur Rahim",
    businessName: "Rahim Traders",
    email: "accounts@rahimtraders.com.bd",
    phone: "01711-204488",
    customerType: "DEALER",
    verified: true,
    status: "ACTIVE",
    wishlistCount: 12,
    lifetimeOrders: 37,
    lifetimeSpend: 4_820_000,
    lastOrderAt: "2026-09-20T14:42:00",
    createdAt: "2024-03-11T10:20:00",
    note: "Opens a 30-bag cement order most weeks. Calls the desk before paying.",
    addresses: [
      {
        addressLabel: "WAREHOUSE",
        contactName: "Rahim Traders",
        phone: "01711-204488",
        addressLine1: "House 42, Road 7, Block C, Mirpur 10",
        division: "Dhaka",
        district: "Dhaka",
        upazila: "Mirpur",
        postalCode: "1216",
        isDefault: true,
      },
      {
        addressLabel: "OFFICE",
        contactName: "Abdur Rahim",
        phone: "01711-204488",
        addressLine1: "Shop 14, Mirpur Building Materials Market",
        division: "Dhaka",
        district: "Dhaka",
        upazila: "Mirpur",
        postalCode: "1216",
        isDefault: false,
      },
    ],
  }),
  customer({
    id: "cus_nova",
    fullName: "Farhana Islam",
    businessName: "Nova Builders Ltd.",
    email: "procurement@novabuilders.bd",
    phone: "01819-663201",
    customerType: "BUILDER",
    verified: true,
    status: "ACTIVE",
    wishlistCount: 4,
    lifetimeOrders: 21,
    lifetimeSpend: 3_140_000,
    lastOrderAt: "2026-09-20T10:55:00",
    createdAt: "2024-11-02T16:45:00",
    note: "Two live sites. Always books the afternoon slot — gate closes at 5.",
    addresses: [
      {
        addressLabel: "OFFICE",
        contactName: "Nova Builders Ltd.",
        phone: "01819-663201",
        addressLine1: "Block J, Road 12, Bashundhara R/A",
        division: "Dhaka",
        district: "Dhaka",
        upazila: "Vatara",
        postalCode: "1229",
        isDefault: true,
      },
      {
        addressLabel: "CONSTRUCTION_SITE",
        contactName: "Site foreman — Jamal",
        phone: "01722-554107",
        addressLine1: "Plot 31, Sector 13, Uttara (Tower B site)",
        division: "Dhaka",
        district: "Dhaka",
        upazila: "Uttara",
        postalCode: "1230",
        isDefault: false,
      },
    ],
  }),
  customer({
    id: "cus_hub",
    fullName: "Shahidul Alam",
    businessName: "Construction Hub Ltd.",
    email: "shahidul@constructionhub.com.bd",
    phone: "01755-880914",
    customerType: "CORPORATE",
    verified: true,
    status: "ACTIVE",
    wishlistCount: 0,
    lifetimeOrders: 52,
    lifetimeSpend: 11_600_000,
    lastOrderAt: "2026-09-20T12:30:00",
    createdAt: "2023-08-19T09:05:00",
    note: "Largest account. Pays by bank transfer, 50% up front on steel.",
    addresses: [
      {
        addressLabel: "OFFICE",
        contactName: "Construction Hub Ltd.",
        phone: "01755-880914",
        addressLine1: "1247 Sholoshahar, Pahartali",
        division: "Chattogram",
        district: "Chattogram",
        upazila: "Pahartali",
        postalCode: "4202",
        isDefault: true,
      },
      {
        addressLabel: "CONSTRUCTION_SITE",
        contactName: "Store in-charge",
        phone: "01766-201884",
        addressLine1: "CDA Avenue site office, East Nasirabad",
        division: "Chattogram",
        district: "Chattogram",
        upazila: "Khulshi",
        postalCode: "4225",
        isDefault: false,
      },
      {
        addressLabel: "WAREHOUSE",
        contactName: "Central store",
        phone: "01755-880916",
        addressLine1: "Kalurghat Industrial Area, Shed 9",
        division: "Chattogram",
        district: "Chattogram",
        upazila: "Chandgaon",
        postalCode: "4212",
        isDefault: false,
      },
    ],
  }),
  customer({
    id: "cus_karim",
    fullName: "Karim Uddin",
    businessName: "Karim & Co.",
    email: "karim.co.bd@gmail.com",
    phone: "01913-447725",
    customerType: "CONTRACTOR",
    verified: true,
    status: "ACTIVE",
    wishlistCount: 7,
    lifetimeOrders: 14,
    lifetimeSpend: 1_260_000,
    lastOrderAt: "2026-09-20T10:12:00",
    createdAt: "2025-05-27T12:10:00",
    note: null,
    addresses: [
      {
        addressLabel: "CONSTRUCTION_SITE",
        contactName: "Karim & Co.",
        phone: "01913-447725",
        addressLine1: "Silmun, Tongi Bazar Road",
        division: "Dhaka",
        district: "Gazipur",
        upazila: "Tongi",
        postalCode: "1710",
        isDefault: true,
      },
    ],
  }),
  customer({
    id: "cus_skyline",
    fullName: "Nusrat Jahan",
    businessName: "Skyline Developers",
    email: "nusrat@skylinedev.bd",
    phone: "01677-903312",
    customerType: "BUILDER",
    verified: true,
    status: "ACTIVE",
    wishlistCount: 19,
    lifetimeOrders: 9,
    lifetimeSpend: 940_000,
    lastOrderAt: "2026-09-20T08:20:00",
    createdAt: "2025-12-14T11:33:00",
    note: "Finishing work only — tiles, paint, board. Never orders structural.",
    addresses: [
      {
        addressLabel: "OFFICE",
        contactName: "Skyline Developers",
        phone: "01677-903312",
        addressLine1: "Plot 18, Sector 7, Uttara",
        division: "Dhaka",
        district: "Dhaka",
        upazila: "Uttara",
        postalCode: "1230",
        isDefault: true,
      },
    ],
  }),
  customer({
    id: "cus_metro",
    fullName: "Anwar Hossain",
    businessName: "Metro Constructions",
    email: "anwar@metroconstructions.bd",
    phone: "01962-771408",
    customerType: "CONTRACTOR",
    verified: true,
    status: "ACTIVE",
    wishlistCount: 2,
    lifetimeOrders: 28,
    lifetimeSpend: 5_380_000,
    lastOrderAt: "2026-09-20T09:05:00",
    createdAt: "2024-06-08T14:52:00",
    note: "Two tile returns this quarter — check the batch shade before dispatch.",
    addresses: [
      {
        addressLabel: "OFFICE",
        contactName: "Metro Constructions",
        phone: "01962-771408",
        addressLine1: "Pagla Bazar Road, Fatullah",
        division: "Dhaka",
        district: "Narayanganj",
        upazila: "Fatullah",
        postalCode: "1420",
        isDefault: true,
      },
    ],
  }),
  customer({
    id: "cus_tanvir",
    fullName: "Tanvir Hossain",
    businessName: null,
    email: "tanvir.hossain91@gmail.com",
    phone: "01521-338907",
    customerType: "PERSONAL",
    verified: true,
    status: "ACTIVE",
    wishlistCount: 5,
    lifetimeOrders: 4,
    lifetimeSpend: 78_400,
    lastOrderAt: "2026-09-20T11:46:00",
    createdAt: "2026-02-21T19:08:00",
    note: null,
    addresses: [
      {
        addressLabel: "HOME",
        contactName: "Tanvir Hossain",
        phone: "01521-338907",
        addressLine1: "Majid Sarani, Sonadanga",
        division: "Khulna",
        district: "Khulna",
        upazila: "Sonadanga",
        postalCode: "9100",
        isDefault: true,
      },
    ],
  }),
  customer({
    id: "cus_dilara",
    fullName: "Dilara Ferdous",
    businessName: null,
    email: "dilara.ferdous@outlook.com",
    phone: "01784-220561",
    customerType: "PERSONAL",
    verified: false,
    status: "ACTIVE",
    wishlistCount: 1,
    lifetimeOrders: 2,
    lifetimeSpend: 24_900,
    lastOrderAt: "2026-09-19T18:04:00",
    createdAt: "2026-08-30T20:41:00",
    note: "Phone never verified — OTP bounced twice. Confirm by call before dispatch.",
    addresses: [
      {
        addressLabel: "HOME",
        contactName: "Dilara Ferdous",
        phone: "01784-220561",
        addressLine1: "Greater Road, Boalia",
        division: "Rajshahi",
        district: "Rajshahi",
        upazila: "Boalia",
        postalCode: "6000",
        isDefault: true,
      },
    ],
  }),
  customer({
    id: "cus_sadia",
    fullName: "Sadia Rahman",
    businessName: null,
    email: "sadia.rahman.arch@gmail.com",
    phone: "01886-552103",
    customerType: "ARCHITECT",
    verified: true,
    status: "ACTIVE",
    wishlistCount: 34,
    lifetimeOrders: 7,
    lifetimeSpend: 186_500,
    lastOrderAt: "2026-09-20T13:58:00",
    createdAt: "2025-09-03T15:27:00",
    note: "Specifies for clients — the wishlist is a spec board, not a basket.",
    addresses: [
      {
        addressLabel: "OFFICE",
        contactName: "Sadia Rahman",
        phone: "01886-552103",
        addressLine1: "Shibganj Main Road",
        division: "Sylhet",
        district: "Sylhet",
        upazila: "Sylhet Sadar",
        postalCode: "3100",
        isDefault: true,
      },
    ],
  }),
  customer({
    id: "cus_imran",
    fullName: "Imran Kabir",
    businessName: null,
    email: "imran.kabir.eng@gmail.com",
    phone: "01733-118264",
    customerType: "ENGINEER",
    verified: true,
    status: "ACTIVE",
    wishlistCount: 3,
    lifetimeOrders: 3,
    lifetimeSpend: 41_200,
    lastOrderAt: "2026-09-20T09:38:00",
    createdAt: "2026-06-12T08:55:00",
    note: "Collects from the Barishal point rather than taking delivery.",
    addresses: [
      {
        addressLabel: "HOME",
        contactName: "Imran Kabir",
        phone: "01733-118264",
        addressLine1: "Band Road, Barishal",
        division: "Barishal",
        district: "Barishal",
        upazila: "Kotwali",
        postalCode: "8200",
        isDefault: true,
      },
    ],
  }),

  /* Accounts with no order in the orders fixture — the states the list has to
     handle that a "happy" fixture would never produce. */

  customer({
    id: "cus_rezaul",
    fullName: "Rezaul Karim",
    businessName: "RK Enterprise",
    email: "rk.enterprise.ctg@gmail.com",
    phone: "01829-664410",
    customerType: "DEALER",
    verified: true,
    status: "BLOCKED",
    wishlistCount: 0,
    lifetimeOrders: 11,
    lifetimeSpend: 612_000,
    lastOrderAt: "2026-04-02T11:15:00",
    createdAt: "2025-01-30T10:00:00",
    note: "Blocked in April: three chargebacks on card orders. Finance is aware.",
    addresses: [
      {
        addressLabel: "WAREHOUSE",
        contactName: "RK Enterprise",
        phone: "01829-664410",
        addressLine1: "Agrabad Access Road, Shed 4",
        division: "Chattogram",
        district: "Chattogram",
        upazila: "Double Mooring",
        postalCode: "4100",
        isDefault: true,
      },
    ],
  }),
  customer({
    id: "cus_mahbub",
    fullName: "Mahbub Alam",
    businessName: null,
    email: "mahbub.alam.des@gmail.com",
    phone: "01611-772093",
    customerType: "DESIGNER",
    verified: true,
    status: "DORMANT",
    wishlistCount: 8,
    lifetimeOrders: 2,
    lifetimeSpend: 33_800,
    lastOrderAt: "2026-01-18T13:40:00",
    createdAt: "2025-11-06T17:22:00",
    note: null,
    addresses: [
      {
        addressLabel: "HOME",
        contactName: "Mahbub Alam",
        phone: "01611-772093",
        addressLine1: "Road 5, Dhanmondi",
        division: "Dhaka",
        district: "Dhaka",
        upazila: "Dhanmondi",
        postalCode: "1205",
        isDefault: true,
      },
    ],
  }),
  customer({
    id: "cus_shirin",
    fullName: "Shirin Akter",
    businessName: null,
    email: "shirin.akter.bd@gmail.com",
    phone: "01977-440186",
    customerType: "PERSONAL",
    verified: false,
    status: "ACTIVE",
    wishlistCount: 6,
    // Registered, browsed, never checked out — the state every storefront has
    // more of than it likes.
    lifetimeOrders: 0,
    lifetimeSpend: 0,
    lastOrderAt: null,
    createdAt: "2026-09-16T21:14:00",
    note: null,
    addresses: [],
  }),
  customer({
    id: "cus_bashir",
    fullName: "Bashir Ahmed",
    businessName: "Ahmed Builders",
    email: "bashir@ahmedbuilders.bd",
    phone: "01745-330922",
    customerType: "BUILDER",
    verified: true,
    status: "DORMANT",
    wishlistCount: 0,
    lifetimeOrders: 6,
    lifetimeSpend: 470_000,
    lastOrderAt: "2026-02-27T09:31:00",
    createdAt: "2024-09-15T13:05:00",
    note: "Site finished in February. Worth a call before the next project.",
    addresses: [
      {
        addressLabel: "OFFICE",
        contactName: "Ahmed Builders",
        phone: "01745-330922",
        addressLine1: "Station Road, Boalia",
        division: "Rajshahi",
        district: "Rajshahi",
        upazila: "Boalia",
        postalCode: "6000",
        isDefault: true,
      },
    ],
  }),
];

/** By id, for the order fixture and the detail route. */
const BY_ID = new Map(SAMPLE_CUSTOMERS.map((one) => [one.id, one]));

export function findSampleCustomer(id: string): Customer | null {
  return BY_ID.get(id) ?? null;
}

/**
 * Throws rather than returning null.
 *
 * The orders fixture addresses customers by a literal id; a typo there is a
 * bug in the fixture, not a missing record, and should stop the build rather
 * than render an order belonging to nobody.
 */
export function requireSampleCustomer(id: string): Customer {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Unknown fixture customer: ${id}`);

  return found;
}

/* -------------------------------------------------------------------------- */
/* Querying                                                                   */
/* -------------------------------------------------------------------------- */

export type CustomerFilters = {
  search: string;
  status: CustomerStatus | typeof ALL;
  type: CustomerType | typeof ALL;
  verified: VerifiedFilter | typeof ALL;
  sort: CustomerSort;
  /** 1-based, as it appears in the URL. */
  page: number;
};

export type StatusCounts = Record<CustomerStatus | typeof ALL, number>;

export type CustomerListing = {
  customers: CustomerPage;
  /** Counted *before* the status filter, so the tabs never read zero. */
  counts: StatusCounts;
};

function matchesSearch(one: Customer, search: string): boolean {
  if (!search) return true;

  const needle = search.toLowerCase();
  const digits = needle.replace(/\D/g, "");

  return (
    one.fullName.toLowerCase().includes(needle) ||
    (one.businessName?.toLowerCase().includes(needle) ?? false) ||
    one.email.toLowerCase().includes(needle) ||
    // Phones are typed with and without the dash, so compare on digits.
    (digits.length > 0 && one.phone.replace(/\D/g, "").includes(digits))
  );
}

/**
 * One page of customers.
 *
 * Same URL contract as products and orders (`?q=`, `?status=`, `?page=`), so
 * swapping in a real endpoint is a change of body, not of interface.
 */
export function listSampleCustomers(
  filters: CustomerFilters,
): CustomerListing {
  // Everything except the status filter, so the tab counts stay meaningful
  // while a status is selected.
  const scoped = SAMPLE_CUSTOMERS.filter(
    (one) =>
      matchesSearch(one, filters.search) &&
      (filters.type === ALL || one.customerType === filters.type) &&
      (filters.verified === ALL ||
        one.verified === (filters.verified === "verified")),
  );

  const counts: StatusCounts = {
    ALL: scoped.length,
    ACTIVE: 0,
    DORMANT: 0,
    BLOCKED: 0,
  };
  for (const one of scoped) counts[one.status] += 1;

  const matched =
    filters.status === ALL
      ? scoped
      : scoped.filter((one) => one.status === filters.status);

  const ordered = sortCustomers(matched, filters.sort);

  const size = CUSTOMER_PAGE_SIZE_DEFAULT;
  const totalPages = Math.max(1, Math.ceil(ordered.length / size));
  const start = (filters.page - 1) * size;

  return {
    customers: {
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

export type CustomerSummary = {
  total: number;
  newThisMonth: number;
  trade: number;
  blockedOrDormant: number;
};

/**
 * The four headline numbers.
 *
 * Read over the whole fixture, never the current filter — these describe the
 * book of customers, and a number that moved when you typed in the search box
 * would be describing the search box.
 */
export function sampleCustomerSummary(): CustomerSummary {
  const month = SAMPLE_TODAY.slice(0, 7);

  return {
    total: SAMPLE_CUSTOMERS.length,
    newThisMonth: SAMPLE_CUSTOMERS.filter((one) =>
      one.createdAt.startsWith(month),
    ).length,
    trade: SAMPLE_CUSTOMERS.filter((one) => isTradeAccount(one.customerType))
      .length,
    blockedOrDormant: SAMPLE_CUSTOMERS.filter((one) => one.status !== "ACTIVE")
      .length,
  };
}
