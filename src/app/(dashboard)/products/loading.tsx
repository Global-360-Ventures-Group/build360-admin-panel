import {
  ListCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton action />
      {/* Product, Category, Price, Status, actions — and a row tall enough for
          the thumbnail each one carries. */}
      <ListCardSkeleton columns={5} filters={4} rowHeight="h-14" />
    </PageSkeleton>
  );
}
