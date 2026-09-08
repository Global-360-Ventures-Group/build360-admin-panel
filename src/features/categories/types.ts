/**
 * Category models, mirroring `AdminCategoryResponse` from the Build360 API.
 *
 * Deliberate differences from the shape this screen used on mock data, so
 * nobody re-adds them by accident:
 *
 * - `description` is gone. A category has no such field in the API.
 * - `productCount` is gone. No endpoint returns it.
 * - `status` is no longer editable. Create and update do not accept it; a
 *   category becomes INACTIVE by being archived and ACTIVE by being restored.
 * - `parentId` is **create-only**. `CategoryUpdateRequest` has no `parentId`,
 *   so a category cannot be re-parented once it exists.
 * - `shortLabel`, `level` and `fullPath` are new. The last two are computed by
 *   the API, so the hierarchy does not have to be inferred from `parentId`.
 * - There are now two images per category — an icon and a cover image — each
 *   with its own upload slot.
 */

import { objectKeyFromUrl } from "@/lib/api/media-keys";

export type CategoryStatus = "ACTIVE" | "INACTIVE";

export type Category = {
  id: string;
  /** Null for a top-level category. */
  parentId: string | null;
  name: string;
  slug: string;
  /** Short storefront label. The API only populates it for top-level rows. */
  shortLabel?: string;
  /** Depth in the tree, 0 for top level. Computed by the API. */
  level: number;
  /** Ancestor chain including this category, e.g. "Cement > Cement > OP Cement". */
  fullPath: string;
  iconUrl?: string;
  imageUrl?: string;
  /**
   * Derived from the URLs above, because the API returns URLs but its update
   * body accepts only keys. Required to resubmit an unchanged image — update
   * is a full replace, so an omitted key clears the field.
   */
  iconObjectKey?: string;
  imageObjectKey?: string;
  /** Position among siblings, lower first. */
  sortOrder: number;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
};

/** The separator the API uses inside `fullPath`. */
export const CATEGORY_PATH_SEPARATOR = " > ";

export type CategoryFormValues = {
  name: string;
  slug: string;
  shortLabel: string;
  parentId: string | null;
  sortOrder: string;
};

export const emptyCategoryForm: CategoryFormValues = {
  name: "",
  slug: "",
  shortLabel: "",
  parentId: null,
  sortOrder: "",
};

/** Sentinel for the parent `<Select>`, which cannot hold `null`. */
export const NO_PARENT = "__root__";

/** Field limits from `CategoryCreateRequest` / `CategoryUpdateRequest`. */
export const CATEGORY_LIMITS = {
  name: 128,
  slug: 200,
  shortLabel: 64,
  search: 128,
} as const;

export const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Largest `size` the list endpoint accepts; more is a 400. */
export const CATEGORY_PAGE_SIZE_MAX = 50;

/**
 * Drop the last segment of a `fullPath`, leaving the ancestor trail.
 *
 * Cheaper and more reliable than walking `parentId` links, since the API has
 * already resolved the chain.
 */
export function parentPath(category: Category): string {
  const segments = category.fullPath.split(CATEGORY_PATH_SEPARATOR);
  segments.pop();

  return segments.join(CATEGORY_PATH_SEPARATOR);
}

/** Recover an object key from a stored category image URL. */
export function categoryIconKey(iconUrl: string | undefined) {
  return objectKeyFromUrl(iconUrl, "CATEGORY_ICON");
}

export function categoryImageKey(imageUrl: string | undefined) {
  return objectKeyFromUrl(imageUrl, "CATEGORY_IMAGE");
}

// ── tree shaping ────────────────────────────────────────────────────────────
// The list endpoint returns a flat list across every level, so the hierarchy
// is assembled here for display.

export type CategoryNode = Category & {
  depth: number;
  children: CategoryNode[];
};

/** A flat row ready to render in the tree table. */
export type CategoryRow = Category & {
  depth: number;
  hasChildren: boolean;
  /** Total number of descendants, all levels. */
  descendantCount: number;
};

function bySortThenName(a: Category, b: Category) {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;

  return a.name.localeCompare(b.name);
}

/**
 * Build a nested tree from the flat list.
 *
 * A category whose parent is not in the list is treated as top-level. That
 * happens legitimately: filtering by status can return a child whose parent is
 * archived, and dropping it would hide the row entirely.
 */
export function buildTree(categories: Category[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  for (const category of categories) {
    byId.set(category.id, { ...category, depth: 0, children: [] });
  }

  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const applyDepth = (nodes: CategoryNode[], depth: number) => {
    nodes.sort(bySortThenName);
    for (const node of nodes) {
      node.depth = depth;
      applyDepth(node.children, depth + 1);
    }
  };
  applyDepth(roots, 0);

  return roots;
}

/** All descendant ids of `id` — children, grandchildren, and so on. */
export function getDescendantIds(
  categories: Category[],
  id: string,
): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;

    const siblings = childrenOf.get(category.parentId);
    if (siblings) siblings.push(category.id);
    else childrenOf.set(category.parentId, [category.id]);
  }

  const result = new Set<string>();
  const stack = [...(childrenOf.get(id) ?? [])];
  while (stack.length) {
    const current = stack.pop()!;
    if (result.has(current)) continue; // guards against malformed cycles
    result.add(current);
    stack.push(...(childrenOf.get(current) ?? []));
  }

  return result;
}

/** Ancestor ids of `id`, from the top-level parent down to the direct parent. */
export function getAncestorIds(categories: Category[], id: string): string[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const path: string[] = [];
  const seen = new Set<string>();

  let current = byId.get(id)?.parentId ?? null;
  while (current && !seen.has(current)) {
    seen.add(current);
    path.unshift(current);
    current = byId.get(current)?.parentId ?? null;
  }

  return path;
}

/**
 * Flatten the tree into table rows, keeping only nodes whose ancestors are all
 * expanded. `visibleIds`, when given, restricts the output to those nodes —
 * used while searching.
 */
export function flattenTree(
  roots: CategoryNode[],
  expandedIds: Set<string>,
  visibleIds?: Set<string>,
): CategoryRow[] {
  const rows: CategoryRow[] = [];

  const countDescendants = (node: CategoryNode): number =>
    node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);

  const walk = (nodes: CategoryNode[]) => {
    for (const node of nodes) {
      if (visibleIds && !visibleIds.has(node.id)) continue;

      const visibleChildren = visibleIds
        ? node.children.filter((child) => visibleIds.has(child.id))
        : node.children;

      rows.push({
        ...node,
        hasChildren: visibleChildren.length > 0,
        descendantCount: countDescendants(node),
      });

      if (visibleChildren.length > 0 && expandedIds.has(node.id)) {
        walk(visibleChildren);
      }
    }
  };

  walk(roots);

  return rows;
}
