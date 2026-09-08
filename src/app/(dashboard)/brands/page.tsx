import type { Metadata } from "next";
import { forbidden, redirect } from "next/navigation";

import { listBrands } from "@/features/brands/api";
import {
  BrandsView,
  type BrandStatusFilter,
} from "@/features/brands/brands-view";
import { BRAND_PAGE_SIZE_DEFAULT } from "@/features/brands/types";
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
  const status = parseStatus(firstValue(params.status));
  // The URL is 1-based for humans; the API is 0-based.
  const page = Math.max(1, Number(firstValue(params.page)) || 1);

  const brands = await listBrands({
    page: page - 1,
    size: BRAND_PAGE_SIZE_DEFAULT,
    status: status === "ALL" ? undefined : status,
    search: search || undefined,
  });

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
    redirect(brandsHref({ search, status, page: brands.totalPages }));
  }

  return (
    <BrandsView
      brands={brands}
      filters={{ search, status, page }}
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
 * Build a /brands URL. Mirrors `buildHref` in the view, which needs the same
 * shape on the client where `redirect` is not available.
 */
function brandsHref({
  search,
  status,
  page,
}: {
  search: string;
  status: BrandStatusFilter;
  page: number;
}): string {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (status !== "ALL") params.set("status", status);
  if (page > 1) params.set("page", String(page));

  const queryString = params.toString();
  return queryString ? `/brands?${queryString}` : "/brands";
}

/** Anything that is not a status the API accepts falls back to no filter. */
function parseStatus(value: string | undefined): BrandStatusFilter {
  return value === "ACTIVE" || value === "INACTIVE" ? value : "ALL";
}
