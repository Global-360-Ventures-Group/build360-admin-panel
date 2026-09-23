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
      <PageHeaderSkeleton action />
      <NoticeSkeleton />
      <StatCardsSkeleton />
      <ListCardSkeleton columns={9} tabs={5} filters={4} rowHeight="h-14" />
    </PageSkeleton>
  );
}
