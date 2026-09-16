/**
 * The eight `/admin/delivery/calendar` endpoints.
 *
 * Reads need `DELIVERY_CONFIG_VIEW`; every write needs
 * `DELIVERY_CALENDAR_MANAGE` — the calendar grant, which is separate from the
 * one that edits methods, time slots and pickup locations.
 *
 * Nothing here deletes. A day or a slot that should stop being offered is set
 * to `BLOCKED`.
 */

import { authedRequestData } from "@/lib/api/authed";

import type {
  BulkCalendarResult,
  CalendarSlot,
  CalendarSlotStatus,
  DeliveryDay,
  DeliveryDayStatus,
} from "./types";

/** Raw `AdminDeliveryCalendarResponse`, as loose as the spec declares it. */
type AdminDeliveryCalendarResponse = {
  id?: string;
  deliveryDate?: string;
  status?: DeliveryDayStatus;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
};

/** Raw `AdminDeliveryCalendarSlotResponse`. */
type AdminDeliveryCalendarSlotResponse = {
  id?: string;
  deliveryCalendarId?: string;
  deliverySlotId?: string;
  deliveryMethodId?: string;
  pickupLocationId?: string | null;
  capacity?: number;
  bookedCount?: number;
  remainingCapacity?: number;
  price?: number;
  bestValue?: boolean;
  status?: CalendarSlotStatus;
  createdAt?: string;
  updatedAt?: string;
};

/** Raw `BulkCalendarResultResponse`. */
type BulkCalendarResultResponse = {
  datesProcessed?: number;
  daysCreated?: number;
  slotsCreated?: number;
  slotsSkipped?: number;
  datesSkipped?: string[];
};

/** What `POST /admin/delivery/calendar` accepts. */
export type DeliveryDayInput = {
  deliveryDate: string;
  status?: DeliveryDayStatus;
  remarks?: string;
};

/** What `PUT /admin/delivery/calendar/{id}` accepts — status and note only. */
export type DeliveryDayUpdateInput = {
  status?: DeliveryDayStatus;
  remarks?: string;
};

/**
 * What `POST /admin/delivery/calendar/{id}/slots` accepts.
 *
 * `pickupLocationId` is required in practice when the method is Click &
 * Collect and must be absent otherwise, which the spec states in prose rather
 * than in the schema.
 */
export type CalendarSlotInput = {
  deliverySlotId: string;
  deliveryMethodId: string;
  pickupLocationId?: string;
  capacity: number;
  price: number;
  bestValue?: boolean;
};

/**
 * What `PUT /admin/delivery/calendar/slots/{slotId}` accepts.
 *
 * Narrower than create: which method, window and pickup location a bookable
 * slot belongs to cannot be changed once it exists. Only how much of it there
 * is, what it costs and whether it is open.
 */
export type CalendarSlotUpdateInput = {
  capacity?: number;
  price?: number;
  bestValue?: boolean;
  status?: CalendarSlotStatus;
};

/** One row of `BulkCalendarSlotRequest.slots`. */
export type BulkSlotSpec = {
  deliverySlotId: string;
  pickupLocationId?: string;
  capacity: number;
  price: number;
  bestValue?: boolean;
};

export type BulkCalendarInput = {
  fromDate: string;
  toDate: string;
  deliveryMethodId: string;
  slots: BulkSlotSpec[];
};

/**
 * `GET /admin/delivery/calendar?from&to` — the days that exist in a range.
 *
 * Both parameters are required. Dates in the range that have never been opened
 * are simply absent from the response; the screen fills those gaps in itself.
 */
export async function listDeliveryDays(
  from: string,
  to: string,
): Promise<DeliveryDay[]> {
  const params = new URLSearchParams({ from, to });

  const days = await authedRequestData<AdminDeliveryCalendarResponse[]>(
    `/admin/delivery/calendar?${params}`,
  );

  return days
    .flatMap((raw) => {
      const day = toDeliveryDay(raw);
      return day ? [day] : [];
    })
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
}

/** `GET /admin/delivery/calendar/{id}`. */
export async function getDeliveryDay(id: string): Promise<DeliveryDay | null> {
  return toDeliveryDay(
    await authedRequestData<AdminDeliveryCalendarResponse>(
      `/admin/delivery/calendar/${id}`,
    ),
  );
}

/** `POST /admin/delivery/calendar` — open a date. */
export function createDeliveryDay(
  input: DeliveryDayInput,
): Promise<DeliveryDay | null> {
  return authedRequestData<AdminDeliveryCalendarResponse>(
    "/admin/delivery/calendar",
    { method: "POST", body: input },
  ).then(toDeliveryDay);
}

/** `PUT /admin/delivery/calendar/{id}` — status and remarks. */
export function updateDeliveryDay(
  id: string,
  input: DeliveryDayUpdateInput,
): Promise<DeliveryDay | null> {
  return authedRequestData<AdminDeliveryCalendarResponse>(
    `/admin/delivery/calendar/${id}`,
    { method: "PUT", body: input },
  ).then(toDeliveryDay);
}

/** `GET /admin/delivery/calendar/{id}/slots` — one day's bookable slots. */
export async function listCalendarSlots(
  dayId: string,
): Promise<CalendarSlot[]> {
  const slots = await authedRequestData<AdminDeliveryCalendarSlotResponse[]>(
    `/admin/delivery/calendar/${dayId}/slots`,
  );

  return slots.flatMap((raw) => {
    const slot = toCalendarSlot(raw);
    return slot ? [slot] : [];
  });
}

/** `POST /admin/delivery/calendar/{id}/slots`. */
export function createCalendarSlot(
  dayId: string,
  input: CalendarSlotInput,
): Promise<CalendarSlot | null> {
  return authedRequestData<AdminDeliveryCalendarSlotResponse>(
    `/admin/delivery/calendar/${dayId}/slots`,
    { method: "POST", body: input },
  ).then(toCalendarSlot);
}

/**
 * `PUT /admin/delivery/calendar/slots/{slotId}`.
 *
 * Note the path: a bookable slot is updated directly, not through its day.
 */
export function updateCalendarSlot(
  slotId: string,
  input: CalendarSlotUpdateInput,
): Promise<CalendarSlot | null> {
  return authedRequestData<AdminDeliveryCalendarSlotResponse>(
    `/admin/delivery/calendar/slots/${slotId}`,
    { method: "PUT", body: input },
  ).then(toCalendarSlot);
}

/**
 * `POST /admin/delivery/calendar/bulk` — days and slots across a date range.
 *
 * Materialises one method's slots for every date in `[fromDate, toDate]`,
 * skipping dates a restriction covers and slots that already exist. The result
 * counts both, so the caller can report what did not happen rather than
 * claiming a clean run.
 */
export async function bulkCreateCalendar(
  input: BulkCalendarInput,
): Promise<BulkCalendarResult> {
  const raw = await authedRequestData<BulkCalendarResultResponse>(
    "/admin/delivery/calendar/bulk",
    { method: "POST", body: input },
  );

  return {
    datesProcessed: raw.datesProcessed ?? 0,
    daysCreated: raw.daysCreated ?? 0,
    slotsCreated: raw.slotsCreated ?? 0,
    slotsSkipped: raw.slotsSkipped ?? 0,
    datesSkipped: (raw.datesSkipped ?? []).filter(Boolean),
  };
}

/** Narrow a day, or null when it lacks the id every action needs. */
function toDeliveryDay(
  raw: AdminDeliveryCalendarResponse,
): DeliveryDay | null {
  if (!raw.id) return null;

  return {
    id: raw.id,
    deliveryDate: raw.deliveryDate ?? "",
    // Absent reads as blocked rather than available: showing a day as open
    // when the API did not say so is the more dangerous guess.
    status: raw.status ?? "BLOCKED",
    remarks: raw.remarks ?? "",
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? "",
  };
}

/** Narrow a bookable slot, or null when it lacks an id. */
function toCalendarSlot(
  raw: AdminDeliveryCalendarSlotResponse,
): CalendarSlot | null {
  if (!raw.id) return null;

  const capacity = raw.capacity ?? 0;
  const bookedCount = raw.bookedCount ?? 0;

  return {
    id: raw.id,
    deliveryCalendarId: raw.deliveryCalendarId ?? "",
    deliverySlotId: raw.deliverySlotId ?? "",
    deliveryMethodId: raw.deliveryMethodId ?? "",
    pickupLocationId: raw.pickupLocationId ?? "",
    capacity,
    bookedCount,
    // Derived when absent rather than defaulted to 0, which would read as
    // "full" on a slot nobody has booked.
    remainingCapacity:
      raw.remainingCapacity ?? Math.max(0, capacity - bookedCount),
    price: raw.price ?? 0,
    bestValue: raw.bestValue ?? false,
    status: raw.status ?? "BLOCKED",
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? "",
  };
}
