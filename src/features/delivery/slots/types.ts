/**
 * Reusable delivery time slots, mirroring `AdminDeliverySlotResponse`.
 *
 * A slot here is a *window*, not a booking: "10am–11am", defined once and then
 * attached to as many calendar days as you like, each with its own capacity
 * and price. Nothing on this screen books anything.
 *
 * There is no delete. A slot that should stop being offered is deactivated,
 * which leaves the calendar days already built on it alone.
 */

export type DayPart = "MORNING" | "AFTERNOON" | "EVENING";

export type DeliverySlot = {
  id: string;
  name: string;
  /** `"10:00:00"` or `"10:00"` — see `toTimeInput` in `../shared`. */
  startTime: string;
  endTime: string;
  /** Optional at the API; "" when the slot has not been filed under one. */
  dayPart: DayPart | "";
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

/** What the create/edit form collects. Times are `HH:mm`, as the input gives. */
export type DeliverySlotFormValues = {
  name: string;
  startTime: string;
  endTime: string;
  dayPart: DayPart | "";
  /** Kept as a string because it comes off an `<input>`; "" means unset. */
  displayOrder: string;
};

export const emptyDeliverySlotForm: DeliverySlotFormValues = {
  name: "",
  startTime: "",
  endTime: "",
  dayPart: "",
  displayOrder: "",
};

/** Field limits taken from `DeliverySlotCreateRequest`. */
export const DELIVERY_SLOT_LIMITS = {
  name: 100,
} as const;

/** Sentinel for "no day part", which the select cannot carry as "". */
export const NO_DAY_PART = "none";

export const DAY_PARTS: DayPart[] = ["MORNING", "AFTERNOON", "EVENING"];

export const dayPartLabels: Record<DayPart, string> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
};

/** Anything that is not one of the API's three falls back to unset. */
export function parseDayPart(value: string | undefined): DayPart | "" {
  return DAY_PARTS.includes(value as DayPart) ? (value as DayPart) : "";
}

/**
 * Slots in the order a day runs.
 *
 * `displayOrder` first, because that is what an admin set deliberately, then
 * the clock — which is the order anyone reading a list of time windows expects
 * when the orders are equal (and they are, until somebody sets them).
 */
export function sortDeliverySlots(slots: DeliverySlot[]): DeliverySlot[] {
  return [...slots].sort(
    (a, b) =>
      a.displayOrder - b.displayOrder ||
      a.startTime.localeCompare(b.startTime) ||
      a.id.localeCompare(b.id),
  );
}
