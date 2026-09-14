/**
 * The nine `/admin/products` endpoints, including the image sub-resource.
 *
 * The one thing to internalise before using this: **images and status live on
 * opposite sides of the create/update split.**
 *
 * - `POST /admin/products` accepts `images` but not `status`. A new product is
 *   always ACTIVE.
 * - `PUT /admin/products/{id}` accepts `status` but not `images`. Once a
 *   product exists, its gallery is only reachable through
 *   `/admin/products/{id}/images`.
 *
 * So creating with images is one call, but changing them later is always a
 * separate one.
 */

import { authedRequestData } from "@/lib/api/authed";
import { ApiError } from "@/lib/api/errors";
import { uploadMedia, type MediaUpload } from "@/lib/api/media";
import { fetchAllPages } from "@/lib/api/paging";

import {
  PRODUCT_PAGE_SIZE_DEFAULT,
  PRODUCT_PAGE_SIZE_MAX,
  type Product,
  type ProductImage,
  type ProductPage,
  type ProductStatus,
} from "./types";

/** Raw `AdminProductImageResponse`. */
type AdminProductImageResponse = {
  id?: string;
  imageUrl?: string;
  displayOrder?: number;
  primary?: boolean;
};

/** Raw `AdminProductResponse`, as loose as the spec declares it. */
type AdminProductResponse = {
  id?: string;
  brandId?: string;
  categoryId?: string;
  sku?: string;
  name?: string;
  slug?: string;
  shortDescription?: string | null;
  description?: string | null;
  specification?: string | null;
  manufacturer?: string | null;
  refundReturnPolicy?: string | null;
  unit?: string;
  costPrice?: number | null;
  price?: number;
  discountPrice?: number | null;
  minimumOrderQuantity?: number;
  weight?: number | null;
  rating?: number | null;
  reviewCount?: number;
  featured?: boolean;
  status?: ProductStatus;
  images?: AdminProductImageResponse[];
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

export type ProductListQuery = {
  page?: number;
  size?: number;
  status?: ProductStatus;
  brandId?: string;
  categoryId?: string;
  /** Case-insensitive, matches name or SKU. */
  search?: string;
};

/** An image as sent when creating a product, or appending to a gallery. */
export type ProductImageInput = {
  objectKey: string;
  displayOrder?: number;
  primary?: boolean;
};

/** The fields both create and update accept. */
export type ProductInputBase = {
  brandId: string;
  categoryId: string;
  name: string;
  price: number;
  unit: string;
  minimumOrderQuantity: number;
  sku?: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  specification?: string;
  manufacturer?: string;
  refundReturnPolicy?: string;
  costPrice?: number;
  discountPrice?: number;
  weight?: number;
  featured?: boolean;
};

/** Create also takes the initial gallery. It does not take a status. */
export type ProductCreateInput = ProductInputBase & {
  images?: ProductImageInput[];
};

/** Update also takes a status. It does not take images. */
export type ProductUpdateInput = ProductInputBase & {
  status?: ProductStatus;
};

/**
 * `GET /admin/products` — one page, including non-ACTIVE products.
 *
 * `size` is clamped to the API's maximum of 50; asking for more is a 400
 * rather than a truncated page.
 */
export async function listProducts(
  query: ProductListQuery = {},
): Promise<ProductPage> {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(0, query.page ?? 0)));
  params.set(
    "size",
    String(
      Math.min(
        PRODUCT_PAGE_SIZE_MAX,
        Math.max(1, query.size ?? PRODUCT_PAGE_SIZE_DEFAULT),
      ),
    ),
  );
  if (query.status) params.set("status", query.status);
  if (query.brandId) params.set("brandId", query.brandId);
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.search) params.set("search", query.search);

  const page = await authedRequestData<PageResponse<AdminProductResponse>>(
    `/admin/products?${params}`,
  );

  const content = (page.content ?? []).flatMap((raw) => {
    const product = toProduct(raw);
    return product ? [product] : [];
  });

  return {
    content,
    page: page.page ?? 0,
    size: page.size ?? PRODUCT_PAGE_SIZE_DEFAULT,
    totalElements: page.totalElements ?? content.length,
    totalPages: page.totalPages ?? 1,
    first: page.first ?? true,
    last: page.last ?? true,
  };
}

export type AllProducts = {
  products: Product[];
  /** How many the API says match — what `truncated` is measured against. */
  total: number;
  /** True when rows are genuinely missing — see `fetchAllPages`. */
  truncated: boolean;
};

/**
 * Every product matching the filters, assembled by paging through the list
 * endpoint.
 *
 * Only sorting needs this, and it is deliberately not what the list screen
 * uses by default — one page is all that screen needs. But
 * `GET /admin/products` has no ordering parameter, so "newest first" cannot be
 * asked of the API, and ordering a single page would sort the twenty rows the
 * API happened to return rather than the catalog.
 *
 * The filters still go to the API, so this walks the matching rows rather than
 * the whole catalog.
 */
export async function listAllProducts(
  query: Omit<ProductListQuery, "page" | "size"> = {},
): Promise<AllProducts> {
  const { items, total, truncated } = await fetchAllPages(
    (page) => listProducts({ ...query, page, size: PRODUCT_PAGE_SIZE_MAX }),
    (product) => product.id,
  );

  return { products: items, total, truncated };
}

/**
 * `GET /admin/products/{id}` — any status, with the full gallery.
 *
 * Returns null both for an unknown product (404) and for an id the API will
 * not even parse (400 "Invalid value for parameter 'id'", since the path
 * expects a UUID). Callers want the same answer — "no such product" — for
 * both, and without collapsing them a hand-typed URL surfaced as a 500
 * instead of a not-found page.
 */
export async function getProduct(id: string): Promise<Product | null> {
  try {
    return toProduct(
      await authedRequestData<AdminProductResponse>(`/admin/products/${id}`),
    );
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      return null;
    }

    throw error;
  }
}

/**
 * `POST /admin/products`.
 *
 * The brand and category must both be ACTIVE. SKU is generated when blank and
 * the slug is derived from the name when omitted. A duplicate slug or SKU is a
 * 409, not a validation error.
 */
export function createProduct(input: ProductCreateInput): Promise<Product | null> {
  return authedRequestData<AdminProductResponse>("/admin/products", {
    method: "POST",
    body: input,
  }).then(toProduct);
}

/** `PUT /admin/products/{id}` — replaces the editable fields. */
export function updateProduct(
  id: string,
  input: ProductUpdateInput,
): Promise<Product | null> {
  return authedRequestData<AdminProductResponse>(`/admin/products/${id}`, {
    method: "PUT",
    body: input,
  }).then(toProduct);
}

/** `DELETE /admin/products/{id}` — sets status INACTIVE. Requires PRODUCT_ARCHIVE. */
export function archiveProduct(id: string): Promise<Product | null> {
  return authedRequestData<AdminProductResponse>(`/admin/products/${id}`, {
    method: "DELETE",
  }).then(toProduct);
}

/** `POST /admin/products/{id}/restore` — sets status ACTIVE. Requires PRODUCT_UPDATE. */
export function restoreProduct(id: string): Promise<Product | null> {
  return authedRequestData<AdminProductResponse>(`/admin/products/${id}/restore`, {
    method: "POST",
  }).then(toProduct);
}

/**
 * `POST /admin/products/{productId}/images` — appends to the gallery.
 *
 * The body is a bare JSON array, not an object wrapping one. A flagged primary
 * becomes the sole primary, and the first image added to an empty gallery
 * becomes primary automatically.
 *
 * Measured against the live API: answers **201**, and returns the **whole
 * gallery** rather than only the appended images — so the result can be used
 * to refresh the editor's state directly.
 */
export async function addProductImages(
  productId: string,
  images: ProductImageInput[],
): Promise<ProductImage[]> {
  const result = await authedRequestData<AdminProductImageResponse[]>(
    `/admin/products/${productId}/images`,
    { method: "POST", body: images },
  );

  return toImages(result);
}

/**
 * `PUT /admin/products/{productId}/images` — reorders the whole gallery.
 *
 * This is a **full replace of the ordering**: the request must list every
 * image the product has, each with its new `displayOrder`, and exactly one
 * flagged primary. Build it from the complete gallery, never a subset.
 *
 * Both rules are enforced, and rejections leave the gallery untouched:
 *
 *     two primaries  -> 400 "Exactly one image must be primary."
 *     a subset       -> 400 "The order must list exactly the product's images."
 *
 * Returns the reordered gallery.
 */
export async function reorderProductImages(
  productId: string,
  images: { imageId: string; displayOrder: number; primary: boolean }[],
): Promise<ProductImage[]> {
  const result = await authedRequestData<AdminProductImageResponse[]>(
    `/admin/products/${productId}/images`,
    { method: "PUT", body: { images } },
  );

  return toImages(result);
}

/**
 * `DELETE /admin/products/{productId}/images/{imageId}`.
 *
 * If the deleted image was primary, the API promotes the first remaining one,
 * so the gallery never ends up without a primary.
 *
 * The response carries the remaining gallery, which is discarded here — the
 * caller revalidates instead. Note there is no way to delete the underlying
 * bucket object; this only detaches it from the product.
 */
export async function deleteProductImage(
  productId: string,
  imageId: string,
): Promise<void> {
  await authedRequestData<unknown>(
    `/admin/products/${productId}/images/${imageId}`,
    { method: "DELETE" },
  );
}

/** Upload product images and get the keys to attach. */
export function uploadProductImages(files: File[]): Promise<MediaUpload[]> {
  return uploadMedia("PRODUCT", files);
}

function toImages(raw: AdminProductImageResponse[] | undefined): ProductImage[] {
  return (raw ?? [])
    .flatMap((image) =>
      image.id && image.imageUrl
        ? [
            {
              id: image.id,
              imageUrl: image.imageUrl,
              displayOrder: image.displayOrder ?? 0,
              primary: image.primary ?? false,
            },
          ]
        : [],
    )
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Narrow a raw response into a `Product`, or null when it lacks an id.
 *
 * `costPrice`, `discountPrice` and `weight` stay nullable rather than
 * defaulting to 0 — the live data has nulls in all three, and "no cost
 * recorded" is not the same claim as "costs nothing".
 */
function toProduct(raw: AdminProductResponse): Product | null {
  if (!raw.id) return null;

  return {
    id: raw.id,
    brandId: raw.brandId ?? "",
    categoryId: raw.categoryId ?? "",
    sku: raw.sku ?? "",
    name: raw.name ?? "",
    slug: raw.slug ?? "",
    shortDescription: raw.shortDescription || undefined,
    description: raw.description || undefined,
    specification: raw.specification || undefined,
    manufacturer: raw.manufacturer || undefined,
    refundReturnPolicy: raw.refundReturnPolicy || undefined,
    unit: raw.unit ?? "",
    costPrice: raw.costPrice ?? null,
    price: raw.price ?? 0,
    discountPrice: raw.discountPrice ?? null,
    minimumOrderQuantity: raw.minimumOrderQuantity ?? 1,
    weight: raw.weight ?? null,
    rating: raw.rating ?? null,
    reviewCount: raw.reviewCount ?? 0,
    featured: raw.featured ?? false,
    status: raw.status ?? "ACTIVE",
    images: toImages(raw.images),
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? "",
  };
}
