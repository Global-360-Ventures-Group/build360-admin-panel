import {
  ListCardSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton action />
      <ListCardSkeleton columns={5} rowHeight="h-14" />
    </PageSkeleton>
  );
}
