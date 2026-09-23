import { DetailPageSkeleton, PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      {/* Print invoice and Advance to… */}
      <DetailPageSkeleton actions={2} notice mainCards={3} sideCards={3} />
    </PageSkeleton>
  );
}
