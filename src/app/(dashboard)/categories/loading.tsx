import {
  ListCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton action />
      {/* The tree is loaded whole and shown whole — no pagination footer. */}
      <ListCardSkeleton
        columns={5}
        rows={10}
        rowHeight="h-12"
        pagination={false}
      />
    </PageSkeleton>
  );
}
