import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { InventoryView } from "@/features/inventory/inventory-view";
import {
  CATALOG_BRANDS,
  INVENTORY_LOCATIONS,
  listSampleInventory,
  sampleInventorySummary,
  type InventoryFilters,
} from "@/features/inventory/sample-data";
import {
  ALL,
  parseInventorySort,
  parseStockStatus,
} from "@/features/inventory/types";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Inventory · Build360 Admin",
};

/**
 * The stock list.
 *
 * **Not permission-gated, on purpose.** There is no `INVENTORY_*` or `STOCK_*`
 * code in the permission catalogue, because there is no stock in the API for
 * one to guard — gating on an invented code would lock out every real account,
 * SUPER_ADMIN included. Sign-in is still required.
 *
 * If this screen ever becomes real it will most likely sit behind
 * `PRODUCT_UPDATE`, which is what already guards the product status the
 * storefront reads.
 */
export default async function InventoryPage({
  searchParams,
}: PageProps<"/inventory">) {
  await requireUser();

  const params = await searchParams;

  const filters: InventoryFilters = {
    search: firstValue(params.q)?.trim() ?? "",
    status: parseStockStatus(firstValue(params.status)),
    brand: pickFrom(firstValue(params.brand), CATALOG_BRANDS),
    location: pickFrom(firstValue(params.location), INVENTORY_LOCATIONS),
    sort: parseInventorySort(firstValue(params.sort)),
    // The URL is 1-based for humans; the page object is 0-based.
    page: Math.max(1, Number(firstValue(params.page)) || 1),
  };

  const { items, counts } = listSampleInventory(filters);

  // A page past the end returns empty, which would render "Nothing tracked
  // yet" over a warehouse that has plenty. Send the visitor to the last real
  // page.
  if (
    items.content.length === 0 &&
    items.totalElements > 0 &&
    filters.page > items.totalPages
  ) {
    redirect(inventoryHref({ ...filters, page: items.totalPages }));
  }

  return (
    <InventoryView
      items={items}
      counts={counts}
      summary={sampleInventorySummary()}
      filters={filters}
      brands={CATALOG_BRANDS}
      locations={INVENTORY_LOCATIONS}
    />
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Brand and depot are free strings rather than enums, so an unknown one has to
 * fall back to "no filter" rather than quietly matching nothing.
 */
function pickFrom(
  value: string | undefined,
  allowed: string[],
): string | typeof ALL {
  return value !== undefined && allowed.includes(value) ? value : ALL;
}

/** Mirrors `buildHref` in the view — same query contract, both directions. */
function inventoryHref(filters: InventoryFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.status !== ALL) params.set("status", filters.status);
  if (filters.brand !== ALL) params.set("brand", filters.brand);
  if (filters.location !== ALL) params.set("location", filters.location);
  if (filters.sort !== "attention") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));

  const queryString = params.toString();
  return queryString ? `/inventory?${queryString}` : "/inventory";
}
