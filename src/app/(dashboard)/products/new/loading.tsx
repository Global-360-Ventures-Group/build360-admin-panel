import { FormPageSkeleton, PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      {/* Basics, Pricing, Policies — Organisation and Units beside them. */}
      <FormPageSkeleton mainCards={3} sideCards={2} />
    </PageSkeleton>
  );
}
