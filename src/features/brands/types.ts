/**
 * Brand models, mirroring `AdminBrandResponse` from the Build360 API.
 *
 * Deliberate differences from the shape this screen used while it ran on mock
 * data, so nobody re-adds them by accident:
 *
 * - `website` is gone. The API has no such field on a brand, so there was
 *   nowhere to send it.
 * - `productCount` is gone. `GET /admin/brands` does not return it, and there
 *   is no endpoint that does.
 * - `status` is no longer editable. Create and update do not accept it; a
 *   brand becomes INACTIVE by being archived and ACTIVE by being restored.
 * - `isTop` and `displayOrder` are new, and are set through the dedicated
 *   `/{id}/top` endpoints rather than the update body.
 */

export type BrandStatus = "ACTIVE" | "INACTIVE";

export type Brand = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  /**
   * Derived from `logoUrl`, because the API returns the URL but its update
   * body accepts only the key. Required to resubmit an unchanged logo.
   */
  logoObjectKey?: string;
  description?: string;
  status: BrandStatus;
  isTop: boolean;
  /** Sort position among top brands. Null until the brand is marked top. */
  displayOrder: number | null;
  /** Naive local date-time from the API — see `parseApiDateTime`. */
  createdAt: string;
  updatedAt: string;
};

/** One page of brands, mirroring `PageResponseAdminBrandResponse`. */
export type BrandPage = {
  content: Brand[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

/**
 * What the create/update form collects.
 *
 * `logoObjectKey` is what the API stores — the key returned by
 * `POST /admin/media`. `logoUrl` is only carried alongside it so the dialog
 * can show a preview, and is never sent back.
 */
export type BrandFormValues = {
  name: string;
  slug: string;
  description: string;
  logoObjectKey: string;
  logoUrl: string;
};

export const emptyBrandForm: BrandFormValues = {
  name: "",
  slug: "",
  description: "",
  logoObjectKey: "",
  logoUrl: "",
};

/** Field limits taken from `BrandCreateRequest` / `BrandUpdateRequest`. */
export const BRAND_LIMITS = {
  name: 150,
  slug: 150,
  description: 2000,
  logoObjectKey: 512,
} as const;

/** The API's slug rule, copied from the request schema's `pattern`. */
export const BRAND_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Largest `size` the list endpoint accepts; anything more is a 400. */
export const BRAND_PAGE_SIZE_MAX = 50;
export const BRAND_PAGE_SIZE_DEFAULT = 20;

/**
 * Parse a timestamp from the API.
 *
 * The API sends naive local date-times with no zone or offset
 * (`2026-07-26T14:44:56.445707`). `new Date(...)` reads that as the *viewer's*
 * local time, which is the behaviour we want here — the API and the office are
 * in the same zone — but it is worth being explicit, because appending "Z"
 * (the reflex fix) would silently shift every timestamp by the UTC offset.
 */
export function parseApiDateTime(value: string): Date {
  return new Date(value);
}
