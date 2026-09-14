import type { Metadata } from "next";
import { forbidden, redirect } from "next/navigation";

import { listAllProducts, listProducts } from "@/features/products/api";
import { loadProductOptions } from "@/features/products/product-options";
import { ALL, ProductsView } from "@/features/products/products-view";
import {
  NO_SORT,
  PRODUCT_PAGE_SIZE_DEFAULT,
  PRODUCT_STATUSES,
  parseProductSort,
  sortProducts,
  type ProductPage,
  type ProductSort,
  type ProductStatus,
} from "@/features/products/types";
import { hasPermission, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Products · Build360 Admin",
};

export default async function ProductsPage({
  searchParams,
}: PageProps<"/products">) {
  const user = await requireUser();

  if (!hasPermission(user, "PRODUCT_VIEW")) forbidden();

  const params = await searchParams;

  const search = firstValue(params.q)?.trim() ?? "";
  const status = parseStatus(firstValue(params.status));
  const brandId = firstValue(params.brand)?.trim() ?? "";
  const categoryId = firstValue(params.category)?.trim() ?? "";
  const sort = parseProductSort(firstValue(params.sort));
  // The URL is 1-based for humans; the API is 0-based.
  const page = Math.max(1, Number(firstValue(params.page)) || 1);

  // The page and the picker contents are independent, so they are fetched
  // together rather than in series.
  const [listing, options] = await Promise.all([
    loadPage({ page, sort, search, status, brandId, categoryId }),
    loadProductOptions(),
  ]);

  const products = listing.products;

  // A page past the end returns empty, which would render "No products yet"
  // over a catalog that has plenty. Send the visitor to the last real page.
  if (
    products.content.length === 0 &&
    products.totalElements > 0 &&
    page > products.totalPages
  ) {
    redirect(
      productsHref({
        search,
        status,
        brandId,
        categoryId,
        sort,
        page: products.totalPages,
      }),
    );
  }

  return (
    <ProductsView
      products={products}
      filters={{ search, status, brandId, categoryId, sort, page }}
      incomplete={listing.incomplete}
      brands={options.brands}
      categories={options.categories}
      can={{
        create: hasPermission(user, "PRODUCT_CREATE"),
        update: hasPermission(user, "PRODUCT_UPDATE"),
        archive: hasPermission(user, "PRODUCT_ARCHIVE"),
      }}
    />
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * One page of products, ordered.
 *
 * Unsorted is the cheap path and the default: one request for one page. A
 * sort cannot be delegated — `GET /admin/products` has no ordering parameter —
 * so choosing one trades that request for a walk of every matching row, which
 * is then ordered and sliced here. Sorting just the fetched page instead would
 * order twenty arbitrary rows and call it "newest first".
 */
async function loadPage({
  page,
  sort,
  search,
  status,
  brandId,
  categoryId,
}: {
  page: number;
  sort: ProductSort | typeof NO_SORT;
  search: string;
  status: ProductStatus | typeof ALL;
  brandId: string;
  categoryId: string;
}): Promise<{ products: ProductPage; incomplete: boolean }> {
  const filters = {
    status: status === ALL ? undefined : status,
    brandId: brandId || undefined,
    categoryId: categoryId || undefined,
    search: search || undefined,
  };

  if (sort === NO_SORT) {
    return {
      products: await listProducts({
        ...filters,
        page: page - 1,
        size: PRODUCT_PAGE_SIZE_DEFAULT,
      }),
      incomplete: false,
    };
  }

  const all = await listAllProducts(filters);
  const ordered = sortProducts(all.products, sort);

  const size = PRODUCT_PAGE_SIZE_DEFAULT;
  const totalPages = Math.max(1, Math.ceil(ordered.length / size));
  const start = (page - 1) * size;

  return {
    products: {
      // Left unclamped on purpose: a page past the end comes back empty, which
      // is what sends the visitor to the last real page above.
      content: ordered.slice(start, start + size),
      page: page - 1,
      size,
      totalElements: ordered.length,
      totalPages,
      first: page <= 1,
      last: page >= totalPages,
    },
    incomplete: all.truncated,
  };
}

/** Anything that is not a status the API accepts falls back to no filter. */
function parseStatus(value: string | undefined): ProductStatus | typeof ALL {
  return PRODUCT_STATUSES.includes(value as ProductStatus)
    ? (value as ProductStatus)
    : ALL;
}

function productsHref({
  search,
  status,
  brandId,
  categoryId,
  sort,
  page,
}: {
  search: string;
  status: ProductStatus | typeof ALL;
  brandId: string;
  categoryId: string;
  sort: ProductSort | typeof NO_SORT;
  page: number;
}): string {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (status !== ALL) params.set("status", status);
  if (brandId) params.set("brand", brandId);
  if (categoryId) params.set("category", categoryId);
  if (sort !== NO_SORT) params.set("sort", sort);
  if (page > 1) params.set("page", String(page));

  const queryString = params.toString();
  return queryString ? `/products?${queryString}` : "/products";
}
