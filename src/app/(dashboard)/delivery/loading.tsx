import { CardSkeleton, PageHeaderSkeleton, PageSkeleton } from "@/components/page-skeleton";

/**
 * Delivery methods — three cards side by side, not a table.
 *
 * `delivery/layout.tsx` renders the section nav and stays mounted, so this
 * covers only the page below it.
 */
export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <div className="grid gap-4 lg:grid-cols-3">
        <CardSkeleton lines={4} />
        <CardSkeleton lines={4} />
        <CardSkeleton lines={4} />
      </div>
    </PageSkeleton>
  );
}
