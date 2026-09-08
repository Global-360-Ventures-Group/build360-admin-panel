import type { Metadata } from "next";
import { forbidden, redirect } from "next/navigation";

import { listProducts } from "@/features/products/api";
import { loadProductOptions } from "@/features/products/product-options";
import { ALL, ProductsView } from "@/features/products/products-view";
import {
  PRODUCT_PAGE_SIZE_DEFAULT,
  PRODUCT_STATUSES,
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
  // The URL is 1-based for humans; the API is 0-based.
  const page = Math.max(1, Number(firstValue(params.page)) || 1);

  // The page and the picker contents are independent, so they are fetched
  // together rather than in series.
  const [products, options] = await Promise.all([
    listProducts({
      page: page - 1,
      size: PRODUCT_PAGE_SIZE_DEFAULT,
      status: status === ALL ? undefined : status,
      brandId: brandId || undefined,
      categoryId: categoryId || undefined,
      search: search || undefined,
    }),
    loadProductOptions(),
  ]);

  // A page past the end returns empty, which would render "No products yet"
  // over a catalog that has plenty. Send the visitor to the last real page.
  if (
    products.content.length === 0 &&
    products.totalElements > 0 &&
    page > products.totalPages
  ) {
    redirect(
      productsHref({ search, status, brandId, categoryId, page: products.totalPages }),
    );
  }

  return (
    <ProductsView
      products={products}
      filters={{ search, status, brandId, categoryId, page }}
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
  page,
}: {
  search: string;
  status: ProductStatus | typeof ALL;
  brandId: string;
  categoryId: string;
  page: number;
}): string {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (status !== ALL) params.set("status", status);
  if (brandId) params.set("brand", brandId);
  if (categoryId) params.set("category", categoryId);
  if (page > 1) params.set("page", String(page));

  const queryString = params.toString();
  return queryString ? `/products?${queryString}` : "/products";
}
