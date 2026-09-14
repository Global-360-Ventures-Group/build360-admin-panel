import type { Metadata } from "next";
import { forbidden, redirect } from "next/navigation";

import { listAllBrands, listBrands } from "@/features/brands/api";
import { BrandsView } from "@/features/brands/brands-view";
import {
  BRAND_PAGE_SIZE_DEFAULT,
  NO_SORT,
  parseBrandSort,
  sortBrands,
  type BrandPage,
  type BrandSort,
} from "@/features/brands/types";
import { hasPermission, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Brands · Build360 Admin",
};

export default async function BrandsPage({
  searchParams,
}: PageProps<"/brands">) {
  const user = await requireUser();

  // Reading is the gate for the whole screen; the finer-grained permissions
  // decide which controls render.
  if (!hasPermission(user, "BRAND_VIEW")) forbidden();

  const params = await searchParams;

  const search = firstValue(params.q)?.trim() ?? "";
  // Archived brands are opt-in; the list opens on the live catalog.
  const includeArchived = firstValue(params.archived) === "1";
  const sort = parseBrandSort(firstValue(params.sort));
  // The URL is 1-based for humans; the API is 0-based.
  const page = Math.max(1, Number(firstValue(params.page)) || 1);

  const listing = await loadPage({ page, sort, search, includeArchived });
  const brands = listing.brands;

  // A page number past the end comes back as an empty page, which would render
  // as "No brands yet" on a catalog that has plenty — and pair it with a
  // footer reading "Showing 0–0 of 12". Send the visitor to the last real page
  // instead. Reachable by editing the URL, or by paging and then narrowing the
  // filters.
  if (
    brands.content.length === 0 &&
    brands.totalElements > 0 &&
    page > brands.totalPages
  ) {
    redirect(
      brandsHref({
        search,
        includeArchived,
        sort,
        page: brands.totalPages,
      }),
    );
  }

  return (
    <BrandsView
      brands={brands}
      filters={{ search, includeArchived, sort, page }}
      incomplete={listing.incomplete}
      can={{
        create: hasPermission(user, "BRAND_CREATE"),
        update: hasPermission(user, "BRAND_UPDATE"),
        archive: hasPermission(user, "BRAND_ARCHIVE"),
      }}
    />
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * One page of brands, ordered.
 *
 * Unsorted is the cheap path and the default: one request for one page. A sort
 * cannot be delegated — `GET /admin/brands` has no ordering parameter — so
 * choosing one trades that request for a walk of every matching row, which is
 * then ordered and sliced here. Sorting only the fetched page would order
 * twenty arbitrary rows and label it "newest first".
 */
async function loadPage({
  page,
  sort,
  search,
  includeArchived,
}: {
  page: number;
  sort: BrandSort | typeof NO_SORT;
  search: string;
  includeArchived: boolean;
}): Promise<{ brands: BrandPage; incomplete: boolean }> {
  // Omitting `status` is what returns archived rows as well; there is no
  // "include archived" parameter, only "this status" or "every status".
  const filters = {
    status: includeArchived ? undefined : ("ACTIVE" as const),
    search: search || undefined,
  };

  if (sort === NO_SORT) {
    return {
      brands: await listBrands({
        ...filters,
        page: page - 1,
        size: BRAND_PAGE_SIZE_DEFAULT,
      }),
      incomplete: false,
    };
  }

  const all = await listAllBrands(filters);
  const ordered = sortBrands(all.brands, sort);

  const size = BRAND_PAGE_SIZE_DEFAULT;
  const totalPages = Math.max(1, Math.ceil(ordered.length / size));
  const start = (page - 1) * size;

  return {
    brands: {
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

/**
 * Build a /brands URL. Mirrors `buildHref` in the view, which needs the same
 * shape on the client where `redirect` is not available.
 */
function brandsHref({
  search,
  includeArchived,
  sort,
  page,
}: {
  search: string;
  includeArchived: boolean;
  sort: BrandSort | typeof NO_SORT;
  page: number;
}): string {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (includeArchived) params.set("archived", "1");
  if (sort !== NO_SORT) params.set("sort", sort);
  if (page > 1) params.set("page", String(page));

  const queryString = params.toString();
  return queryString ? `/brands?${queryString}` : "/brands";
}

