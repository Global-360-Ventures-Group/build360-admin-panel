/**
 * The eight `/admin/brands` endpoints.
 *
 * Response fields are optional in the OpenAPI document, so `toBrand` narrows
 * each record once here and the rest of the feature works with a complete
 * `Brand`.
 */

import { authedRequestData } from "@/lib/api/authed";
import { objectKeyFromUrl, uploadMedia, type MediaUpload } from "@/lib/api/media";
import { fetchAllPages } from "@/lib/api/paging";

import {
  BRAND_PAGE_SIZE_DEFAULT,
  BRAND_PAGE_SIZE_MAX,
  type Brand,
  type BrandPage,
  type BrandStatus,
} from "./types";

/** Raw `AdminBrandResponse`, exactly as loose as the spec declares it. */
type AdminBrandResponse = {
  id?: string;
  name?: string;
  slug?: string;
  logoUrl?: string;
  description?: string;
  status?: BrandStatus;
  isTop?: boolean;
  displayOrder?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

type PageResponse<T> = {
  content?: T[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
};

export type BrandListQuery = {
  page?: number;
  size?: number;
  status?: BrandStatus;
  /** Matches name and description. */
  search?: string;
};

/** What create and update accept. Only `name` is required. */
export type BrandInput = {
  name: string;
  slug?: string;
  description?: string;
  logoObjectKey?: string;
};

/**
 * `GET /admin/brands` — one page of brands.
 *
 * `size` is clamped to the API's maximum of 50; asking for more is a 400
 * rather than a truncated page, so it is clamped here instead of trusting the
 * caller.
 */
export async function listBrands(query: BrandListQuery = {}): Promise<BrandPage> {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(0, query.page ?? 0)));
  params.set(
    "size",
    String(Math.min(BRAND_PAGE_SIZE_MAX, Math.max(1, query.size ?? BRAND_PAGE_SIZE_DEFAULT))),
  );
  if (query.status) params.set("status", query.status);
  if (query.search) params.set("search", query.search);

  const page = await authedRequestData<PageResponse<AdminBrandResponse>>(
    `/admin/brands?${params}`,
  );

  const content = (page.content ?? []).flatMap((raw) => {
    const brand = toBrand(raw);
    return brand ? [brand] : [];
  });

  return {
    content,
    page: page.page ?? 0,
    size: page.size ?? BRAND_PAGE_SIZE_DEFAULT,
    totalElements: page.totalElements ?? content.length,
    totalPages: page.totalPages ?? 1,
    first: page.first ?? true,
    last: page.last ?? true,
  };
}

/**
 * Every brand matching the query, rather than one page.
 *
 * Two callers, same reason — a page is not enough. The product pickers would
 * silently hide brands the user is allowed to choose, and the brands list
 * cannot sort what it has not got: `GET /admin/brands` has no ordering
 * parameter, so sorting one page would order the twenty rows the API happened
 * to return and call it "newest first".
 *
 * There is no ceiling here beyond `fetchAllPages`' runaway guard: a missing
 * brand means a product gets saved against the wrong one.
 */
export async function listAllBrands(
  query: Omit<BrandListQuery, "page" | "size"> = {},
): Promise<{ brands: Brand[]; total: number; truncated: boolean }> {
  const { items, total, truncated } = await fetchAllPages(
    (page) => listBrands({ ...query, page, size: BRAND_PAGE_SIZE_MAX }),
    (brand) => brand.id,
  );

  return { brands: items, total, truncated };
}

/** `GET /admin/brands/{id}`. */
export async function getBrand(id: string): Promise<Brand | null> {
  return toBrand(await authedRequestData<AdminBrandResponse>(`/admin/brands/${id}`));
}

/** `POST /admin/brands`. */
export function createBrand(input: BrandInput): Promise<Brand | null> {
  return authedRequestData<AdminBrandResponse>("/admin/brands", {
    method: "POST",
    body: input,
  }).then(toBrand);
}

/** `PUT /admin/brands/{id}`. */
export function updateBrand(id: string, input: BrandInput): Promise<Brand | null> {
  return authedRequestData<AdminBrandResponse>(`/admin/brands/${id}`, {
    method: "PUT",
    body: input,
  }).then(toBrand);
}

/**
 * `DELETE /admin/brands/{id}` — archive, setting status to INACTIVE.
 *
 * Not a hard delete: the brand stays retrievable with `status=INACTIVE` and
 * can be restored.
 */
export function archiveBrand(id: string): Promise<Brand | null> {
  return authedRequestData<AdminBrandResponse>(`/admin/brands/${id}`, {
    method: "DELETE",
  }).then(toBrand);
}

/** `POST /admin/brands/{id}/restore` — back to ACTIVE. */
export function restoreBrand(id: string): Promise<Brand | null> {
  return authedRequestData<AdminBrandResponse>(`/admin/brands/${id}/restore`, {
    method: "POST",
  }).then(toBrand);
}

/**
 * `POST /admin/brands/{id}/top` — mark as top, or move an existing top brand.
 *
 * `displayOrder` is the sort position; omitting it lets the API place the
 * brand itself.
 */
export function markBrandTop(id: string, displayOrder?: number): Promise<Brand | null> {
  return authedRequestData<AdminBrandResponse>(`/admin/brands/${id}/top`, {
    method: "POST",
    body: displayOrder === undefined ? {} : { displayOrder },
  }).then(toBrand);
}

/** `DELETE /admin/brands/{id}/top` — remove from the top list. */
export function unmarkBrandTop(id: string): Promise<Brand | null> {
  return authedRequestData<AdminBrandResponse>(`/admin/brands/${id}/top`, {
    method: "DELETE",
  }).then(toBrand);
}

/** Upload a logo and get the key to store on the brand. */
export async function uploadBrandLogo(file: File): Promise<MediaUpload | null> {
  const [uploaded] = await uploadMedia("BRAND", [file]);

  return uploaded ?? null;
}

/**
 * Narrow a raw response into a `Brand`, or null when it lacks an id — the one
 * field there is no sensible default for.
 */
function toBrand(raw: AdminBrandResponse): Brand | null {
  if (!raw.id) return null;

  return {
    id: raw.id,
    name: raw.name ?? "",
    slug: raw.slug ?? "",
    logoUrl: raw.logoUrl || undefined,
    logoObjectKey: objectKeyFromUrl(raw.logoUrl, "BRAND"),
    description: raw.description || undefined,
    status: raw.status ?? "ACTIVE",
    isTop: raw.isTop ?? false,
    displayOrder: raw.displayOrder ?? null,
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? "",
  };
}
