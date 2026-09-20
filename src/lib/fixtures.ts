/**
 * Shared plumbing for the screens that still run on fixtures.
 *
 * Orders, refunds and customers are three views of the same invented week, so
 * they have to agree on what day it is and how a timestamp is built. Two rules
 * hold across all three:
 *
 * 1. **No `Date.now()`.** Every timestamp is derived from `SAMPLE_TODAY`, so
 *    the server and the client render the same list — a fixture that moved
 *    with the real clock would hydrate differently and empty itself out by
 *    next month.
 * 2. **Naive local date-times**, exactly as the API sends them
 *    (`2026-09-20T14:42:00`, no zone, no offset). See `parseApiDateTime`.
 */

/** The day the fixtures call "today". Date filters measure back from here. */
export const SAMPLE_TODAY = "2026-09-20";

/** `"2026-09-20T09:15:00"` + minutes, kept in the API's naive local format. */
export function shiftDateTime(at: string, minutes: number): string {
  const moment = new Date(at);
  moment.setMinutes(moment.getMinutes() + minutes);

  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${moment.getFullYear()}-${pad(moment.getMonth() + 1)}-${pad(moment.getDate())}` +
    `T${pad(moment.getHours())}:${pad(moment.getMinutes())}:00`
  );
}

/**
 * Midnight `days` before the fixtures' today, as a naive local date-time.
 *
 * Timestamps in the fixtures are lexicographically comparable, so a date range
 * is a string comparison against this rather than any `Date` arithmetic.
 */
export function fixtureDaysAgo(days: number): string {
  return shiftDateTime(`${SAMPLE_TODAY}T00:00:00`, -days * 24 * 60);
}
