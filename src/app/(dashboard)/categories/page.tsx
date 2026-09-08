import type { Metadata } from "next";
import { forbidden } from "next/navigation";

import { listAllCategories } from "@/features/categories/api";
import { CategoriesView } from "@/features/categories/categories-view";
import { hasPermission, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Categories · Build360 Admin",
};

export default async function CategoriesPage() {
  const user = await requireUser();

  // Reading gates the screen; the finer permissions decide which controls
  // render.
  if (!hasPermission(user, "CATEGORY_VIEW")) forbidden();

  // No status filter here on purpose. The tree is filtered in the browser, and
  // filtering server-side would drop the ancestors of matching rows, leaving
  // subcategories floating with no path down to them.
  const { categories, truncated } = await listAllCategories();

  return (
    <CategoriesView
      categories={categories}
      truncated={truncated}
      can={{
        create: hasPermission(user, "CATEGORY_CREATE"),
        update: hasPermission(user, "CATEGORY_UPDATE"),
        archive: hasPermission(user, "CATEGORY_ARCHIVE"),
      }}
    />
  );
}
