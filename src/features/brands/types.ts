export type BrandStatus = "active" | "inactive";

export type Brand = {
  id: string;
  name: string;
  slug: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  status: BrandStatus;
  productCount: number;
  createdAt: string; // ISO date
};

export type BrandFormValues = {
  name: string;
  slug: string;
  website: string;
  logoUrl: string;
  description: string;
  status: BrandStatus;
};

export const emptyBrandForm: BrandFormValues = {
  name: "",
  slug: "",
  website: "",
  logoUrl: "",
  description: "",
  status: "active",
};
