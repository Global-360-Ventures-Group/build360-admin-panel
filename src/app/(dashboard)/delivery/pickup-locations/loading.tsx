import {
  ListCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton action />
      {/* Paged, but with no filter row above the table. */}
      <ListCardSkeleton
        columns={6}
        rowHeight="h-12"
        search={false}
        sort={false}
      />
    </PageSkeleton>
  );
}
