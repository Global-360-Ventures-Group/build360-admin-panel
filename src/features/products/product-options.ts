/**
 * Brand and category options for the product form and list filters.
 *
 * Both are fetched in full rather than a page, because a picker that shows
 * only the first page silently hides valid choices. Both lists are small and
 * bounded by design.
 *
 * Fetched concurrently: they are independent, and the product form needs both
 * before it can render.
 */

import { listAllBrands } from "@/features/brands/api";
import { listAllCategories } from "@/features/categories/api";

export type BrandOption = {
  id: string;
  name: string;
  /** Archived brands cannot be assigned to a new product. */
  active: boolean;
};

export type CategoryOption = {
  id: string;
  /** Null for a top-level ("base") category. */
  parentId: string | null;
  /** This category's own name, without its ancestors — what the picker lists. */
  name: string;
  /** The API-computed ancestor chain, e.g. "Cement & Concretes > Cement". */
  path: string;
  active: boolean;
};

export type ProductOptions = {
  brands: BrandOption[];
  categories: CategoryOption[];
  /** True if either list hit its page ceiling and is therefore incomplete. */
  truncated: boolean;
};

/**
 * Load the pickers' contents.
 *
 * Inactive entries are included but flagged, rather than filtered out: an
 * existing product may already point at an archived brand or category, and
 * dropping it from the list would make the form render a blank picker and
 * then quietly reassign the product on save.
 */
export async function loadProductOptions(): Promise<ProductOptions> {
  const [brandResult, categoryResult] = await Promise.all([
    listAllBrands(),
    listAllCategories(),
  ]);

  return {
    brands: brandResult.brands
      .map((brand) => ({
        id: brand.id,
        name: brand.name,
        active: brand.status === "ACTIVE",
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),

    // Sorted by full path, which leaves each set of siblings in alphabetical
    // order once the picker groups them by parent.
    categories: categoryResult.categories
      .map((category) => ({
        id: category.id,
        parentId: category.parentId,
        name: category.name,
        path: category.fullPath,
        active: category.status === "ACTIVE",
      }))
      .sort((a, b) => a.path.localeCompare(b.path)),

    truncated: brandResult.truncated || categoryResult.truncated,
  };
}
