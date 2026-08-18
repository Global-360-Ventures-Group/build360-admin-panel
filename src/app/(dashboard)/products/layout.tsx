import { mockProducts } from "@/features/products/data";
import { ProductsProvider } from "@/features/products/products-store";

/**
 * Holds the product store for every /products/* screen. Because this layout
 * stays mounted while navigating between the list, create and edit routes,
 * changes made on one screen are visible on the others.
 *
 * TODO: replace mockProducts with a real data fetch (DB / API).
 */
export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProductsProvider initialProducts={mockProducts}>
      {children}
    </ProductsProvider>
  );
}
