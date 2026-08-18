"use client";

import Link from "next/link";
import { PackageX } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import { ProductForm } from "./product-form";
import { useProducts } from "./products-store";

export function EditProductScreen({ id }: { id: string }) {
  const { getById } = useProducts();
  const product = getById(id);

  if (!product) {
    return (
      <Empty className="py-24">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageX />
          </EmptyMedia>
          <EmptyTitle>Product not found</EmptyTitle>
          <EmptyDescription>
            This product may have been deleted, or the page was reloaded — the
            demo store keeps products in memory only.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link href="/products" />}>Back to products</Button>
        </EmptyContent>
      </Empty>
    );
  }

  return <ProductForm product={product} />;
}
