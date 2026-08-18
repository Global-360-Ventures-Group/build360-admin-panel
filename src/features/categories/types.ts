export type CategoryStatus = "active" | "inactive";

export type Category = {
  id: string;
  name: string;
  slug: string;
  /** null = top-level category */
  parentId: string | null;
  description?: string;
  imageUrl?: string;
  status: CategoryStatus;
  productCount: number;
  /** Position among siblings (lower first) */
  sortOrder: number;
  createdAt: string; // ISO date
};

export type CategoryFormValues = {
  name: string;
  slug: string;
  parentId: string | null;
  description: string;
  imageUrl: string;
  sortOrder: number;
  status: CategoryStatus;
};

export const emptyCategoryForm: CategoryFormValues = {
  name: "",
  slug: "",
  parentId: null,
  description: "",
  imageUrl: "",
  sortOrder: 0,
  status: "active",
};

/** Sentinel used by the parent <Select>, since it cannot hold `null`. */
export const NO_PARENT = "__root__";

export type CategoryNode = Category & {
  depth: number;
  children: CategoryNode[];
};

/** A flat row ready to render in the tree table. */
export type CategoryRow = Category & {
  depth: number;
  hasChildren: boolean;
  /** Total number of descendants (all levels). */
  descendantCount: number;
};

function bySortThenName(a: Category, b: Category) {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name);
}

/** Build a nested tree from the flat list. Orphans are treated as top-level. */
export function buildTree(categories: Category[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  for (const c of categories) {
    byId.set(c.id, { ...c, depth: 0, children: [] });
  }

  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const applyDepth = (nodes: CategoryNode[], depth: number) => {
    nodes.sort(bySortThenName);
    for (const n of nodes) {
      n.depth = depth;
      applyDepth(n.children, depth + 1);
    }
  };
  applyDepth(roots, 0);

  return roots;
}

/** All descendant ids of `id` (children, grandchildren, …). */
export function getDescendantIds(
  categories: Category[],
  id: string,
): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    const list = childrenOf.get(c.parentId);
    if (list) list.push(c.id);
    else childrenOf.set(c.parentId, [c.id]);
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

/** Ancestor chain of `id`, from the top-level parent down to the direct parent. */
export function getAncestorIds(
  categories: Category[],
  id: string,
): string[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
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

/** "Building Materials / Cement" — the full path label of a category. */
export function getPathLabel(categories: Category[], id: string): string {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const names = getAncestorIds(categories, id).map(
    (aid) => byId.get(aid)?.name ?? "",
  );
  const self = byId.get(id)?.name;
  return [...names, self].filter(Boolean).join(" / ");
}

/**
 * Flatten the tree into table rows, keeping only nodes whose ancestors are all
 * expanded. `visibleIds`, when given, restricts the output to those nodes
 * (used while searching).
 */
export function flattenTree(
  roots: CategoryNode[],
  expandedIds: Set<string>,
  visibleIds?: Set<string>,
): CategoryRow[] {
  const rows: CategoryRow[] = [];

  const countDescendants = (node: CategoryNode): number =>
    node.children.reduce((sum, c) => sum + 1 + countDescendants(c), 0);

  const walk = (nodes: CategoryNode[]) => {
    for (const node of nodes) {
      if (visibleIds && !visibleIds.has(node.id)) continue;
      const visibleChildren = visibleIds
        ? node.children.filter((c) => visibleIds.has(c.id))
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
