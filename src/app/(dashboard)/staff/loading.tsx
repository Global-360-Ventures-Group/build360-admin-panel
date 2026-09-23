import {
  ListCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton action />
      {/* Role, activity and sort sit in their own row here rather than beside
          the search box. */}
      <ListCardSkeleton columns={6} sort={false} filters={3} rowHeight="h-14" />
    </PageSkeleton>
  );
}
