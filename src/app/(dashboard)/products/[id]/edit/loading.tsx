import { FormPageSkeleton, PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return (
    <PageSkeleton>
      {/* One card more than the create form: the editor also has the gallery,
          which only exists once the product has an id. */}
      <FormPageSkeleton mainCards={3} sideCards={3} />
    </PageSkeleton>
  );
}
