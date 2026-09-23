import {
  ListCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton action />
      {/* Roles are short and unpaginated, and the search box has no sort. */}
      <ListCardSkeleton
        columns={5}
        rows={6}
        rowHeight="h-14"
        sort={false}
        pagination={false}
      />
    </PageSkeleton>
  );
}
