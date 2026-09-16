import type { Metadata } from "next";

import { listDeliveryDays } from "@/features/delivery/calendar/api";
import { CalendarView } from "@/features/delivery/calendar/calendar-view";
import type { CalendarDate } from "@/features/delivery/calendar/types";
import { listDeliveryMethods } from "@/features/delivery/methods/api";
import { listAllPickupLocations } from "@/features/delivery/pickup-locations/api";
import { listRestrictions } from "@/features/delivery/restrictions/api";
import {
  DELIVERY_CALENDAR_MANAGE,
  addDays,
  daysBetween,
  isIsoDate,
  todayIso,
} from "@/features/delivery/shared";
import { listDeliverySlots } from "@/features/delivery/slots/api";
import { hasPermission, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Delivery calendar · Build360 Admin",
};

/** Default window: today plus a fortnight, which is how far ahead people plan. */
const DEFAULT_SPAN_DAYS = 13;

/**
 * Most dates one view will render.
 *
 * The API takes any range. This is a rendering limit — every date in the range
 * becomes a row, opened or not, and a year of them is a page nobody can read.
 */
const MAX_SPAN_DAYS = 92;

export default async function DeliveryCalendarPage({
  searchParams,
}: PageProps<"/delivery/calendar">) {
  // The layout already gated on `DELIVERY_CONFIG_VIEW`; this is only here for
  // the write grant, which for the calendar is its own permission.
  const user = await requireUser();

  const params = await searchParams;
  const today = todayIso();

  const requestedFrom = firstValue(params.from);
  const requestedTo = firstValue(params.to);

  const from = isIsoDate(requestedFrom ?? "") ? requestedFrom! : today;
  const requested = isIsoDate(requestedTo ?? "")
    ? requestedTo!
    : addDays(from, DEFAULT_SPAN_DAYS);

  // A backwards range would produce no rows at all and read as "nothing here",
  // so it collapses to the single day instead.
  const span = daysBetween(from, requested) ?? 0;
  const clamped = span > MAX_SPAN_DAYS;
  const to =
    span < 0 ? from : clamped ? addDays(from, MAX_SPAN_DAYS) : requested;

  // The day list covers the range; the other three fill the pickers and let a
  // slot's method, window and branch be named rather than shown as a uuid.
  const [days, methods, slots, pickup, restrictions] = await Promise.all([
    listDeliveryDays(from, to),
    listDeliveryMethods(),
    listDeliverySlots(),
    listAllPickupLocations(),
    listRestrictions(),
  ]);

  const byDate = new Map(days.map((day) => [day.deliveryDate, day]));

  // Every date in the range gets a row. `GET /admin/delivery/calendar` only
  // returns days that have been opened, so building the list from its response
  // alone would show "nothing here" for a fortnight where the real answer is
  // "these nine dates were never opened".
  // The bound is `MAX_SPAN_DAYS`, not a `date >= to` test alone: `addDays`
  // returns its input unchanged on a date it cannot parse, which would spin
  // here forever rather than fail.
  const dates: CalendarDate[] = [];
  for (let offset = 0; offset <= MAX_SPAN_DAYS; offset += 1) {
    const date = addDays(from, offset);
    dates.push({
      date,
      day: byDate.get(date) ?? null,
      restrictions: restrictions.filter(
        (restriction) =>
          restriction.startDate <= date && date <= restriction.endDate,
      ),
    });

    if (date >= to) break;
  }

  return (
    <CalendarView
      dates={dates}
      range={{ from, to }}
      clamped={clamped}
      methods={methods}
      slots={slots}
      locations={pickup.locations}
      canManage={hasPermission(user, DELIVERY_CALENDAR_MANAGE)}
    />
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
