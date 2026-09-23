import {
  ListCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton action />
      <ListCardSkeleton
        columns={6}
        rows={6}
        rowHeight="h-12"
        search={false}
        sort={false}
        pagination={false}
      />
    </PageSkeleton>
  );
}
