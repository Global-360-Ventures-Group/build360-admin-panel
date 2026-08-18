"use client";

import * as React from "react";

import { newId } from "@/lib/utils";

import type { Product, ProductFormValues, ProductStatus } from "./types";

/**
 * Client-side product store.
 *
 * It lives in the `/products` route layout, so state survives navigation
 * between the list, create and edit screens (but not a full page reload).
 * Swap the bodies of these actions for real API calls when a backend exists.
 */
type ProductsStore = {
  products: Product[];
  getById: (id: string) => Product | undefined;
  create: (values: ProductFormValues) => Promise<Product>;
  update: (id: string, values: ProductFormValues) => Promise<void>;
  remove: (ids: string[]) => Promise<void>;
  setStatus: (ids: string[], status: ProductStatus) => Promise<void>;
  toggleFeatured: (id: string) => void;
};

const ProductsContext = React.createContext<ProductsStore | null>(null);

/** Simulated network latency so loading states are visible. */
const fakeRequest = () => new Promise<void>((r) => setTimeout(r, 400));

function fromForm(values: ProductFormValues) {
  return {
    name: values.name,
    slug: values.slug,
    sku: values.sku,
    description: values.description || undefined,
    brandId: values.brandId,
    categoryId: values.categoryId,
    price: values.price,
    compareAtPrice: values.compareAtPrice,
    costPrice: values.costPrice,
    stock: values.stock,
    lowStockThreshold: values.lowStockThreshold,
    unit: values.unit,
    imageUrl: values.imageUrl || undefined,
    status: values.status,
    featured: values.featured,
  };
}

export function ProductsProvider({
  initialProducts,
  children,
}: {
  initialProducts: Product[];
  children: React.ReactNode;
}) {
  const [products, setProducts] = React.useState<Product[]>(initialProducts);

  const value = React.useMemo<ProductsStore>(
    () => ({
      products,

      getById: (id) => products.find((p) => p.id === id),

      create: async (values) => {
        await fakeRequest();
        const now = new Date().toISOString();
        const product: Product = {
          id: newId("prd"),
          ...fromForm(values),
          createdAt: now,
          updatedAt: now,
        };
        setProducts((list) => [product, ...list]);
        return product;
      },

      update: async (id, values) => {
        await fakeRequest();
        setProducts((list) =>
          list.map((p) =>
            p.id === id
              ? { ...p, ...fromForm(values), updatedAt: new Date().toISOString() }
              : p,
          ),
        );
      },

      remove: async (ids) => {
        await fakeRequest();
        const doomed = new Set(ids);
        setProducts((list) => list.filter((p) => !doomed.has(p.id)));
      },

      setStatus: async (ids, status) => {
        await fakeRequest();
        const affected = new Set(ids);
        const now = new Date().toISOString();
        setProducts((list) =>
          list.map((p) =>
            affected.has(p.id) ? { ...p, status, updatedAt: now } : p,
          ),
        );
      },

      toggleFeatured: (id) => {
        setProducts((list) =>
          list.map((p) =>
            p.id === id
              ? { ...p, featured: !p.featured, updatedAt: new Date().toISOString() }
              : p,
          ),
        );
      },
    }),
    [products],
  );

  return (
    <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
  );
}

export function useProducts() {
  const store = React.useContext(ProductsContext);
  if (!store) {
    throw new Error("useProducts must be used inside <ProductsProvider>");
  }
  return store;
}
