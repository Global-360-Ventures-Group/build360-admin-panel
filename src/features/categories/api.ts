/**
 * The six `/admin/categories` endpoints.
 *
 * Response fields are optional in the OpenAPI document, so `toCategory`
 * narrows each record once here and the rest of the feature works with a
 * complete `Category`.
 */

import { authedRequestData } from "@/lib/api/authed";
import { uploadMedia, type MediaUpload } from "@/lib/api/media";

import {
  CATEGORY_PAGE_SIZE_MAX,
  categoryIconKey,
  categoryImageKey,
  type Category,
  type CategoryStatus,
} from "./types";

/** Raw `AdminCategoryResponse`, exactly as loose as the spec declares it. */
type AdminCategoryResponse = {
  id?: string;
  parentId?: string | null;
  name?: string;
  slug?: string;
  shortLabel?: string | null;
  level?: number;
  fullPath?: string;
  iconUrl?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  status?: CategoryStatus;
  createdAt?: string;
  updatedAt?: string;
};

type PageResponse<T> = {
  content?: T[];
  page?: number;
  totalPages?: number;
  totalElements?: number;
  last?: boolean;
};

export type CategoryListQuery = {
  page?: number;
  size?: number;
  status?: CategoryStatus;
  /** Direct children of this category only. */
  parentId?: string;
  search?: string;
};

/** What create accepts. Only `name` is required. */
export type CategoryCreateInput = {
  name: string;
  parentId?: string;
  slug?: string;
  shortLabel?: string;
  iconObjectKey?: string;
  imageObjectKey?: string;
  sortOrder?: number;
};

/**
 * What update accepts — the same minus `parentId`.
 *
 * The omission is the API's, not an oversight here: `CategoryUpdateRequest`
 * has no `parentId`, so a category cannot be moved to a different parent once
 * created.
 */
export type CategoryUpdateInput = Omit<CategoryCreateInput, "parentId">;

/**
 * How many pages `listAllCategories` will fetch before giving up.
 *
 * At the API's maximum page size this is 500 categories, far beyond any
 * sensible navigation tree. It exists so a runaway dataset cannot spin
 * forever, not as an expected limit.
 */
const MAX_PAGES = 10;

export type AllCategories = {
  categories: Category[];
  /**
   * True when `MAX_PAGES` was hit and rows were left unfetched. The screen
   * must say so rather than quietly render an incomplete tree.
   */
  truncated: boolean;
};

/**
 * Every category, assembled by paging through the list endpoint.
 *
 * The whole set is fetched deliberately. A tree cannot be rendered from one
 * page: a third-level row is meaningless without its ancestors, and searching
 * has to match against rows that may sit on any page. Category trees are
 * small and bounded by design — this is not the pattern for products.
 */
export async function listAllCategories(
  query: Omit<CategoryListQuery, "page" | "size"> = {},
): Promise<AllCategories> {
  const categories: Category[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await listCategories({ ...query, page, size: CATEGORY_PAGE_SIZE_MAX });
    categories.push(...result.content);

    if (result.last || result.content.length === 0) {
      return { categories, truncated: false };
    }
  }

  return { categories, truncated: true };
}

/** `GET /admin/categories` — one page. */
export async function listCategories(query: CategoryListQuery = {}): Promise<{
  content: Category[];
  page: number;
  totalElements: number;
  last: boolean;
}> {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(0, query.page ?? 0)));
  params.set(
    "size",
    String(Math.min(CATEGORY_PAGE_SIZE_MAX, Math.max(1, query.size ?? CATEGORY_PAGE_SIZE_MAX))),
  );
  if (query.status) params.set("status", query.status);
  if (query.parentId) params.set("parentId", query.parentId);
  if (query.search) params.set("search", query.search);

  const result = await authedRequestData<PageResponse<AdminCategoryResponse>>(
    `/admin/categories?${params}`,
  );

  const content = (result.content ?? []).flatMap((raw) => {
    const category = toCategory(raw);
    return category ? [category] : [];
  });

  return {
    content,
    page: result.page ?? 0,
    totalElements: result.totalElements ?? content.length,
    last: result.last ?? true,
  };
}

/** `GET /admin/categories/{id}`. */
export async function getCategory(id: string): Promise<Category | null> {
  return toCategory(
    await authedRequestData<AdminCategoryResponse>(`/admin/categories/${id}`),
  );
}

/** `POST /admin/categories` — creates a category, or a subcategory with `parentId`. */
export function createCategory(input: CategoryCreateInput): Promise<Category | null> {
  return authedRequestData<AdminCategoryResponse>("/admin/categories", {
    method: "POST",
    body: input,
  }).then(toCategory);
}

/** `PUT /admin/categories/{id}`. A full replace — omitted fields are cleared. */
export function updateCategory(
  id: string,
  input: CategoryUpdateInput,
): Promise<Category | null> {
  return authedRequestData<AdminCategoryResponse>(`/admin/categories/${id}`, {
    method: "PUT",
    body: input,
  }).then(toCategory);
}

/** `DELETE /admin/categories/{id}` — archive, setting status INACTIVE. */
export function archiveCategory(id: string): Promise<Category | null> {
  return authedRequestData<AdminCategoryResponse>(`/admin/categories/${id}`, {
    method: "DELETE",
  }).then(toCategory);
}

/** `POST /admin/categories/{id}/restore` — back to ACTIVE. */
export function restoreCategory(id: string): Promise<Category | null> {
  return authedRequestData<AdminCategoryResponse>(`/admin/categories/${id}/restore`, {
    method: "POST",
  }).then(toCategory);
}

/** Upload a category icon and get the key to store on the category. */
export async function uploadCategoryIcon(file: File): Promise<MediaUpload | null> {
  const [uploaded] = await uploadMedia("CATEGORY_ICON", [file]);

  return uploaded ?? null;
}

/** Upload a category cover image. */
export async function uploadCategoryImage(file: File): Promise<MediaUpload | null> {
  const [uploaded] = await uploadMedia("CATEGORY_IMAGE", [file]);

  return uploaded ?? null;
}

/**
 * Narrow a raw response into a `Category`, or null when it lacks an id.
 *
 * `fullPath` falls back to the name so a row is never labelled blank, and
 * `level` falls back to whether it has a parent — both are API-computed and
 * absent only if something upstream changes.
 */
function toCategory(raw: AdminCategoryResponse): Category | null {
  if (!raw.id) return null;

  return {
    id: raw.id,
    parentId: raw.parentId ?? null,
    name: raw.name ?? "",
    slug: raw.slug ?? "",
    shortLabel: raw.shortLabel || undefined,
    level: raw.level ?? (raw.parentId ? 1 : 0),
    fullPath: raw.fullPath || raw.name || "",
    iconUrl: raw.iconUrl || undefined,
    imageUrl: raw.imageUrl || undefined,
    iconObjectKey: categoryIconKey(raw.iconUrl ?? undefined),
    imageObjectKey: categoryImageKey(raw.imageUrl ?? undefined),
    sortOrder: raw.sortOrder ?? 0,
    status: raw.status ?? "ACTIVE",
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? "",
  };
}
