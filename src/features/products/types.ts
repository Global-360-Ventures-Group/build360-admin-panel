/**
 * Product models, mirroring `AdminProductResponse` from the Build360 API.
 *
 * Substantial differences from the shape this feature used on mock data, so
 * nobody re-adds them by accident:
 *
 * - **There is no stock tracking.** `stock` and `lowStockThreshold` do not
 *   exist anywhere in the API. Availability is expressed only as the
 *   `OUT_OF_STOCK` status, so the old stock column, low-stock filter and
 *   `getStockLevel` helper have no data behind them and are gone.
 * - `compareAtPrice` became `discountPrice`, **and the meaning inverted**.
 *   `compareAtPrice` was the higher struck-through price; `discountPrice` is
 *   the lower promotional one. Any arithmetic copied from the old code will be
 *   backwards — see `discountPercent`.
 * - A single `imageUrl` became an ordered gallery with a primary flag,
 *   managed through its own endpoints rather than the product body.
 * - Status went from three values to four.
 * - `rating` and `reviewCount` are read-only. `PUT` documents that it never
 *   changes them.
 * - New writable fields: `shortDescription`, `specification`, `manufacturer`,
 *   `refundReturnPolicy`, `minimumOrderQuantity`, `weight`.
 */

export type ProductStatus = "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK" | "DISCONTINUED";

export const PRODUCT_STATUSES: ProductStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "OUT_OF_STOCK",
  "DISCONTINUED",
];

export const productStatusLabels: Record<ProductStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  OUT_OF_STOCK: "Out of stock",
  DISCONTINUED: "Discontinued",
};

/**
 * How each status is coloured.
 *
 * `OUT_OF_STOCK` is a warning rather than an error: the product is fine, it
 * just cannot be bought right now. `DISCONTINUED` is the terminal one.
 */
export const productStatusTone: Record<
  ProductStatus,
  "default" | "secondary" | "warning" | "destructive"
> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  OUT_OF_STOCK: "warning",
  DISCONTINUED: "destructive",
};

export type ProductImage = {
  id: string;
  imageUrl: string;
  /** Position in the gallery. The API's own data is 1-based. */
  displayOrder: number;
  /** Exactly one image per product carries this. */
  primary: boolean;
};

export type Product = {
  id: string;
  brandId: string;
  categoryId: string;
  sku: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  specification?: string;
  manufacturer?: string;
  refundReturnPolicy?: string;
  /** Free text at the API (max 50), though in practice one of `KNOWN_UNITS`. */
  unit: string;
  costPrice: number | null;
  price: number;
  /** Promotional price, **lower** than `price`. Null when not on offer. */
  discountPrice: number | null;
  minimumOrderQuantity: number;
  weight: number | null;
  /** Read-only: set by customer reviews, never by this panel. */
  rating: number | null;
  reviewCount: number;
  featured: boolean;
  status: ProductStatus;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
};

/** One page of products, mirroring `PageResponseAdminProductResponse`. */
export type ProductPage = {
  content: Product[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

/**
 * What the form collects.
 *
 * Numbers are carried as strings so an empty input stays empty rather than
 * collapsing to 0 — the difference between "no cost recorded" and "costs
 * nothing" matters here.
 */
export type ProductFormValues = {
  name: string;
  slug: string;
  sku: string;
  brandId: string;
  categoryId: string;
  unit: string;
  shortDescription: string;
  description: string;
  specification: string;
  manufacturer: string;
  refundReturnPolicy: string;
  price: string;
  costPrice: string;
  discountPrice: string;
  minimumOrderQuantity: string;
  weight: string;
  featured: boolean;
  /** Editable on update only; create always yields an ACTIVE product. */
  status: ProductStatus;
};

export const emptyProductForm: ProductFormValues = {
  name: "",
  slug: "",
  sku: "",
  brandId: "",
  categoryId: "",
  unit: "",
  shortDescription: "",
  description: "",
  specification: "",
  manufacturer: "",
  refundReturnPolicy: "",
  price: "",
  costPrice: "",
  discountPrice: "",
  minimumOrderQuantity: "1",
  weight: "",
  featured: false,
  status: "ACTIVE",
};

/** Sentinel for a `<Select>`, which cannot hold an empty value. */
export const NONE = "__none__";

/** Field limits from `ProductCreateRequest` / `ProductUpdateRequest`. */
export const PRODUCT_LIMITS = {
  sku: 100,
  name: 256,
  slug: 300,
  shortDescription: 1000,
  description: 20000,
  specification: 20000,
  manufacturer: 2000,
  refundReturnPolicy: 5000,
  unit: 50,
  search: 256,
} as const;

export const PRODUCT_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const PRODUCT_PAGE_SIZE_MAX = 50;
export const PRODUCT_PAGE_SIZE_DEFAULT = 20;

/**
 * Units observed in the live catalog.
 *
 * Offered as suggestions, not enforced: the API takes any string up to 50
 * characters, so restricting the form to these would reject data the API
 * accepts.
 */
export const KNOWN_UNITS = [
  "BAG",
  "BOX",
  "BUCKET",
  "CFT",
  "COIL",
  "CUM",
  "DRUM",
  "PIECE",
  "TON",
] as const;

/**
 * Discount as a percentage off `price`, or null when the product is not on
 * offer.
 *
 * Note the direction: `discountPrice` is the **lower** price, the opposite of
 * the `compareAtPrice` this replaced.
 */
export function discountPercent(product: {
  price: number;
  discountPrice: number | null;
}): number | null {
  if (product.discountPrice == null) return null;
  if (product.price <= 0 || product.discountPrice >= product.price) return null;

  return Math.round(
    ((product.price - product.discountPrice) / product.price) * 100,
  );
}

/** Margin as a percentage of the selling price, or null without a cost. */
export function marginPercent(product: {
  price: number;
  costPrice: number | null;
}): number | null {
  if (product.costPrice == null || product.price <= 0) return null;

  return Math.round(((product.price - product.costPrice) / product.price) * 100);
}

/** The price a customer actually pays. */
export function effectivePrice(product: {
  price: number;
  discountPrice: number | null;
}): number {
  return product.discountPrice ?? product.price;
}

/** The gallery's primary image, falling back to the first by display order. */
export function primaryImage(product: {
  images: ProductImage[];
}): ProductImage | undefined {
  const ordered = [...product.images].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );

  return ordered.find((image) => image.primary) ?? ordered[0];
}

/** "BSRM-DB-12" from "BSRM Deformed Bar 12mm" — a reasonable SKU starting point. */
export function suggestSku(name: string) {
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .trim();
  if (!cleaned) return "";

  return cleaned.split(/\s+/).slice(0, 3).join("-");
}
