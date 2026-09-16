/**
 * Pieces every delivery screen needs.
 *
 * Delivery is five API tags — methods, reusable time slots, pickup locations,
 * the bookable calendar and restrictions — that only make sense together: a
 * calendar slot names a method, a time slot and (for Click & Collect) a pickup
 * location, and a restriction blocks some combination of them. So they live
 * under one `features/delivery/` roof, one directory per tag, rather than as
 * five unrelated features that happen to share a URL prefix.
 *
 * The API guards them with three permissions, not one:
 *
 * - `DELIVERY_CONFIG_VIEW` reads everything here.
 * - `DELIVERY_CONFIG_MANAGE` writes methods, time slots and pickup locations.
 * - `DELIVERY_CALENDAR_MANAGE` writes calendar days, their bookable slots and
 *   restrictions.
 *
 * Holding the config grant does not let you open a day, and holding the
 * calendar grant does not let you rename a method — so the screens pass both
 * down rather than assuming one implies the other.
 */

/** Reads every delivery screen needs. */
export const DELIVERY_VIEW = "DELIVERY_CONFIG_VIEW";

/** Writes to methods, reusable time slots and pickup locations. */
export const DELIVERY_CONFIG_MANAGE = "DELIVERY_CONFIG_MANAGE";

/** Writes to calendar days, bookable slots and restrictions. */
export const DELIVERY_CALENDAR_MANAGE = "DELIVERY_CALENDAR_MANAGE";

/** The paged envelope, as the delivery endpoints spell it. */
export type PageResponse<T> = {
  content?: T[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
};

// ── time of day ─────────────────────────────────────────────────────────────
// `startTime` and `endTime` are typed as a bare string in the spec, with no
// format and no example. What actually arrives is a Java `LocalTime`, which
// Jackson writes as "14:30:00" — or as "14:30" when the seconds are zero. Both
// forms are real, so everything here reads either and writes one.

/** `"14:30:00"` or `"14:30"` -> `"14:30"`, for an `<input type="time">`. */
export function toTimeInput(value: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return "";

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

/**
 * `"14:30"` -> `"14:30:00"`, the form the API is sent.
 *
 * Seconds are always included: the shorter form round-trips fine in practice,
 * but padding removes the question of whether it does.
 */
export function fromTimeInput(value: string): string {
  const normalised = toTimeInput(value);

  return normalised ? `${normalised}:00` : "";
}

/** `"14:30:00"` -> `"2:30 PM"`. Falls back to the raw string if unparseable. */
export function formatTime(value: string): string {
  const normalised = toTimeInput(value);
  if (!normalised) return value;

  const [hours, minutes] = normalised.split(":").map(Number);
  const period = hours < 12 ? "AM" : "PM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;

  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** `"2:30 PM – 3:30 PM"`. */
export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

// ── calendar dates ──────────────────────────────────────────────────────────
// Dates on the delivery endpoints are plain `YYYY-MM-DD`, with no zone. They
// are treated as calendar dates throughout — never turned into a `Date` and
// back, which is how a day shifts by one either side of midnight.

/** Today as `YYYY-MM-DD`, in the viewer's own zone. */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/** A `Date` as `YYYY-MM-DD`, using its local fields rather than UTC. */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/** `YYYY-MM-DD` plus a number of days, still as `YYYY-MM-DD`. */
export function addDays(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  if (!date) return iso;

  date.setDate(date.getDate() + days);

  return toIsoDate(date);
}

/** Whole days from `from` to `to`, or null if either date is unusable. */
export function daysBetween(from: string, to: string): number | null {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  if (!start || !end) return null;

  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/** `"2026-09-16"` -> `"Wed, 16 Sept 2026"`. */
export function formatIsoDate(iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) return iso;

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** `"2026-09-16"` -> `"16 Sept"`, for rows where the year is noise. */
export function formatIsoDateShort(iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) return iso;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

/**
 * `YYYY-MM-DD` as a local `Date` at midnight, or null.
 *
 * Built from the parts rather than `new Date("2026-09-16")`, which the spec
 * says to read as **UTC** midnight — an hour offset west of Greenwich and the
 * date renders as the day before.
 */
export function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

/** True when the string is a well-formed `YYYY-MM-DD`. */
export function isIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null;
}
