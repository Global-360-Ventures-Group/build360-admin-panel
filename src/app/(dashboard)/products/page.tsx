import type { Metadata } from "next";

import { ProductsView } from "@/features/products/products-view";

export const metadata: Metadata = {
  title: "Products - Build360 Admin",
};

export default function ProductsPage() {
  return <ProductsView />;
}
