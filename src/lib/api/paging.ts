/**
 * Reading a paged endpoint to the end.
 *
 * The list endpoints are paged and capped at 50 rows, but several screens need
 * the whole set rather than a page: the category tree cannot render a
 * third-level row without its ancestors, and a picker that shows one page
 * silently hides valid choices. Those callers page through here.
 *
 * The earlier version of this walked pages until the API said `last`, giving
 * up after a fixed 10 and warning that the list was incomplete. That made
 * "catalog bigger than 500" indistinguishable from "endpoint reported `last`
 * wrongly", and either way the screen was missing rows. This walks to the end
 * instead, and only reports a shortfall it can actually measure against the
 * API's own `totalElements`.
 */

/** The part of a page response paging cares about. */
export type ApiPage<T> = {
  content: T[];
  /** How many rows the API says match the query, across all pages. */
  totalElements: number;
  last: boolean;
};

export type AllPages<T> = {
  items: T[];
  /**
   * How many rows there should be — the API's `totalElements`, or the number
   * that actually arrived when that turns out to be the larger of the two.
   */
  total: number;
  /**
   * True only when rows are genuinely missing: the safety ceiling was reached,
   * or the endpoint started repeating pages. Not a normal outcome — a screen
   * seeing this should say the list is incomplete.
   */
  truncated: boolean;
};

/**
 * Enough pages for 10,000 rows at the API's maximum page size.
 *
 * This is a runaway guard, not an expected limit. Paging normally stops on
 * `last`, on an empty page, or once `totalElements` has been collected; this
 * only matters if none of those ever happen.
 */
const MAX_PAGES = 200;

/** Pages fetched at once. Small enough not to hammer the API on a big catalog. */
const PAGE_CONCURRENCY = 5;

/**
 * Fetch every page and return the rows, de-duplicated by id.
 *
 * De-duplication is not defensive decoration. Pages are fetched concurrently
 * and rows can shift between requests, so the same row legitimately arrives
 * twice when something is created mid-walk. It also contains the damage if the
 * endpoint ever ignores `page` — the walk stops rather than piling up copies
 * of page zero.
 *
 * @param fetchPage called with a zero-based page number
 * @param identify the row's stable id
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<ApiPage<T>>,
  identify: (item: T) => string,
): Promise<AllPages<T>> {
  const byId = new Map<string, T>();

  const first = await fetchPage(0);
  for (const item of first.content) byId.set(identify(item), item);

  // The page size the API actually served, rather than the one asked for.
  // Used only to size the remaining work; the walk does not trust it to
  // decide when to stop.
  const pageSize = first.content.length;
  const expectedPages =
    pageSize > 0 ? Math.ceil(first.totalElements / pageSize) : 1;

  let reachedEnd = first.last || first.content.length === 0;
  let nextPage = 1;

  while (!reachedEnd && nextPage < MAX_PAGES) {
    const batchSize = Math.min(
      PAGE_CONCURRENCY,
      MAX_PAGES - nextPage,
      // At least one beyond what `totalElements` implies, so an under-reported
      // total cannot end the walk early — the `last` check does that.
      Math.max(expectedPages - nextPage, 1),
    );

    const before = byId.size;
    const batch = await Promise.all(
      Array.from({ length: batchSize }, (_, offset) => fetchPage(nextPage + offset)),
    );

    for (const page of batch) {
      for (const item of page.content) byId.set(identify(item), item);
      if (page.last || page.content.length === 0) reachedEnd = true;
    }

    // A whole batch that adds nothing new means the endpoint is serving the
    // same rows for every page. Walking on would spin to the ceiling and still
    // return the same set, so stop and let `truncated` say what happened.
    if (byId.size === before) break;

    nextPage += batchSize;
  }

  const items = [...byId.values()];

  return {
    items,
    total: Math.max(first.totalElements, items.length),
    truncated: items.length < first.totalElements,
  };
}
