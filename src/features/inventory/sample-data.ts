/**
 * The inventory fixture, and the product catalogue behind it.
 *
 * Twenty-two lines standing in for a stock system the API does not have — see
 * the note at the top of `./types`.
 *
 * This file also owns the **product catalogue** the rest of the sample world
 * buys from: the orders fixture reads its line items from `CATALOG` here, so
 * the cement on an order and the cement on a shelf are the same product at the
 * same price. The dependency runs orders → inventory, one way; nothing here
 * may import orders. That is also why `reserved` is a fixture number rather
 * than a sum over open orders — computing it would be a cycle.
 *
 * Two rules keep the fixture honest:
 *
 * 1. **`onHand` is never typed in.** It is the sum of the movements in the
 *    ledger, so the quantity a buyer sees is always explained by the history
 *    underneath it. A stock screen whose ledger does not add up to its number
 *    is worse than no stock screen.
 * 2. **No `Date.now()`.** Every timestamp is anchored on `SAMPLE_TODAY` — see
 *    `@/lib/fixtures`.
 */

import type { ProductStatus } from "@/features/products/types";
import { SAMPLE_TODAY, shiftDateTime } from "@/lib/fixtures";

import {
  ALL,
  INVENTORY_PAGE_SIZE_DEFAULT,
  sortInventory,
  statusMismatch,
  stockStatus,
  stockValue,
  type InventoryItem,
  type InventoryPage,
  type InventorySort,
  type MovementKind,
  type StockMovement,
  type StockStatus,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                  */
/* -------------------------------------------------------------------------- */

type CatalogEntry = {
  sku: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  /** What it sells for. */
  unitPrice: number;
  /** What it cost to buy. Stock value is counted at this. */
  costPrice: number;
};

/**
 * Every product the sample world knows about.
 *
 * Shared with the orders fixture, which addresses these by key.
 */
export const CATALOG = {
  cementShah: {
    sku: "CEM-SHAH-50",
    name: "OPC Cement 50kg — Shah Cement",
    brand: "Shah Cement",
    category: "Cement",
    unit: "bag",
    unitPrice: 560,
    costPrice: 505,
  },
  cementCrown: {
    sku: "CEM-CRWN-50",
    name: "OPC Cement 50kg — Crown",
    brand: "Crown Cement",
    category: "Cement",
    unit: "bag",
    unitPrice: 545,
    costPrice: 492,
  },
  cementWhite: {
    sku: "CEM-WHT-25",
    name: "White Cement 25kg — Confidence",
    brand: "Confidence Cement",
    category: "Cement",
    unit: "bag",
    unitPrice: 1250,
    costPrice: 1090,
  },
  rod12: {
    sku: "STL-BSRM-12",
    name: "Steel Rod 12mm — BSRM",
    brand: "BSRM",
    category: "Steel & Rods",
    unit: "piece",
    unitPrice: 1180,
    costPrice: 1085,
  },
  rod16: {
    sku: "STL-AKS-16",
    name: "Steel Rod 16mm — AKS",
    brand: "AKS",
    category: "Steel & Rods",
    unit: "piece",
    unitPrice: 2050,
    costPrice: 1890,
  },
  angle: {
    sku: "STL-SRF-A2",
    name: 'MS Angle 2" — Sharif Metal',
    brand: "Sharif Metal",
    category: "Steel & Rods",
    unit: "piece",
    unitPrice: 1560,
    costPrice: 1410,
  },
  brick: {
    sku: "BRK-1ST-STD",
    name: "First Class Brick",
    brand: "Padma Brickfield",
    category: "Bricks & Blocks",
    unit: "piece",
    unitPrice: 13,
    costPrice: 10,
  },
  sand: {
    sku: "AGG-SND-SYL",
    name: "Sylhet Sand (coarse)",
    brand: "Meghna Aggregates",
    category: "Aggregates",
    unit: "cft",
    unitPrice: 58,
    costPrice: 44,
  },
  stone: {
    sku: "AGG-STN-34",
    name: 'Crushed Stone 3/4"',
    brand: "Meghna Aggregates",
    category: "Aggregates",
    unit: "cft",
    unitPrice: 215,
    costPrice: 176,
  },
  tileFloor: {
    sku: "TIL-RAK-6060",
    name: "Ceramic Floor Tile 60×60 — RAK",
    brand: "RAK Ceramics",
    category: "Tiles",
    unit: "box",
    unitPrice: 1450,
    costPrice: 1240,
  },
  tileWall: {
    sku: "TIL-AKJ-3060",
    name: "Wall Tile 30×60 — Akij",
    brand: "Akij Ceramics",
    category: "Tiles",
    unit: "box",
    unitPrice: 980,
    costPrice: 820,
  },
  tileMosaic: {
    sku: "TIL-DBL-3030",
    name: "Mosaic Tile 30×30 — DBL",
    brand: "DBL Ceramics",
    category: "Tiles",
    unit: "box",
    unitPrice: 1680,
    costPrice: 1450,
  },
  paint: {
    sku: "PNT-BRG-WC20",
    name: "Weathercoat Exterior 20L — Berger",
    brand: "Berger",
    category: "Paint & Finishes",
    unit: "bucket",
    unitPrice: 11800,
    costPrice: 10300,
  },
  putty: {
    sku: "PNT-BRG-PT20",
    name: "Wall Putty 20kg — Berger",
    brand: "Berger",
    category: "Paint & Finishes",
    unit: "bucket",
    unitPrice: 2350,
    costPrice: 2010,
  },
  thinner: {
    sku: "PNT-ELT-TH5",
    name: "Paint Thinner 5L — Elite",
    brand: "Elite Paint",
    category: "Paint & Finishes",
    unit: "can",
    unitPrice: 1450,
    costPrice: 1230,
  },
  wire: {
    sku: "ELC-BRB-15",
    name: "Electrical Wire 1.5mm 100yd — BRB",
    brand: "BRB Cable",
    category: "Electrical",
    unit: "roll",
    unitPrice: 3900,
    costPrice: 3450,
  },
  switchBox: {
    sku: "ELC-SST-SB6",
    name: "Switch Board 6-gang — Super Star",
    brand: "Super Star",
    category: "Electrical",
    unit: "piece",
    unitPrice: 890,
    costPrice: 735,
  },
  pipe: {
    sku: "PLM-RFL-P4",
    name: 'uPVC Pipe 4" × 20ft — RFL',
    brand: "RFL",
    category: "Plumbing",
    unit: "piece",
    unitPrice: 1240,
    costPrice: 1060,
  },
  pipe2: {
    sku: "PLM-RFL-P2",
    name: 'uPVC Pipe 2" × 20ft — RFL',
    brand: "RFL",
    category: "Plumbing",
    unit: "piece",
    unitPrice: 640,
    costPrice: 545,
  },
  gypsum: {
    sku: "BRD-GYP-12",
    name: "Gypsum Board 12mm — Gyproc",
    brand: "Gyproc",
    category: "Boards",
    unit: "sheet",
    unitPrice: 980,
    costPrice: 845,
  },
  nail: {
    sku: "FIX-NL-3",
    name: 'Wire Nail 3"',
    brand: "Sharif Metal",
    category: "Fixings",
    unit: "kg",
    unitPrice: 135,
    costPrice: 104,
  },
  bitumen: {
    sku: "WPR-BTM-110",
    name: "Bitumen Sheet 1m × 10m",
    brand: "Shalimar",
    category: "Waterproofing",
    unit: "roll",
    unitPrice: 8400,
    costPrice: 7250,
  },
} satisfies Record<string, CatalogEntry>;

export type ProductKey = keyof typeof CATALOG;

/** Every distinct brand and category in the catalogue, for the filters. */
export const CATALOG_BRANDS = [
  ...new Set(Object.values(CATALOG).map((entry) => entry.brand)),
].sort();

export const CATALOG_CATEGORIES = [
  ...new Set(Object.values(CATALOG).map((entry) => entry.category)),
].sort();

/* -------------------------------------------------------------------------- */
/* Builder                                                                    */
/* -------------------------------------------------------------------------- */

/** Who books each kind of movement. */
const MOVEMENT_BY: Record<MovementKind, string> = {
  RECEIPT: "Goods-in desk",
  SALE: "Storefront",
  RETURN: "Returns desk",
  ADJUSTMENT: "Nadia H.",
  DAMAGE: "Warehouse",
  COUNT: "Stock take",
};

/**
 * `[days ago, kind, signed quantity, reference]`, oldest first.
 *
 * The signed quantities are the only source of `onHand`, so editing a ledger
 * moves the stock — which is the point.
 */
type LedgerEntry = [number, MovementKind, number, string?];

type InventorySeed = {
  key: ProductKey;
  location: string;
  supplier: string;
  reorderPoint: number;
  reorderQuantity: number;
  /** Not derived from orders: that would make this file import them. */
  reserved: number;
  /** Defaults to `ACTIVE`, which is what most of the catalogue is. */
  productStatus?: ProductStatus;
  lastCountedDaysAgo: number;
  ledger: LedgerEntry[];
};

/** Same-day movements are spread across the working day, so they read in order. */
function movementAt(daysAgo: number, index: number): string {
  return shiftDateTime(
    `${SAMPLE_TODAY}T08:00:00`,
    -daysAgo * 24 * 60 + index * 97,
  );
}

function item(seed: InventorySeed): InventoryItem {
  const product = CATALOG[seed.key];

  const movements: StockMovement[] = seed.ledger.map(
    ([daysAgo, kind, quantity, reference], index) => ({
      id: `mov_${seed.key}_${index + 1}`,
      at: movementAt(daysAgo, index),
      kind,
      quantity,
      reference: reference ?? null,
      by: MOVEMENT_BY[kind],
    }),
  );

  return {
    id: `inv_${seed.key}`,
    sku: product.sku,
    name: product.name,
    brand: product.brand,
    category: product.category,
    unit: product.unit,
    price: product.unitPrice,
    costPrice: product.costPrice,
    productStatus: seed.productStatus ?? "ACTIVE",

    // The ledger is the quantity. Nothing here is typed in twice.
    onHand: movements.reduce((total, move) => total + move.quantity, 0),
    reserved: seed.reserved,
    reorderPoint: seed.reorderPoint,
    reorderQuantity: seed.reorderQuantity,
    location: seed.location,
    supplier: seed.supplier,
    lastCountedAt: movementAt(seed.lastCountedDaysAgo, 0),
    // Newest first, which is how a ledger is read.
    movements: movements.reverse(),
  };
}

/* -------------------------------------------------------------------------- */
/* The shelves                                                                */
/* -------------------------------------------------------------------------- */

const TEJGAON = "Dhaka — Tejgaon depot";
const MIRPUR = "Dhaka — Mirpur depot";
const KALURGHAT = "Chattogram — Kalurghat depot";
const AMBERKHANA = "Sylhet — Amberkhana depot";

export const INVENTORY_LOCATIONS = [TEJGAON, MIRPUR, KALURGHAT, AMBERKHANA];

const SAMPLE_INVENTORY: InventoryItem[] = [
  item({
    key: "cementShah",
    location: TEJGAON,
    supplier: "Shah Cement Industries Ltd.",
    reorderPoint: 150,
    reorderQuantity: 600,
    reserved: 60,
    lastCountedDaysAgo: 9,
    ledger: [
      [30, "RECEIPT", 1200, "GRN-4471"],
      [24, "SALE", -260, "B360-10001"],
      [16, "SALE", -180, "B360-10009"],
      [8, "SALE", -140, "B360-10019"],
    ],
  }),
  item({
    key: "cementCrown",
    location: TEJGAON,
    supplier: "Crown Cement PLC",
    reorderPoint: 120,
    reorderQuantity: 500,
    reserved: 140,
    lastCountedDaysAgo: 9,
    ledger: [
      [27, "RECEIPT", 800, "GRN-4488"],
      [11, "SALE", -200, "B360-10005"],
      [3, "SALE", -120, "B360-10013"],
    ],
  }),
  item({
    key: "cementWhite",
    location: MIRPUR,
    supplier: "Confidence Cement PLC",
    reorderPoint: 30,
    reorderQuantity: 120,
    reserved: 0,
    lastCountedDaysAgo: 12,
    ledger: [
      [34, "RECEIPT", 90, "GRN-4402"],
      [19, "SALE", -50],
      [6, "SALE", -12],
    ],
  }),
  item({
    key: "rod12",
    location: TEJGAON,
    supplier: "BSRM Steels Ltd.",
    reorderPoint: 60,
    reorderQuantity: 250,
    reserved: 25,
    lastCountedDaysAgo: 5,
    ledger: [
      [26, "RECEIPT", 300, "GRN-4490"],
      [21, "SALE", -55, "B360-10001"],
      [1, "SALE", -35, "B360-10020"],
    ],
  }),
  item({
    key: "rod16",
    location: TEJGAON,
    supplier: "AKS Steel Mills",
    reorderPoint: 50,
    reorderQuantity: 200,
    reserved: 120,
    lastCountedDaysAgo: 5,
    ledger: [
      [23, "RECEIPT", 400, "GRN-4505"],
      [14, "SALE", -115],
      [3, "SALE", -120, "B360-10014"],
    ],
  }),
  item({
    key: "angle",
    location: TEJGAON,
    supplier: "Sharif Metal Works",
    reorderPoint: 30,
    reorderQuantity: 120,
    reserved: 20,
    lastCountedDaysAgo: 5,
    ledger: [
      [28, "RECEIPT", 150, "GRN-4463"],
      [9, "SALE", -42, "B360-10006"],
      [4, "SALE", -20, "B360-10012"],
    ],
  }),
  item({
    key: "brick",
    location: MIRPUR,
    supplier: "Padma Brickfield",
    reorderPoint: 5000,
    reorderQuantity: 20000,
    reserved: 2000,
    lastCountedDaysAgo: 16,
    ledger: [
      [31, "RECEIPT", 25000, "GRN-4390"],
      [18, "SALE", -5000, "B360-10011"],
      [5, "SALE", -2000],
    ],
  }),
  item({
    key: "sand",
    location: MIRPUR,
    supplier: "Meghna Aggregates",
    reorderPoint: 300,
    reorderQuantity: 1500,
    reserved: 120,
    lastCountedDaysAgo: 16,
    ledger: [
      [29, "RECEIPT", 2000, "GRN-4412"],
      [18, "SALE", -300, "B360-10016"],
      [2, "SALE", -250],
    ],
  }),
  item({
    key: "stone",
    location: MIRPUR,
    supplier: "Meghna Aggregates",
    reorderPoint: 250,
    reorderQuantity: 1200,
    reserved: 200,
    lastCountedDaysAgo: 16,
    ledger: [
      [29, "RECEIPT", 1500, "GRN-4413"],
      [15, "SALE", -320],
      [6, "SALE", -200, "B360-10009"],
    ],
  }),
  item({
    key: "tileFloor",
    location: KALURGHAT,
    supplier: "RAK Ceramics Bangladesh",
    reorderPoint: 30,
    reorderQuantity: 120,
    reserved: 24,
    lastCountedDaysAgo: 7,
    ledger: [
      [25, "RECEIPT", 160, "GRN-4451"],
      [12, "SALE", -46, "B360-10004"],
      [4, "SALE", -24, "B360-10022"],
      [3, "RETURN", 6, "RFD-2039"],
    ],
  }),
  item({
    key: "tileWall",
    location: KALURGHAT,
    supplier: "Akij Ceramics Ltd.",
    reorderPoint: 25,
    reorderQuantity: 100,
    reserved: 6,
    lastCountedDaysAgo: 7,
    ledger: [
      [25, "RECEIPT", 120, "GRN-4452"],
      [12, "SALE", -48, "B360-10004"],
      [2, "SALE", -10, "B360-10018"],
    ],
  }),
  item({
    key: "tileMosaic",
    location: KALURGHAT,
    supplier: "DBL Ceramics Ltd.",
    reorderPoint: 20,
    reorderQuantity: 80,
    reserved: 0,
    // Counted to zero and marked out of stock — the two agree, which is what
    // the rest of the catalogue is supposed to look like.
    productStatus: "OUT_OF_STOCK",
    lastCountedDaysAgo: 4,
    ledger: [
      [22, "RECEIPT", 60, "GRN-4455"],
      [13, "SALE", -44],
      [4, "SALE", -16],
    ],
  }),
  item({
    key: "paint",
    location: TEJGAON,
    supplier: "Berger Paints Bangladesh",
    reorderPoint: 8,
    reorderQuantity: 40,
    // Twelve buckets on the shelf, twelve already promised: nothing free to
    // sell, yet the product is still ACTIVE on the storefront. This is the
    // overselling case the screen is built to catch.
    reserved: 12,
    lastCountedDaysAgo: 6,
    ledger: [
      [20, "RECEIPT", 40, "GRN-4466"],
      [17, "SALE", -22, "B360-10003"],
      [2, "SALE", -6, "B360-10017"],
    ],
  }),
  item({
    key: "putty",
    location: TEJGAON,
    supplier: "Berger Paints Bangladesh",
    reorderPoint: 20,
    reorderQuantity: 80,
    reserved: 10,
    lastCountedDaysAgo: 6,
    ledger: [
      [20, "RECEIPT", 80, "GRN-4467"],
      [7, "SALE", -48, "B360-10017"],
      [1, "SALE", -6],
    ],
  }),
  item({
    key: "thinner",
    location: TEJGAON,
    supplier: "Elite Paint & Chemical",
    reorderPoint: 15,
    reorderQuantity: 60,
    reserved: 0,
    lastCountedDaysAgo: 6,
    ledger: [
      [21, "RECEIPT", 100, "GRN-4468"],
      [10, "SALE", -26],
      [3, "SALE", -10],
    ],
  }),
  item({
    key: "wire",
    location: MIRPUR,
    supplier: "BRB Cable Industries",
    reorderPoint: 15,
    reorderQuantity: 60,
    reserved: 3,
    lastCountedDaysAgo: 11,
    ledger: [
      [24, "RECEIPT", 60, "GRN-4433"],
      [12, "SALE", -35],
      [2, "SALE", -8, "B360-10015"],
    ],
  }),
  item({
    key: "switchBox",
    location: MIRPUR,
    supplier: "Super Star Group",
    reorderPoint: 25,
    reorderQuantity: 100,
    reserved: 0,
    // Forty on the shelf after last week's delivery, and still flagged out of
    // stock — nobody flipped the product back. Stock nobody can buy.
    productStatus: "OUT_OF_STOCK",
    lastCountedDaysAgo: 3,
    ledger: [
      [26, "RECEIPT", 100, "GRN-4429"],
      [15, "SALE", -80],
      [5, "RECEIPT", 20, "GRN-4512"],
    ],
  }),
  item({
    key: "pipe",
    location: KALURGHAT,
    supplier: "RFL Plastics Ltd.",
    reorderPoint: 40,
    reorderQuantity: 160,
    reserved: 38,
    lastCountedDaysAgo: 8,
    ledger: [
      [27, "RECEIPT", 220, "GRN-4440"],
      [9, "SALE", -45, "B360-10006"],
      [1, "SALE", -30, "B360-10024"],
    ],
  }),
  item({
    key: "pipe2",
    location: KALURGHAT,
    supplier: "RFL Plastics Ltd.",
    reorderPoint: 50,
    reorderQuantity: 200,
    reserved: 0,
    lastCountedDaysAgo: 8,
    ledger: [
      [27, "RECEIPT", 450, "GRN-4441"],
      [14, "SALE", -90],
      [4, "SALE", -40],
    ],
  }),
  item({
    key: "gypsum",
    location: TEJGAON,
    supplier: "Gyproc Bangladesh",
    reorderPoint: 60,
    reorderQuantity: 250,
    reserved: 135,
    lastCountedDaysAgo: 10,
    ledger: [
      [28, "RECEIPT", 500, "GRN-4461"],
      [20, "SALE", -140],
      [4, "SALE", -70, "B360-10012"],
    ],
  }),
  item({
    key: "nail",
    location: MIRPUR,
    supplier: "Sharif Metal Works",
    reorderPoint: 50,
    reorderQuantity: 200,
    reserved: 7,
    lastCountedDaysAgo: 14,
    ledger: [
      [30, "RECEIPT", 400, "GRN-4398"],
      [19, "SALE", -120],
      [7, "SALE", -40],
    ],
  }),
  item({
    key: "bitumen",
    location: AMBERKHANA,
    supplier: "Shalimar Waterproofing",
    reorderPoint: 10,
    reorderQuantity: 0,
    reserved: 0,
    // Not restocking this line. Six rolls left to run down.
    productStatus: "DISCONTINUED",
    lastCountedDaysAgo: 21,
    ledger: [
      [40, "RECEIPT", 30, "GRN-4301"],
      [26, "SALE", -22],
      [13, "DAMAGE", -2, "Torn in storage"],
    ],
  }),
];

/* -------------------------------------------------------------------------- */
/* Querying                                                                   */
/* -------------------------------------------------------------------------- */

export type InventoryFilters = {
  search: string;
  status: StockStatus | typeof ALL;
  brand: string | typeof ALL;
  location: string | typeof ALL;
  sort: InventorySort;
  /** 1-based, as it appears in the URL. */
  page: number;
};

export type StatusCounts = Record<StockStatus | typeof ALL, number>;

export type InventoryListing = {
  items: InventoryPage;
  /** Counted *before* the status filter, so the tabs never read zero. */
  counts: StatusCounts;
};

function matchesSearch(one: InventoryItem, search: string): boolean {
  if (!search) return true;

  const needle = search.toLowerCase();
  return (
    one.name.toLowerCase().includes(needle) ||
    one.sku.toLowerCase().includes(needle) ||
    one.brand.toLowerCase().includes(needle) ||
    one.category.toLowerCase().includes(needle)
  );
}

/**
 * One page of stock.
 *
 * Same URL contract as every other list in the panel, so swapping in a real
 * endpoint is a change of body, not of interface.
 */
export function listSampleInventory(
  filters: InventoryFilters,
): InventoryListing {
  // Everything except the status filter, so the tab counts stay meaningful
  // while a status is selected.
  const scoped = SAMPLE_INVENTORY.filter(
    (one) =>
      matchesSearch(one, filters.search) &&
      (filters.brand === ALL || one.brand === filters.brand) &&
      (filters.location === ALL || one.location === filters.location),
  );

  const counts: StatusCounts = {
    ALL: scoped.length,
    IN_STOCK: 0,
    LOW: 0,
    OUT_OF_STOCK: 0,
    DISCONTINUED: 0,
  };
  for (const one of scoped) counts[stockStatus(one)] += 1;

  const matched =
    filters.status === ALL
      ? scoped
      : scoped.filter((one) => stockStatus(one) === filters.status);

  const ordered = sortInventory(matched, filters.sort);

  const size = INVENTORY_PAGE_SIZE_DEFAULT;
  const totalPages = Math.max(1, Math.ceil(ordered.length / size));
  const start = (filters.page - 1) * size;

  return {
    items: {
      // Left unclamped on purpose: a page past the end comes back empty, which
      // is what sends the visitor to the last real page.
      content: ordered.slice(start, start + size),
      page: filters.page - 1,
      size,
      totalElements: ordered.length,
      totalPages,
      first: filters.page <= 1,
      last: filters.page >= totalPages,
    },
    counts,
  };
}

/** One line, or null. Stands in for `GET /admin/inventory/{id}`. */
export function findSampleInventoryItem(id: string): InventoryItem | null {
  return SAMPLE_INVENTORY.find((one) => one.id === id) ?? null;
}

export type InventorySummary = {
  skus: number;
  low: number;
  outOfStock: number;
  /** Lines whose counted stock and storefront status disagree. */
  mismatched: number;
  /** Everything on every shelf, at cost. */
  stockValue: number;
};

/**
 * The headline numbers.
 *
 * Read over the whole fixture, never the current filter — these describe the
 * warehouse, and a number that moved when you typed in the search box would be
 * describing the search box.
 */
export function sampleInventorySummary(): InventorySummary {
  return {
    skus: SAMPLE_INVENTORY.length,
    low: SAMPLE_INVENTORY.filter((one) => stockStatus(one) === "LOW").length,
    outOfStock: SAMPLE_INVENTORY.filter(
      (one) => stockStatus(one) === "OUT_OF_STOCK",
    ).length,
    mismatched: SAMPLE_INVENTORY.filter((one) => statusMismatch(one) !== null)
      .length,
    stockValue: SAMPLE_INVENTORY.reduce(
      (total, one) => total + stockValue(one),
      0,
    ),
  };
}


/* -------------------------------------------------------------------------- */
/* Cross-fixture identity                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The id an order line uses for a catalogue product.
 *
 * The orders fixture calls this rather than formatting the string itself, so
 * the two halves of the id cannot drift — which is what lets the reports
 * fixture map a sold line back to the shelf it came off.
 */
export function productIdFor(key: ProductKey): string {
  return `prd_${key}`;
}

/** The catalogue entry behind an order line, or null for an unknown id. */
export function catalogForProductId(
  id: string,
): (CatalogEntry & { key: ProductKey }) | null {
  const key = id.replace(/^prd_/, "") as ProductKey;
  const entry = CATALOG[key];

  return entry ? { ...entry, key } : null;
}

/** The stock line behind an order line, or null if it is not tracked. */
export function inventoryForProductId(id: string): InventoryItem | null {
  const entry = catalogForProductId(id);
  if (!entry) return null;

  return findSampleInventoryItem(`inv_${entry.key}`);
}
