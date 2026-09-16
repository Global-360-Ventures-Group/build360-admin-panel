/**
 * Delivery methods, mirroring `AdminDeliveryMethodResponse`.
 *
 * The three methods are fixed by the backend: `STANDARD`, `EXPRESS` and
 * `CLICK_AND_COLLECT`. There is no create and no delete, and `code` and
 * `requiresPickupLocation` are not on the update body — so this screen edits
 * how a method *presents* (name, description, badge, order) and switches it on
 * or off. Nothing here can invent a fourth method.
 */

export type DeliveryMethodCode = "STANDARD" | "EXPRESS" | "CLICK_AND_COLLECT";

export type DeliveryMethod = {
  id: string;
  code: DeliveryMethodCode;
  name: string;
  description: string;
  badge: string;
  /**
   * True for Click & Collect. A calendar slot on a method with this set must
   * name a pickup location, which is what ties the two screens together.
   */
  requiresPickupLocation: boolean;
  active: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** What the edit form collects — every field `DeliveryMethodUpdateRequest` has. */
export type DeliveryMethodFormValues = {
  name: string;
  description: string;
  badge: string;
  /** Kept as a string because it comes off an `<input>`; "" means unset. */
  displayOrder: string;
};

/** Field limits taken from `DeliveryMethodUpdateRequest`. */
export const DELIVERY_METHOD_LIMITS = {
  name: 100,
  description: 2000,
  badge: 40,
} as const;

/** Readable form of the fixed codes, for a heading. */
export const deliveryMethodCodeLabels: Record<DeliveryMethodCode, string> = {
  STANDARD: "Standard",
  EXPRESS: "Express",
  CLICK_AND_COLLECT: "Click & Collect",
};

/** Methods in the order the storefront shows them. */
export function sortDeliveryMethods(methods: DeliveryMethod[]): DeliveryMethod[] {
  return [...methods].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.code.localeCompare(b.code),
  );
}
