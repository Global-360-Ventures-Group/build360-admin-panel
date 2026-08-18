import type { Metadata } from "next";

import { EditProductScreen } from "@/features/products/edit-product-screen";

export const metadata: Metadata = {
  title: "Edit product - Build360 Admin",
};

export default async function EditProductPage({
  params,
}: PageProps<"/products/[id]/edit">) {
  const { id } = await params;
  return <EditProductScreen id={id} />;
}
