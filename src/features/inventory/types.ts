/**
 * Inventory models.
 *
 * **The API has no stock of any kind.** Not a field, not an endpoint, not a
 * schema — `AdminProductResponse` carries price, unit, weight and minimum
 * order quantity, and nothing that counts anything. The single availability
 * signal in the whole system is the product's own `status`, and one of its
 * four values is `OUT_OF_STOCK`. That is the entire inventory feature the
 * backend has today, and `src/features/products/types.ts` already says so.
 *
 * So everything here that counts, reserves, reorders or locates stock is a
 * proposal over the fixture in `./sample-data`, marked `Not in the API` at its
 * declaration. The one field that *is* real is `productStatus`, and it is
 * writable through `PUT /admin/products/{id}` behind `PRODUCT_UPDATE` — which
 * is why this screen makes a point of showing when a counted quantity and that
 * status disagree. That disagreement is the bug the missing backend causes,
 * and it is the most useful thing this design has to say.
 */

import type { ProductStatus } from "@/features/products/types";
import type { Tone } from "@/lib/tone";

/**
 * What the shelf looks like.
 *
 * Derived, never stored — see `stockStatus`. Storing it would let it drift
 * from the numbers it describes, which is exactly the failure this screen
 * exists to surface.
 */
export type StockStatus = "IN_STOCK" | "LOW" | "OUT_OF_STOCK" | "DISCONTINUED";

export const STOCK_STATUSES: StockStatus[] = [
  "IN_STOCK",
  "LOW",
  "OUT_OF_STOCK",
  "DISCONTINUED",
];

export const stockStatusLabels: Record<StockStatus, string> = {
  IN_STOCK: "In stock",
  LOW: "Low",
  OUT_OF_STOCK: "Out of stock",
  DISCONTINUED: "Discontinued",
};

export const stockStatusHints: Record<StockStatus, string> = {
  IN_STOCK: "Comfortably above the reorder point",
  LOW: "At or below the reorder point — order more",
  OUT_OF_STOCK: "Nothing free to sell",
  DISCONTINUED: "Not restocking this line",
};

export const stockStatusTone: Record<StockStatus, Tone> = {
  IN_STOCK: "success",
  LOW: "warning",
  OUT_OF_STOCK: "danger",
  DISCONTINUED: "neutral",
};

/** Why a quantity changed. */
export type MovementKind =
  | "RECEIPT"
  | "SALE"
  | "RETURN"
  | "ADJUSTMENT"
  | "DAMAGE"
  | "COUNT";

export const movementKindLabels: Record<MovementKind, string> = {
  RECEIPT: "Goods in",
  SALE: "Sold",
  RETURN: "Returned",
  ADJUSTMENT: "Adjusted",
  DAMAGE: "Written off",
  COUNT: "Stock count",
};

/** Not in the API: one line of the ledger behind a quantity. */
export type StockMovement = {
  id: string;
  at: string;
  kind: MovementKind;
  /** Signed: negative takes stock off the shelf. */
  quantity: number;
  /** The order number, goods-received note, or count sheet it came from. */
  reference: string | null;
  by: string;
  note?: string;
};

export type InventoryItem = {
  id: string;
  /* Real product fields, shaped to `AdminProductResponse`. */
  sku: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  price: number;
  costPrice: number;
  /** The only availability signal the API actually has. */
  productStatus: ProductStatus;

  /* Everything below is a proposal — the API has no equivalent. */

  /** Not in the API: physically on the shelf, sold or not. */
  onHand: number;
  /** Not in the API: committed to orders that have not shipped. */
  reserved: number;
  /** Not in the API: the level at which this should be reordered. */
  reorderPoint: number;
  /** Not in the API: how much to buy when it trips the reorder point. */
  reorderQuantity: number;
  /** Not in the API: which depot holds it. */
  location: string;
  /** Not in the API: who supplies it. */
  supplier: string;
  /** Not in the API: when it was last physically counted. */
  lastCountedAt: string;
  /** Not in the API: the ledger behind `onHand`, newest first. */
  movements: StockMovement[];
};

/** Free to sell: on the shelf, minus what is already promised. */
export function availableStock(item: InventoryItem): number {
  return item.onHand - item.reserved;
}

/** What this line is worth at cost — the number a stock take has to match. */
export function stockValue(item: InventoryItem): number {
  return item.onHand * item.costPrice;
}

/**
 * The shelf state, from the numbers rather than from a stored flag.
 *
 * `DISCONTINUED` wins over everything: a line that is not being restocked is
 * not "low", it is finished, and telling a buyer to reorder it would be wrong.
 */
export function stockStatus(item: InventoryItem): StockStatus {
  if (item.productStatus === "DISCONTINUED") return "DISCONTINUED";

  const available = availableStock(item);
  if (available <= 0) return "OUT_OF_STOCK";
  if (available <= item.reorderPoint) return "LOW";

  return "IN_STOCK";
}

/**
 * Whether the counted stock and the storefront disagree.
 *
 * This is the whole argument for the screen. With no stock in the API, the
 * only thing the storefront knows is `status`, and somebody has to keep it in
 * step with a quantity the API cannot see. Two ways it goes wrong:
 *
 * - **Overselling** — nothing free to sell, but the product is still `ACTIVE`,
 *   so the storefront takes the order anyway.
 * - **Hidden stock** — stock on the shelf, but the product is still marked
 *   `OUT_OF_STOCK`, so nobody can buy it.
 *
 * Returns null when the two agree, which is the normal case.
 */
export function statusMismatch(
  item: InventoryItem,
): "OVERSELLING" | "HIDDEN_STOCK" | null {
  const available = availableStock(item);

  if (available <= 0 && item.productStatus === "ACTIVE") return "OVERSELLING";
  if (available > 0 && item.productStatus === "OUT_OF_STOCK") {
    return "HIDDEN_STOCK";
  }

  return null;
}

export const mismatchLabels: Record<"OVERSELLING" | "HIDDEN_STOCK", string> = {
  OVERSELLING: "Sellable with no stock",
  HIDDEN_STOCK: "In stock but hidden",
};

export const mismatchHints: Record<"OVERSELLING" | "HIDDEN_STOCK", string> = {
  OVERSELLING:
    "Nothing free to sell, but the storefront still lists it as available — set the product to Out of stock",
  HIDDEN_STOCK:
    "There is stock on the shelf, but the product is marked Out of stock — set it back to Active",
};

/**
 * How full the shelf is against its reorder point, capped at 100.
 *
 * Used for the bar in the table. A reorder point of zero has no meaningful
 * ratio, so it reads as full rather than dividing by nothing.
 */
export function stockPercent(item: InventoryItem): number {
  if (item.reorderPoint <= 0) return availableStock(item) > 0 ? 100 : 0;

  const ratio = availableStock(item) / (item.reorderPoint * 2);
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
}

/** One page of inventory, shaped like every other paged response here. */
export type InventoryPage = {
  content: InventoryItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

export const INVENTORY_PAGE_SIZE_DEFAULT = 12;

/** Sentinel for "no filter", which a select cannot carry as "". */
export const ALL = "ALL";

export type InventorySort =
  | "attention"
  | "name"
  | "available-asc"
  | "value-desc";

export const INVENTORY_SORTS: InventorySort[] = [
  "attention",
  "name",
  "available-asc",
  "value-desc",
];

export const inventorySortLabels: Record<InventorySort, string> = {
  attention: "Needs attention first",
  name: "Name A–Z",
  "available-asc": "Least available",
  "value-desc": "Highest stock value",
};

export function parseInventorySort(value: string | undefined): InventorySort {
  return INVENTORY_SORTS.includes(value as InventorySort)
    ? (value as InventorySort)
    : "attention";
}

export function parseStockStatus(
  value: string | undefined,
): StockStatus | typeof ALL {
  return STOCK_STATUSES.includes(value as StockStatus)
    ? (value as StockStatus)
    : ALL;
}

/** How urgent each state is, for the default sort. Lower sorts first. */
const ATTENTION_RANK: Record<StockStatus, number> = {
  OUT_OF_STOCK: 0,
  LOW: 1,
  IN_STOCK: 2,
  DISCONTINUED: 3,
};

export function sortInventory(
  items: InventoryItem[],
  sort: InventorySort,
): InventoryItem[] {
  const sorted = [...items];

  switch (sort) {
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "available-asc":
      return sorted.sort((a, b) => availableStock(a) - availableStock(b));
    case "value-desc":
      return sorted.sort((a, b) => stockValue(b) - stockValue(a));
    case "attention":
    default:
      // The default this screen opens on: anything that cannot be sold, then
      // anything about to run out, then the rest. A row flagged by
      // `statusMismatch` jumps its whole group — a storefront lying about
      // availability outranks a shelf merely running low.
      return sorted.sort((a, b) => {
        const flagged = Number(statusMismatch(b) !== null) -
          Number(statusMismatch(a) !== null);
        if (flagged !== 0) return flagged;

        const rank = ATTENTION_RANK[stockStatus(a)] - ATTENTION_RANK[stockStatus(b)];
        if (rank !== 0) return rank;

        return availableStock(a) - availableStock(b);
      });
  }
}
