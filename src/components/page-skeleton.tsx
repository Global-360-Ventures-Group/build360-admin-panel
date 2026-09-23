import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * The pieces every `loading.tsx` in the dashboard is built from.
 *
 * Each screen here is a Server Component that awaits its data before it
 * renders anything, so without a Suspense boundary a click on the sidebar
 * left the old page on screen — nothing moved until the new page's fetches
 * came back. A `loading.tsx` per route gives Next.js that boundary: the
 * navigation commits immediately, the chrome and this skeleton paint, and the
 * real page streams into it.
 *
 * The point of these components is that the skeleton has the *same geometry*
 * as the screen it stands in for — same header, same number of stat cards,
 * same table columns and row height. A generic spinner would also make the
 * navigation instant, but the content would then shove the layout around when
 * it arrives, which reads as slower than it is.
 *
 * All of this is markup only. Keep it that way: a loading state that imports
 * a Client Component ships JavaScript that has to load before the fallback
 * can show, which is the one thing it cannot afford.
 */

/**
 * Wrapper for a whole loading screen.
 *
 * `loading.tsx` renders in the layout's content column, which spaces its
 * children with `gap-4 md:gap-6` — this repeats that so a skeleton's sections
 * sit exactly where the page's own sections will.
 */
export function PageSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="flex flex-1 flex-col gap-4 md:gap-6">
      <span className="sr-only">Loading</span>
      {children}
    </div>
  );
}

/**
 * Title, one line of description, and optionally the primary action.
 *
 * `action` is set from what the screen shows to someone who holds the
 * permission. Guessing wrong only costs a button-shaped gap for a moment.
 */
export function PageHeaderSkeleton({
  action = false,
  titleWidth = "w-40",
}: {
  action?: boolean;
  titleWidth?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-2">
        <Skeleton className={cn("h-7", titleWidth)} />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      {action ? <Skeleton className="h-8 w-full rounded-lg sm:w-32" /> : null}
    </div>
  );
}

/** Stand-in for `SampleDataNotice`, which several screens render above the fold. */
export function NoticeSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3">
      <Skeleton className="h-3 w-full max-w-2xl bg-warning/20" />
      <Skeleton className="h-3 w-2/3 max-w-lg bg-warning/20" />
    </div>
  );
}

/**
 * The row of summary cards a list screen opens with.
 *
 * Four across is the house layout; `className` takes the grid override for
 * the dashboard, which runs six.
 */
export function StatCardsSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}
    >
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} size="sm">
          <CardContent>
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-3 w-24 max-w-full" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
            <Skeleton className="mt-3 h-3 w-28 max-w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * A bare table body.
 *
 * Written as plain elements rather than the `Table` components because those
 * carry `"use client"` — see the note at the top of this file. The classes are
 * copied from them, so the two line up to the pixel.
 *
 * `rowHeight` is the one number worth tuning per screen: a row of plain text
 * is shorter than one carrying a thumbnail or two stacked lines, and getting
 * it wrong is what makes content jump when it lands.
 */
export function TableSkeleton({
  columns,
  rows = 8,
  rowHeight = "h-10",
}: {
  columns: number;
  rows?: number;
  rowHeight?: string;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr>
            {Array.from({ length: columns }, (_, index) => (
              <th key={index} className="h-10 px-2 first:pl-4 last:pr-4">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={rowIndex} className="border-b">
              {Array.from({ length: columns }, (_, columnIndex) => (
                <td
                  key={columnIndex}
                  className={cn("p-2 first:pl-4 last:pr-4", rowHeight)}
                >
                  {/* The first column carries the name, so it is the wide one;
                      the last is the actions cell and stays narrow. */}
                  <Skeleton
                    className={cn(
                      "h-4",
                      columnIndex === 0
                        ? "w-40"
                        : columnIndex === columns - 1
                          ? "ml-auto w-8"
                          : "w-20",
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The card a list screen lives in: filters on top, table in the middle,
 * pagination underneath.
 *
 * `tabs` is the status filter strip some screens put above the search box,
 * `filters` the number of select boxes in the row below it, and `pagination`
 * turns off the footer for the screens that show everything at once.
 */
export function ListCardSkeleton({
  columns,
  rows = 8,
  rowHeight,
  tabs = 0,
  search = true,
  sort = true,
  filters = 0,
  pagination = true,
}: {
  columns: number;
  rows?: number;
  rowHeight?: string;
  tabs?: number;
  search?: boolean;
  sort?: boolean;
  filters?: number;
  pagination?: boolean;
}) {
  const hasHeader = tabs > 0 || search || filters > 0;

  return (
    <Card className="min-w-0 py-0">
      {hasHeader ? (
        <CardHeader className="border-b py-4">
          <div className="flex flex-col gap-3">
            {tabs > 0 ? (
              <div className="flex gap-1 overflow-hidden">
                {Array.from({ length: tabs }, (_, index) => (
                  <Skeleton key={index} className="h-8 w-24 shrink-0 rounded-lg" />
                ))}
              </div>
            ) : null}

            {search ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Skeleton className="h-8 flex-1 rounded-lg" />
                {sort ? <Skeleton className="h-8 rounded-lg sm:w-48" /> : null}
              </div>
            ) : null}

            {filters > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: filters }, (_, index) => (
                  <Skeleton key={index} className="h-8 rounded-lg" />
                ))}
              </div>
            ) : null}
          </div>
        </CardHeader>
      ) : null}

      <CardContent className="p-0">
        <TableSkeleton columns={columns} rows={rows} rowHeight={rowHeight} />
      </CardContent>

      {pagination ? (
        <CardFooter className="flex flex-col gap-3 border-t py-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-4 w-40" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-7 w-24 rounded-lg" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}

/** A card with a title and a few lines of body — the filler for detail screens. */
export function CardSkeleton({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader>
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton
            key={index}
            className={cn("h-4", index === lines - 1 ? "w-1/2" : "w-full")}
          />
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * The header of a detail screen: a back link above the record's name.
 *
 * Detail routes are the ones where instant navigation matters most — they are
 * reached by clicking a row, and the visitor already knows what they clicked.
 */
export function DetailHeaderSkeleton({ actions = 0 }: { actions?: number }) {
  return (
    <>
      <Skeleton className="h-4 w-28" />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        {actions > 0 ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            {Array.from({ length: actions }, (_, index) => (
              <Skeleton key={index} className="h-8 w-32 rounded-lg" />
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}

/**
 * A record screen: back link, title, and the two-column body under it.
 *
 * Orders, customers, refunds, coupons and stock items all lay out the same
 * way — the record's own detail in the wide column, supporting cards beside
 * it — so they share one skeleton rather than five near-identical copies.
 */
export function DetailPageSkeleton({
  actions = 0,
  notice = false,
  stats = 0,
  mainCards = 2,
  sideCards = 2,
}: {
  actions?: number;
  notice?: boolean;
  stats?: number;
  mainCards?: number;
  sideCards?: number;
}) {
  return (
    <>
      <DetailHeaderSkeleton actions={actions} />
      {notice ? <NoticeSkeleton /> : null}
      {stats > 0 ? <StatCardsSkeleton count={stats} /> : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          {Array.from({ length: mainCards }, (_, index) => (
            <CardSkeleton key={index} lines={index === 0 ? 5 : 3} />
          ))}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          {Array.from({ length: sideCards }, (_, index) => (
            <CardSkeleton key={index} lines={3} />
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * The product editor: a back arrow and the save buttons over a 2:1 split of
 * form cards.
 *
 * Worth a skeleton even though the form itself is static markup — both routes
 * load the brand and category pickers before they can render anything.
 */
export function FormPageSkeleton({
  mainCards = 3,
  sideCards = 2,
}: {
  mainCards?: number;
  sideCards?: number;
}) {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <Skeleton className="mt-0.5 size-8 shrink-0 rounded-lg" />
          <div className="flex min-w-0 flex-col gap-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {Array.from({ length: mainCards }, (_, index) => (
            <CardSkeleton key={index} lines={5} />
          ))}
        </div>
        <div className="flex flex-col gap-6">
          {Array.from({ length: sideCards }, (_, index) => (
            <CardSkeleton key={index} lines={4} />
          ))}
        </div>
      </div>
    </>
  );
}
