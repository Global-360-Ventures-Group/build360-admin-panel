import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";

import { getProduct } from "@/features/products/api";
import { ProductForm } from "@/features/products/product-form";
import { ProductGallery } from "@/features/products/product-gallery";
import { loadProductOptions } from "@/features/products/product-options";
import { hasPermission, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Edit product · Build360 Admin",
};

export default async function EditProductPage({
  params,
}: PageProps<"/products/[id]/edit">) {
  const user = await requireUser();

  if (!hasPermission(user, "PRODUCT_VIEW")) forbidden();

  const { id } = await params;

  const [product, options] = await Promise.all([
    getProduct(id),
    loadProductOptions(),
  ]);

  // The API 404s an unknown id, which surfaces here as a null product.
  if (!product) notFound();

  return (
    <>
      <ProductForm
        product={product}
        brands={options.brands}
        categories={options.categories}
      />
      {/*
        Outside the form on purpose. The gallery endpoints act immediately and
        independently of the product body — PUT /admin/products/{id} does not
        accept images at all — so nesting these controls inside the form would
        imply they are saved with it.
      */}
      <ProductGallery
        productId={product.id}
        images={product.images}
        canEdit={hasPermission(user, "PRODUCT_UPDATE")}
      />
    </>
  );
}
