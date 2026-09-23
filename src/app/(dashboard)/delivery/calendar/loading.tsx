import { PageHeaderSkeleton, PageSkeleton } from "@/components/page-skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton action />

      <Card className="min-w-0 py-0">
        {/* From, to, and the button that applies them. */}
        <CardHeader className="border-b py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Skeleton className="h-8 flex-1 rounded-lg" />
            <Skeleton className="h-8 flex-1 rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg sm:w-24" />
          </div>
        </CardHeader>

        {/* One row per date in the range, not a table. */}
        <CardContent className="p-0">
          <ul className="divide-y">
            {Array.from({ length: 10 }, (_, index) => (
              <li key={index} className="flex items-center gap-3 p-4">
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-40 max-w-full" />
                  <Skeleton className="h-3 w-56 max-w-full" />
                </div>
                <Skeleton className="h-7 w-20 shrink-0 rounded-lg" />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </PageSkeleton>
  );
}
