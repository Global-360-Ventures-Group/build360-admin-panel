import {
  ListCardSkeleton,
  NoticeSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
  StatCardsSkeleton,
} from "@/components/page-skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The plot area is reserved at the height the charts draw at, so the page
 * does not grow by several hundred pixels when they arrive.
 */
function ChartCardSkeleton() {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-64 max-w-full" />
      </CardHeader>
      <CardContent className="min-w-0">
        <Skeleton className="h-50 w-full" />
      </CardContent>
    </Card>
  );
}

export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <NoticeSkeleton />

      {/* The period presets. */}
      <div className="flex gap-1 overflow-hidden">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-24 shrink-0 rounded-lg" />
        ))}
      </div>

      <StatCardsSkeleton />

      <ChartCardSkeleton />

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>

      {/* Best sellers. */}
      <ListCardSkeleton
        columns={4}
        rows={8}
        search={false}
        sort={false}
        pagination={false}
      />
    </PageSkeleton>
  );
}
