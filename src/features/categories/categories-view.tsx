"use client";

import * as React from "react";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import {
  archiveCategoryAction,
  restoreCategoryAction,
  type CategoryActionResult,
} from "./actions";
import { ArchiveCategoryDialog } from "./archive-category-dialog";
import { CategoryFormDialog } from "./category-form-dialog";
import {
  buildTree,
  categorySortLabels,
  CATEGORY_SORTS,
  DEFAULT_CATEGORY_SORT,
  flattenTree,
  getAncestorIds,
  type Category,
  type CategoryRow,
  type CategorySort,
} from "./types";

export type CategoryPermissions = {
  create: boolean;
  update: boolean;
  archive: boolean;
};

/**
 * How many rows are painted at once.
 *
 * Nothing is dropped — the rest is one button away. This exists because
 * filtering expands the whole tree, and on a national catalog that is
 * thousands of rows arriving in a single commit, which drops frames on every
 * keystroke in the search box.
 */
const ROW_CHUNK = 200;

const sortItems = CATEGORY_SORTS.map((sort) => ({
  label: categorySortLabels[sort],
  value: sort,
}));

/**
 * The categories tree.
 *
 * Unlike brands, this screen receives the **whole** set rather than one page,
 * and filters it in the browser. That is a property of the data, not
 * inconsistency: a third-level row is meaningless without its ancestors, and
 * a search has to be able to match a descendant and still show the path down
 * to it. Neither is possible from a single page, so `listAllCategories`
 * pages the endpoint to the end and hands the whole catalog over.
 */
export function CategoriesView({
  categories,
  total,
  truncated,
  can,
}: {
  categories: Category[];
  /** What the API says the catalog holds, so a shortfall can be named exactly. */
  total: number;
  truncated: boolean;
  can: CategoryPermissions;
}) {
  const [query, setQuery] = React.useState("");
  // Archived categories stay out of the way by default: they are the
  // exception, and the storefront cannot reach them at all.
  const [includeArchived, setIncludeArchived] = React.useState(false);
  const [sort, setSort] = React.useState<CategorySort>(DEFAULT_CATEGORY_SORT);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [defaultParentId, setDefaultParentId] = React.useState<string | null>(null);
  const [archiving, setArchiving] = React.useState<CategoryRow | null>(null);

  const deferredQuery = React.useDeferredValue(query.trim().toLowerCase());
  const searching = deferredQuery !== "";
  // Hiding archived rows narrows the tree just as a search does, so both feed
  // `visibleIds`. Only a search expands it, though — see `effectiveExpanded`.
  const narrowed = searching || !includeArchived;
  /** Whether the view is off its default, which is what Reset undoes. */
  const hasFilters = query !== "" || includeArchived;

  // Sorting reorders siblings only, so the tree is rebuilt rather than the
  // rows re-sorted — a row's position depends on where its parent landed.
  const tree = React.useMemo(
    () => buildTree(categories, sort),
    [categories, sort],
  );

  /**
   * Which rows survive the filters.
   *
   * A row is kept when it matches, and every ancestor of a match is kept too —
   * otherwise a matching subcategory would have nothing to hang from and the
   * tree would render it as a stray root.
   */
  const visibleIds = React.useMemo(() => {
    if (!narrowed) return undefined;

    const matches = categories.filter((category) => {
      const matchesQuery =
        !deferredQuery ||
        category.name.toLowerCase().includes(deferredQuery) ||
        category.slug.includes(deferredQuery) ||
        category.fullPath.toLowerCase().includes(deferredQuery);
      const matchesStatus = includeArchived || category.status === "ACTIVE";

      return matchesQuery && matchesStatus;
    });

    const keep = new Set<string>();
    for (const match of matches) {
      keep.add(match.id);
      for (const ancestorId of getAncestorIds(categories, match.id)) {
        keep.add(ancestorId);
      }
    }

    return keep;
  }, [categories, deferredQuery, includeArchived, narrowed]);

  // While searching, everything is expanded so matches deep in the tree are
  // actually on screen. Hiding archived rows deliberately expands nothing:
  // that is the default view, not a search.
  const effectiveExpanded = React.useMemo(
    () => (searching ? new Set(categories.map((c) => c.id)) : expanded),
    [searching, categories, expanded],
  );

  const rows = React.useMemo(
    () => flattenTree(tree, effectiveExpanded, visibleIds),
    [tree, effectiveExpanded, visibleIds],
  );

  // A new filter is a new result set, so the reveal starts over. Keyed rather
  // than reset from an effect so the first paint after a keystroke is already
  // the short list. Expanding a node deliberately does not reset it — that
  // would yank rows the user has scrolled to back off the screen.
  const filterKey = `${deferredQuery}|${includeArchived}`;
  const [reveal, setReveal] = React.useState({ key: filterKey, limit: ROW_CHUNK });
  const rowLimit = reveal.key === filterKey ? reveal.limit : ROW_CHUNK;

  const shownRows = rows.length > rowLimit ? rows.slice(0, rowLimit) : rows;
  const hiddenRows = rows.length - shownRows.length;

  const activeCount = categories.filter((c) => c.status === "ACTIVE").length;
  const parentIds = React.useMemo(
    () => categories.filter((c) => categories.some((x) => x.parentId === c.id)),
    [categories],
  );

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runAction(
    category: CategoryRow,
    action: () => Promise<CategoryActionResult>,
  ) {
    setPendingId(category.id);

    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) toast.success(result.message);
        else toast.error(result.message);
      } finally {
        setPendingId(null);
      }
    });
  }

  function openCreate(parentId: string | null) {
    setEditing(null);
    setDefaultParentId(parentId);
    setFormOpen(true);
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Organise the catalog into a browsable tree.{" "}
            <span className="tabular-nums">
              {categories.length} total · {activeCount} active
            </span>
          </p>
        </div>
        {can.create ? (
          <Button onClick={() => openCreate(null)} className="w-full sm:w-auto">
            <Plus /> Add category
          </Button>
        ) : null}
      </div>

      {truncated ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            Loaded{" "}
            <span className="tabular-nums">
              {categories.length} of {total}
            </span>{" "}
            categories — the API stopped returning new rows, so this tree is
            missing branches. Reload the page; if it persists the list endpoint
            is repeating pages and needs looking at server-side.
          </span>
        </div>
      ) : null}

      <Card className="min-w-0 py-0">
        <CardHeader className="border-b py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, slug or path…"
                className="pr-8 pl-8"
                aria-label="Search categories"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {/*
                An archived category still shows while unticked if one of its
                children is active — the tree cannot draw the path down to a
                live row without it. It keeps its Inactive badge, so it reads
                as the ancestor it is rather than as a row that slipped past.
              */}
              <div className="flex h-8 shrink-0 items-center gap-2">
                <Checkbox
                  id="categories-include-archived"
                  checked={includeArchived}
                  onCheckedChange={(checked) =>
                    setIncludeArchived(checked === true)
                  }
                />
                <label
                  htmlFor="categories-include-archived"
                  className="cursor-pointer text-sm font-normal whitespace-nowrap text-muted-foreground select-none"
                >
                  Include archived
                </label>
              </div>
              {/*
                Orders each parent's children. Sorting the whole list flat
                would tear subcategories away from the path that gives them
                meaning, so the nesting is never touched.
              */}
              <Select
                value={sort}
                onValueChange={(value) =>
                  setSort((value as CategorySort) ?? DEFAULT_CATEGORY_SORT)
                }
                items={sortItems}
              >
                <SelectTrigger
                  className="w-full md:w-52"
                  aria-label="Sort categories"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {sortItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() =>
                  setExpanded((current) =>
                    current.size === 0
                      ? new Set(parentIds.map((c) => c.id))
                      : new Set(),
                  )
                }
                disabled={searching || parentIds.length === 0}
                title={
                  searching ? "Everything is expanded while searching" : undefined
                }
              >
                {expanded.size === 0 ? "Expand all" : "Collapse all"}
              </Button>
              {hasFilters ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setQuery("");
                    setIncludeArchived(false);
                  }}
                >
                  <X /> Reset
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {rows.length === 0 ? (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FolderTree />
                </EmptyMedia>
                <EmptyTitle>
                  {narrowed
                    ? "No categories match your filters"
                    : "No categories yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {searching
                    ? "Try a different search term or clear the filters."
                    : includeArchived
                      ? "Get started by creating your first category."
                      : "Every category is archived. Tick Include archived to see them, or create a new one."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {hasFilters ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuery("");
                      setIncludeArchived(false);
                    }}
                  >
                    Clear filters
                  </Button>
                ) : can.create ? (
                  <Button onClick={() => openCreate(null)}>
                    <Plus /> Add category
                  </Button>
                ) : null}
              </EmptyContent>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Category</TableHead>
                  <TableHead className="hidden md:table-cell">Slug</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">
                    Sort
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shownRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="pl-4">
                      <div
                        className="flex min-w-0 items-center gap-1.5"
                        // Indent by depth so nesting is legible without a
                        // separate column.
                        style={{ paddingLeft: `${row.depth * 1.25}rem` }}
                      >
                        {row.hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggle(row.id)}
                            disabled={hasFilters}
                            className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
                            aria-label={
                              effectiveExpanded.has(row.id) ? "Collapse" : "Expand"
                            }
                            aria-expanded={effectiveExpanded.has(row.id)}
                          >
                            {effectiveExpanded.has(row.id) ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </button>
                        ) : (
                          <span className="inline-block size-5" aria-hidden />
                        )}

                        <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded border bg-muted">
                          {row.iconUrl ? (
                            /* Category icons are often SVG and always tiny, so
                               there is nothing for next/image to optimise. */
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.iconUrl}
                              alt=""
                              className="size-full object-contain"
                            />
                          ) : (
                            <FolderTree className="size-3.5 text-muted-foreground" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "block max-w-[16rem] truncate sm:max-w-sm",
                                row.depth === 0 ? "font-medium" : "",
                              )}
                            >
                              {row.name}
                            </span>
                            {row.descendantCount > 0 ? (
                              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                ({row.descendantCount})
                              </span>
                            ) : null}
                            {pendingId === row.id ? (
                              <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                            ) : null}
                          </div>
                          {row.shortLabel ? (
                            <div className="truncate text-xs text-muted-foreground">
                              {row.shortLabel}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                      /{row.slug}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                      {row.sortOrder}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.status === "ACTIVE" ? "default" : "secondary"}
                      >
                        {row.status === "ACTIVE" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              aria-label={`Actions for ${row.name}`}
                            />
                          }
                        >
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {can.update ? (
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(row);
                                setDefaultParentId(null);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil /> Edit
                            </DropdownMenuItem>
                          ) : null}
                          {can.create ? (
                            <DropdownMenuItem onClick={() => openCreate(row.id)}>
                              <Plus /> Add subcategory
                            </DropdownMenuItem>
                          ) : null}
                          {row.status === "ACTIVE" ? (
                            can.archive ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setArchiving(row)}
                                >
                                  <Archive /> Archive
                                </DropdownMenuItem>
                              </>
                            ) : null
                          ) : (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  runAction(row, () => restoreCategoryAction(row.id))
                                }
                              >
                                <RotateCcw /> Restore
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {hiddenRows > 0 ? (
            <div className="flex flex-col items-center gap-2 border-t px-4 py-3 sm:flex-row sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="tabular-nums">
                  {shownRows.length} of {rows.length}
                </span>{" "}
                rows.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setReveal({ key: filterKey, limit: rowLimit + ROW_CHUNK })
                }
              >
                Show {Math.min(ROW_CHUNK, hiddenRows)} more
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editing}
        defaultParentId={defaultParentId}
        allCategories={categories}
      />
      <ArchiveCategoryDialog
        open={archiving !== null}
        onOpenChange={(open) => {
          if (!open) setArchiving(null);
        }}
        category={archiving}
        onConfirm={(category) =>
          runAction(category, () => archiveCategoryAction(category.id))
        }
      />
    </>
  );
}
