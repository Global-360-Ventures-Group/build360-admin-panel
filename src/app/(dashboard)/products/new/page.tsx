import type { Metadata } from "next";
import { forbidden } from "next/navigation";

import { loadProductOptions } from "@/features/products/product-options";
import { ProductForm } from "@/features/products/product-form";
import { hasPermission, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "New product · Build360 Admin",
};

export default async function NewProductPage() {
  const user = await requireUser();

  if (!hasPermission(user, "PRODUCT_CREATE")) forbidden();

  const options = await loadProductOptions();

  // No gallery here: POST accepts inline images, but a file cannot be attached
  // before the product has an id, so images are added on the editor after
  // saving. The form redirects there itself.
  return (
    <ProductForm brands={options.brands} categories={options.categories} />
  );
}
