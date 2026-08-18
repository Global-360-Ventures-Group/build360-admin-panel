import type { Metadata } from "next";

import { ProductForm } from "@/features/products/product-form";

export const metadata: Metadata = {
  title: "New product - Build360 Admin",
};

export default function NewProductPage() {
  return <ProductForm />;
}
