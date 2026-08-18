import type { Metadata } from "next";

import { BrandsView } from "@/features/brands/brands-view";
import { mockBrands } from "@/features/brands/data";

export const metadata: Metadata = {
  title: "Brands · Build360 Admin",
};

export default function BrandsPage() {
  // TODO: replace mockBrands with a real data fetch (DB / API).
  return <BrandsView initialBrands={mockBrands} />;
}
