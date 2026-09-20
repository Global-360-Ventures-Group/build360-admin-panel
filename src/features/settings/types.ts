/**
 * Settings models.
 *
 * **There is no settings API.** Not a store profile, a tax rate, a currency, a
 * payment configuration or a notification preference anywhere in the spec —
 * and no `SETTINGS_*` permission. The nearest thing to "reset a password" is
 * `/auth/customer/forgot-password`, which is for *shoppers*; a backoffice user
 * has no password endpoint at all, so a staff password can only ever be set at
 * create time through `CreateStaffRequest.password`.
 *
 * That makes this screen a different shape from the other sample pages. It is
 * not wholly invented — three of its sections are entirely real:
 *
 * - **Your account** reads `/auth/user/me`, which the dashboard layout already
 *   fetches. The roles and permissions shown are the ones actually in force.
 * - **Appearance** genuinely works. It is client-side, so the missing API
 *   costs it nothing.
 * - **Where the real settings live** links to the parts of the panel that are
 *   already wired — delivery, staff, roles, the catalogue — and greys out the
 *   ones the signed-in user has no permission for.
 *
 * So rather than one blanket "sample data" bar, every card carries its own
 * status: `live` when it reads or writes something real, `proposal` when the
 * API has nowhere to put it. A page that is half real and says so is more
 * useful than one that disclaims itself wholesale.
 */

import type { PaymentMethod } from "@/features/orders/types";

/** Whether a card is backed by something, and by what. */
export type SectionStatus = "live" | "proposal";

/** Not in the API: the business behind the storefront. */
export type StoreProfile = {
  name: string;
  legalName: string;
  tradeLicence: string;
  binNumber: string;
  supportEmail: string;
  supportPhone: string;
  addressLine1: string;
  district: string;
  division: string;
  postalCode: string;
};

/**
 * Not in the API.
 *
 * `OrderResponse` really does carry a `tax` field, and the orders fixture puts
 * VAT on a few orders — but nothing anywhere says what rate produced it or
 * whether prices are quoted inclusive. That gap is what this section is for.
 */
export type TaxSettings = {
  /** ISO code. `formatCurrency` hard-codes BDT today. */
  currency: string;
  /** Percent. */
  vatRate: number;
  /** Whether catalogue prices already include VAT. */
  pricesIncludeVat: boolean;
  /** Printed on every invoice. */
  vatRegistration: string;
};

/**
 * Not in the API.
 *
 * The six methods are real — they are `OrderResponse.paymentMethod`'s enum —
 * and `/payments/initiate` really does open a gateway session. What is missing
 * is anything that says which of them a shop accepts, or holds a key.
 */
export type PaymentSetting = {
  method: PaymentMethod;
  enabled: boolean;
  /** How the money actually arrives, in words. */
  note: string;
};

export type SettingsFixture = {
  store: StoreProfile;
  tax: TaxSettings;
  payments: PaymentSetting[];
};

/**
 * The parts of the panel that really do configure something.
 *
 * `permission` is the code the API enforces, so the card can grey out a link
 * the signed-in user cannot use rather than sending them to a `forbidden()`.
 */
export type SettingsLink = {
  title: string;
  description: string;
  href: string;
  permission: string;
};

export const SETTINGS_LINKS: SettingsLink[] = [
  {
    title: "Delivery",
    description:
      "Methods, time slots, pickup points, the booking calendar and its restrictions.",
    href: "/delivery",
    permission: "DELIVERY_CONFIG_VIEW",
  },
  {
    title: "Staff",
    description: "Who can sign in to this panel, and whether their account is active.",
    href: "/staff",
    permission: "USER_MANAGEMENT",
  },
  {
    title: "Roles",
    description: "What each role grants. Permissions are code-defined; roles bundle them.",
    href: "/roles",
    permission: "USER_MANAGEMENT",
  },
  {
    title: "Categories",
    description: "The storefront's category tree, its ordering and its icons.",
    href: "/categories",
    permission: "CATEGORY_VIEW",
  },
  {
    title: "Brands",
    description: "Brands, and which of them are curated into the Home top-brands row.",
    href: "/brands",
    permission: "BRAND_VIEW",
  },
];

/**
 * Permissions grouped by their subject.
 *
 * The catalogue is code-defined and already carries its grouping in the code
 * itself — `PRODUCT_VIEW`, `PRODUCT_CREATE` — so the prefix is the group.
 *
 * One exception, and it is a real one rather than a formatting nicety:
 * `USER_MANAGEMENT` is the grant that opens the **staff** screens, while
 * `USER_VIEW` is a separate code about customers. Grouping both under "User"
 * would file two unrelated powers together and read as if one implied the
 * other, so `USER_MANAGEMENT` is shown under Staff — which is what it
 * actually governs.
 */
export function groupPermissions(
  permissions: string[],
): { subject: string; codes: string[] }[] {
  const groups = new Map<string, string[]>();

  for (const code of [...permissions].sort()) {
    const [prefix] = code.split("_");
    const subject = code === "USER_MANAGEMENT" ? "STAFF" : prefix;

    groups.set(subject, [...(groups.get(subject) ?? []), code]);
  }

  return [...groups.entries()]
    .map(([subject, codes]) => ({ subject: titleCase(subject), codes }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
}

/** "DELIVERY" -> "Delivery"; "PRODUCT" -> "Product". */
function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

/** "PRODUCT_VIEW" -> "View"; "USER_MANAGEMENT" -> "Management". */
export function permissionAction(code: string): string {
  const parts = code.split("_");
  const action = parts.length > 1 ? parts.slice(1).join(" ") : code;

  return action.charAt(0) + action.slice(1).toLowerCase();
}
