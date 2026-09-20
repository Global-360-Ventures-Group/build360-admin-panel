import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InventoryDetailView } from "@/features/inventory/inventory-detail-view";
import { findSampleInventoryItem } from "@/features/inventory/sample-data";
import { findSampleOrderByNo } from "@/features/orders/sample-data";
import { requireUser } from "@/lib/auth/dal";

export async function generateMetadata({
  params,
}: PageProps<"/inventory/[id]">): Promise<Metadata> {
  const { id } = await params;
  const item = findSampleInventoryItem(id);

  return {
    title: item ? `${item.sku} · Build360 Admin` : "Inventory · Build360 Admin",
  };
}

/**
 * One stock line.
 *
 * The ledger records which order took stock off the shelf, by order *number*.
 * Turning those into links is this route's job: the inventory fixture owns the
 * product catalogue the orders fixture buys from, so it cannot read orders
 * back without making a cycle.
 */
export default async function InventoryItemPage({
  params,
}: PageProps<"/inventory/[id]">) {
  await requireUser();

  const { id } = await params;
  const item = findSampleInventoryItem(id);

  if (!item) notFound();

  const orderIdByNo: Record<string, string> = {};
  for (const movement of item.movements) {
    if (movement.reference === null) continue;

    const order = findSampleOrderByNo(movement.reference);
    if (order) orderIdByNo[movement.reference] = order.id;
  }

  return <InventoryDetailView item={item} orderIdByNo={orderIdByNo} />;
}
