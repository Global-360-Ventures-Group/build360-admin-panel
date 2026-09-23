import { DetailPageSkeleton, PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <DetailPageSkeleton actions={1} notice mainCards={2} sideCards={3} />
    </PageSkeleton>
  );
}
