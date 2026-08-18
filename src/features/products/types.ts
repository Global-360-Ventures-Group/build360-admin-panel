export type ProductStatus = "draft" | "active" | "archived";

export type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description?: string;
  brandId: string | null;
  categoryId: string | null;
  /** Selling price, in the smallest sensible unit of the display currency. */
  price: number;
  /** Original price shown struck through. Must be greater than `price`. */
  compareAtPrice: number | null;
  costPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  unit: string;
  imageUrl?: string;
  status: ProductStatus;
  featured: boolean;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
};

export type ProductFormValues = {
  name: string;
  slug: string;
  sku: string;
  description: string;
  brandId: string | null;
  categoryId: string | null;
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  unit: string;
  imageUrl: string;
  status: ProductStatus;
  featured: boolean;
};

export const emptyProductForm: ProductFormValues = {
  name: "",
  slug: "",
  sku: "",
  description: "",
  brandId: null,
  categoryId: null,
  price: 0,
  compareAtPrice: null,
  costPrice: null,
  stock: 0,
  lowStockThreshold: 5,
  unit: "pcs",
  imageUrl: "",
  status: "draft",
  featured: false,
};

/** Sentinel for <Select>, which cannot hold `null`. */
export const NONE = "__none__";

export const productStatusLabels: Record<ProductStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

export const productStatusVariant: Record<
  ProductStatus,
  "default" | "secondary" | "outline"
> = {
  draft: "secondary",
  active: "default",
  archived: "outline",
};

export const unitOptions = [
  "pcs",
  "bag",
  "kg",
  "ton",
  "sft",
  "sqm",
  "litre",
  "box",
  "roll",
  "set",
];

export type StockLevel = "out" | "low" | "in";

export function getStockLevel(product: {
  stock: number;
  lowStockThreshold: number;
}): StockLevel {
  if (product.stock <= 0) return "out";
  if (product.stock <= product.lowStockThreshold) return "low";
  return "in";
}

export const stockLevelLabels: Record<StockLevel, string> = {
  out: "Out of stock",
  low: "Low stock",
  in: "In stock",
};

/** Discount percentage vs. the compare-at price, or null when not on sale. */
export function getDiscountPercent(product: {
  price: number;
  compareAtPrice: number | null;
}): number | null {
  if (!product.compareAtPrice || product.compareAtPrice <= product.price) {
    return null;
  }
  return Math.round(
    ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100,
  );
}

/** Profit margin as a percentage of the selling price, or null without a cost. */
export function getMarginPercent(product: {
  price: number;
  costPrice: number | null;
}): number | null {
  if (product.costPrice == null || product.price <= 0) return null;
  return Math.round(((product.price - product.costPrice) / product.price) * 100);
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
