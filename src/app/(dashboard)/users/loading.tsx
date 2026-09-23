import {
  ListCardSkeleton,
  NoticeSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
  StatCardsSkeleton,
} from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <NoticeSkeleton />
      <StatCardsSkeleton />
      <ListCardSkeleton columns={8} tabs={6} filters={4} rowHeight="h-14" />
    </PageSkeleton>
  );
}
