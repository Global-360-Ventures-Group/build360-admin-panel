import { DetailPageSkeleton, PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      <DetailPageSkeleton notice stats={4} mainCards={2} sideCards={2} />
    </PageSkeleton>
  );
}
