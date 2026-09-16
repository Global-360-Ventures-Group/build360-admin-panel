/**
 * The bookable calendar: delivery days and the slots on them.
 *
 * Two records, and the distinction matters:
 *
 * - A **day** (`AdminDeliveryCalendarResponse`) is a date the shop has opened,
 *   with a status and a note. A date with no day record is simply not open —
 *   the list endpoint does not mention it at all, which is why this screen
 *   renders every date in the range and marks the gaps rather than listing
 *   only what came back.
 * - A **bookable slot** (`AdminDeliveryCalendarSlotResponse`) is one time
 *   window on one day for one method, with its own capacity and price. This is
 *   the thing a customer actually books.
 *
 * Neither can be deleted. A day or a slot that should stop being offered is
 * set to `BLOCKED`.
 */

import type { DeliveryRestriction } from "../restrictions/types";

/** A day's status. `HOLIDAY` and `BLOCKED` both close it; the label differs. */
export type DeliveryDayStatus = "AVAILABLE" | "FULL" | "BLOCKED" | "HOLIDAY";

/** A bookable slot's status. No `HOLIDAY` here — that is a day-level idea. */
export type CalendarSlotStatus = "AVAILABLE" | "FULL" | "BLOCKED";

export type DeliveryDay = {
  id: string;
  /** `YYYY-MM-DD`. */
  deliveryDate: string;
  status: DeliveryDayStatus;
  remarks: string;
  createdAt: string;
  updatedAt: string;
};

export type CalendarSlot = {
  id: string;
  deliveryCalendarId: string;
  deliverySlotId: string;
  deliveryMethodId: string;
  /** "" unless the method is Click & Collect. */
  pickupLocationId: string;
  capacity: number;
  bookedCount: number;
  remainingCapacity: number;
  price: number;
  bestValue: boolean;
  status: CalendarSlotStatus;
  createdAt: string;
  updatedAt: string;
};

/** One date in the viewed range: the day record if it exists, plus the blocks. */
export type CalendarDate = {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Null when the date has not been opened at all. */
  day: DeliveryDay | null;
  /** Restrictions covering this date, whichever method they name. */
  restrictions: DeliveryRestriction[];
};

/** What the open/edit day form collects. */
export type DeliveryDayFormValues = {
  deliveryDate: string;
  status: DeliveryDayStatus;
  remarks: string;
};

/** What the bookable slot form collects. Numbers stay strings until validated. */
export type CalendarSlotFormValues = {
  deliverySlotId: string;
  deliveryMethodId: string;
  pickupLocationId: string;
  capacity: string;
  price: string;
  bestValue: boolean;
  status: CalendarSlotStatus;
};

/**
 * The widest range the bulk builder will take in one go.
 *
 * Not an API limit — the endpoint takes any range. It is a guard on the blast
 * radius: a typo in the year turns "open next week" into thousands of days
 * that nothing in this API can delete.
 */
export const BULK_MAX_DAYS = 120;

/** Field limits taken from `DeliveryDayCreateRequest`. */
export const DELIVERY_DAY_LIMITS = {
  remarks: 2000,
} as const;

export const DELIVERY_DAY_STATUSES: DeliveryDayStatus[] = [
  "AVAILABLE",
  "FULL",
  "BLOCKED",
  "HOLIDAY",
];

export const deliveryDayStatusLabels: Record<DeliveryDayStatus, string> = {
  AVAILABLE: "Available",
  FULL: "Full",
  BLOCKED: "Blocked",
  HOLIDAY: "Holiday",
};

export const CALENDAR_SLOT_STATUSES: CalendarSlotStatus[] = [
  "AVAILABLE",
  "FULL",
  "BLOCKED",
];

export const calendarSlotStatusLabels: Record<CalendarSlotStatus, string> = {
  AVAILABLE: "Available",
  FULL: "Full",
  BLOCKED: "Blocked",
};

/** Anything that is not one of the API's four falls back to available. */
export function parseDeliveryDayStatus(
  value: string | undefined,
): DeliveryDayStatus {
  return DELIVERY_DAY_STATUSES.includes(value as DeliveryDayStatus)
    ? (value as DeliveryDayStatus)
    : "AVAILABLE";
}

/** Anything that is not one of the API's three falls back to available. */
export function parseCalendarSlotStatus(
  value: string | undefined,
): CalendarSlotStatus {
  return CALENDAR_SLOT_STATUSES.includes(value as CalendarSlotStatus)
    ? (value as CalendarSlotStatus)
    : "AVAILABLE";
}

/** True when a day is open for business rather than closed or full. */
export function isDayBookable(day: DeliveryDay | null): boolean {
  return day?.status === "AVAILABLE";
}

/** The result of `POST /admin/delivery/calendar/bulk`. */
export type BulkCalendarResult = {
  datesProcessed: number;
  daysCreated: number;
  slotsCreated: number;
  slotsSkipped: number;
  /** Dates the API refused, because a restriction covers them. */
  datesSkipped: string[];
};

/** One row of the bulk dialog's slot table, before it becomes a `SlotSpec`. */
export type BulkSlotDraft = {
  /** Local only, so React can key the rows. */
  key: string;
  deliverySlotId: string;
  pickupLocationId: string;
  capacity: string;
  price: string;
  bestValue: boolean;
};
