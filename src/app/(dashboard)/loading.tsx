import {
  ListCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
  StatCardsSkeleton,
} from "@/components/page-skeleton";

/**
 * Fallback for anything under the dashboard shell that has no closer one.
 *
 * Every screen here ships its own `loading.tsx` shaped like the page it
 * covers, so this catches two cases: a route added later that has not got one
 * yet, and a navigation into a section whose *layout* fetches. `loading.tsx`
 * never wraps the layout in its own segment, so when `delivery/layout.tsx`
 * awaits its permission check the boundary that catches it is this one.
 *
 * It is not the home dashboard's loading state — that page renders from
 * constants and never suspends.
 */
export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <StatCardsSkeleton />
      <ListCardSkeleton columns={6} rowHeight="h-14" />
    </PageSkeleton>
  );
}
