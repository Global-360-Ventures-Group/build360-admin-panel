import {
  CardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />

      {/* Your account, appearance, where the real settings live, store. */}
      <CardSkeleton lines={6} />
      <CardSkeleton lines={2} />
      <CardSkeleton lines={4} />
      <CardSkeleton lines={4} />

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <CardSkeleton lines={4} />
        <CardSkeleton lines={4} />
      </div>
    </PageSkeleton>
  );
}
