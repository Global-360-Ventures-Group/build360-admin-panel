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
  flattenTree,
  getAncestorIds,
  type Category,
  type CategoryRow,
  type CategoryStatus,
} from "./types";

type StatusFilter = "ALL" | CategoryStatus;

export type CategoryPermissions = {
  create: boolean;
  update: boolean;
  archive: boolean;
};

const statusItems = [
  { label: "All statuses", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
];

/**
 * The categories tree.
 *
 * Unlike brands, this screen receives the **whole** set rather than one page,
 * and filters it in the browser. That is a property of the data, not
 * inconsistency: a third-level row is meaningless without its ancestors, and
 * a search has to be able to match a descendant and still show the path down
 * to it. Neither is possible from a single page. Category trees are small and
 * bounded by design — `listAllCategories` pages through them.
 */
export function CategoriesView({
  categories,
  truncated,
  can,
}: {
  categories: Category[];
  truncated: boolean;
  can: CategoryPermissions;
}) {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("ALL");
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [defaultParentId, setDefaultParentId] = React.useState<string | null>(null);
  const [archiving, setArchiving] = React.useState<CategoryRow | null>(null);

  const deferredQuery = React.useDeferredValue(query.trim().toLowerCase());
  const hasFilters = query !== "" || status !== "ALL";

  const tree = React.useMemo(() => buildTree(categories), [categories]);

  /**
   * Which rows survive the filters.
   *
   * A row is kept when it matches, and every ancestor of a match is kept too —
   * otherwise a matching subcategory would have nothing to hang from and the
   * tree would render it as a stray root.
   */
  const visibleIds = React.useMemo(() => {
    if (!hasFilters) return undefined;

    const matches = categories.filter((category) => {
      const matchesQuery =
        !deferredQuery ||
        category.name.toLowerCase().includes(deferredQuery) ||
        category.slug.includes(deferredQuery) ||
        category.fullPath.toLowerCase().includes(deferredQuery);
      const matchesStatus = status === "ALL" || category.status === status;

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
  }, [categories, deferredQuery, status, hasFilters]);

  // While filtering, everything is expanded so matches deep in the tree are
  // actually on screen.
  const effectiveExpanded = React.useMemo(
    () => (hasFilters ? new Set(categories.map((c) => c.id)) : expanded),
    [hasFilters, categories, expanded],
  );

  const rows = React.useMemo(
    () => flattenTree(tree, effectiveExpanded, visibleIds),
    [tree, effectiveExpanded, visibleIds],
  );

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
            Only the first 500 categories were loaded, so this tree is
            incomplete. Narrow the catalog or raise the page limit in
            <span className="font-mono"> listAllCategories</span>.
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
              <Select
                value={status}
                onValueChange={(value) => setStatus((value as StatusFilter) ?? "ALL")}
                items={statusItems}
              >
                <SelectTrigger className="w-full md:w-40" aria-label="Filter by status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusItems.map((item) => (
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
                disabled={hasFilters || parentIds.length === 0}
                title={
                  hasFilters ? "Everything is expanded while filtering" : undefined
                }
              >
                {expanded.size === 0 ? "Expand all" : "Collapse all"}
              </Button>
              {hasFilters ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setQuery("");
                    setStatus("ALL");
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
                  {hasFilters
                    ? "No categories match your filters"
                    : "No categories yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? "Try a different search term or clear the filters."
                    : "Get started by creating your first category."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {hasFilters ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuery("");
                      setStatus("ALL");
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
                {rows.map((row) => (
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
