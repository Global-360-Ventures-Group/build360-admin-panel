import type { Metadata } from "next";

import { CategoriesView } from "@/features/categories/categories-view";
import { mockCategories } from "@/features/categories/data";

export const metadata: Metadata = {
  title: "Categories · Build360 Admin",
};

export default function CategoriesPage() {
  // TODO: replace mockCategories with a real data fetch (DB / API).
  return <CategoriesView initialCategories={mockCategories} />;
}
