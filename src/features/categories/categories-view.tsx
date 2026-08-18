"use client";

import * as React from "react";
import {
  ChevronRight,
  CornerDownRight,
  FolderTree,
  ListTree,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
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
import { cn, formatDate, newId } from "@/lib/utils";

import { CategoryFormDialog } from "./category-form-dialog";
import { DeleteCategoryDialog } from "./delete-category-dialog";
import {
  buildTree,
  flattenTree,
  getAncestorIds,
  getDescendantIds,
  type Category,
  type CategoryFormValues,
  type CategoryRow,
  type CategoryStatus,
} from "./types";

type StatusFilter = "all" | CategoryStatus;

const statusItems = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

/** Simulated network latency so loading states are visible. Remove when wiring a real API. */
const fakeRequest = () => new Promise<void>((r) => setTimeout(r, 400));

export function CategoriesView({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const [categories, setCategories] =
    React.useState<Category[]>(initialCategories);

  // filters
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");

  // tree state — top-level categories start expanded
  const [expanded, setExpanded] = React.useState<Set<string>>(
    () => new Set(initialCategories.filter((c) => !c.parentId).map((c) => c.id)),
  );

  // dialogs
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [defaultParentId, setDefaultParentId] = React.useState<string | null>(
    null,
  );
  const [deleting, setDeleting] = React.useState<CategoryRow | null>(null);

  const deferredQuery = React.useDeferredValue(query.trim().toLowerCase());
  const hasFilters = query !== "" || status !== "all";

  const tree = React.useMemo(() => buildTree(categories), [categories]);

  /**
   * While filtering, a node is visible when it matches, or when one of its
   * descendants matches (so the path to a match is never hidden).
   */
  const visibleIds = React.useMemo(() => {
    if (!hasFilters) return undefined;

    const matches = categories.filter((c) => {
      const matchesQuery =
        !deferredQuery ||
        c.name.toLowerCase().includes(deferredQuery) ||
        c.slug.includes(deferredQuery);
      const matchesStatus = status === "all" || c.status === status;
      return matchesQuery && matchesStatus;
    });

    const visible = new Set<string>();
    for (const m of matches) {
      visible.add(m.id);
      for (const aid of getAncestorIds(categories, m.id)) visible.add(aid);
    }
    return visible;
  }, [categories, deferredQuery, status, hasFilters]);

  // While filtering every branch is forced open so matches are always reachable.
  const effectiveExpanded = React.useMemo(
    () => (hasFilters ? new Set(categories.map((c) => c.id)) : expanded),
    [hasFilters, categories, expanded],
  );

  const rows = React.useMemo(
    () => flattenTree(tree, effectiveExpanded, visibleIds),
    [tree, effectiveExpanded, visibleIds],
  );

  const matchCount = visibleIds
    ? categories.filter((c) => visibleIds.has(c.id)).length
    : categories.length;
  const topLevelCount = categories.filter((c) => !c.parentId).length;
  const activeCount = categories.filter((c) => c.status === "active").length;

  // ---- tree helpers --------------------------------------------------------

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allExpanded =
    categories.length > 0 &&
    categories.every((c) => expanded.has(c.id) || !hasChildren(c.id));

  function hasChildren(id: string) {
    return categories.some((c) => c.parentId === id);
  }

  function toggleAll() {
    setExpanded(allExpanded ? new Set() : new Set(categories.map((c) => c.id)));
  }

  // ---- actions -------------------------------------------------------------

  function openCreate(parentId: string | null = null) {
    setEditing(null);
    setDefaultParentId(parentId);
    setFormOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setDefaultParentId(null);
    setFormOpen(true);
  }

  async function handleSubmit(values: CategoryFormValues) {
    await fakeRequest();
    if (editing) {
      setCategories((list) =>
        list.map((c) =>
          c.id === editing.id
            ? {
                ...c,
                ...values,
                description: values.description || undefined,
                imageUrl: values.imageUrl || undefined,
              }
            : c,
        ),
      );
      toast.success("Category updated", { description: values.name });
    } else {
      const category: Category = {
        id: newId("cat"),
        name: values.name,
        slug: values.slug,
        parentId: values.parentId,
        description: values.description || undefined,
        imageUrl: values.imageUrl || undefined,
        status: values.status,
        productCount: 0,
        sortOrder: values.sortOrder,
        createdAt: new Date().toISOString(),
      };
      setCategories((list) => [...list, category]);
      // Reveal the new row by opening every ancestor.
      if (category.parentId) {
        const toOpen = [
          ...getAncestorIds([...categories, category], category.id),
          category.parentId,
        ];
        setExpanded((prev) => new Set([...prev, ...toOpen]));
      }
      toast.success("Category created", { description: values.name });
    }
  }

  async function handleDelete(category: CategoryRow) {
    await fakeRequest();
    const doomed = new Set([
      category.id,
      ...getDescendantIds(categories, category.id),
    ]);
    setCategories((list) => list.filter((c) => !doomed.has(c.id)));
    toast.success(
      doomed.size > 1
        ? `Deleted ${doomed.size} categories`
        : "Category deleted",
      { description: category.name },
    );
  }

  /** Toggling a parent cascades to all of its descendants. */
  async function toggleStatus(category: CategoryRow) {
    const next: CategoryStatus =
      category.status === "active" ? "inactive" : "active";
    const affected = new Set([
      category.id,
      ...getDescendantIds(categories, category.id),
    ]);
    setCategories((list) =>
      list.map((c) => (affected.has(c.id) ? { ...c, status: next } : c)),
    );
    toast.success(
      next === "active" ? "Category activated" : "Category deactivated",
      {
        description:
          affected.size > 1
            ? `${category.name} and ${affected.size - 1} subcategor${
                affected.size - 1 === 1 ? "y" : "ies"
              }`
            : category.name,
      },
    );
  }

  function resetFilters() {
    setQuery("");
    setStatus("all");
  }

  const deletingProductCount = React.useMemo(() => {
    if (!deleting) return 0;
    const affected = new Set([
      deleting.id,
      ...getDescendantIds(categories, deleting.id),
    ]);
    return categories
      .filter((c) => affected.has(c.id))
      .reduce((sum, c) => sum + c.productCount, 0);
  }, [deleting, categories]);

  // ---- render --------------------------------------------------------------

  return (
    <>
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="text-sm text-muted-foreground">
            Organize your catalog into a category tree.{" "}
            <span className="tabular-nums">
              {categories.length} total · {topLevelCount} top level ·{" "}
              {activeCount} active
            </span>
          </p>
        </div>
        <Button onClick={() => openCreate(null)} className="w-full sm:w-auto">
          <Plus /> Add category
        </Button>
      </div>

      <Card className="min-w-0 py-0">
        {/* Toolbar */}
        <CardHeader className="border-b py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or slug…"
                className="pr-8 pl-8"
                aria-label="Search categories"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
              <Select
                value={status}
                onValueChange={(v) => setStatus((v as StatusFilter) ?? "all")}
                items={statusItems}
              >
                <SelectTrigger
                  className="w-full md:w-40"
                  aria-label="Filter by status"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={toggleAll}
                disabled={hasFilters}
                title={
                  hasFilters
                    ? "All branches are open while filtering"
                    : undefined
                }
              >
                <ListTree />
                <span className="hidden sm:inline">
                  {allExpanded ? "Collapse all" : "Expand all"}
                </span>
              </Button>
              {hasFilters && (
                <Button
                  variant="ghost"
                  onClick={resetFilters}
                  className="col-span-2 md:col-span-1"
                >
                  <X /> Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Tree table / empty */}
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
                    : "Create your first category to start organizing products."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {hasFilters ? (
                  <Button variant="outline" onClick={resetFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Button onClick={() => openCreate(null)}>
                    <Plus /> Add category
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Category</TableHead>
                  <TableHead className="hidden md:table-cell">Slug</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">
                    Products
                  </TableHead>
                  <TableHead className="hidden text-right lg:table-cell">
                    Order
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Created</TableHead>
                  <TableHead className="w-12 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const isOpen = effectiveExpanded.has(row.id);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="pl-4">
                        <div
                          className="flex min-w-0 items-center gap-1"
                          style={{
                            paddingInlineStart: `${row.depth * 1.25}rem`,
                          }}
                        >
                          {row.hasChildren ? (
                            <button
                              type="button"
                              onClick={() => toggle(row.id)}
                              disabled={hasFilters}
                              className="-ml-1 rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                              aria-expanded={isOpen}
                              aria-label={
                                isOpen
                                  ? `Collapse ${row.name}`
                                  : `Expand ${row.name}`
                              }
                            >
                              <ChevronRight
                                className={cn(
                                  "size-4 transition-transform duration-200",
                                  isOpen && "rotate-90",
                                )}
                              />
                            </button>
                          ) : row.depth > 0 ? (
                            <CornerDownRight className="size-3.5 shrink-0 text-muted-foreground/50" />
                          ) : (
                            <span className="inline-block size-6 shrink-0" />
                          )}
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className={cn(
                              "truncate text-left hover:underline",
                              row.depth === 0 ? "font-medium" : "font-normal",
                            )}
                          >
                            {row.name}
                          </button>
                          {row.hasChildren && (
                            <Badge
                              variant="outline"
                              className="ml-1 shrink-0 tabular-nums"
                            >
                              {row.descendantCount}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                        /{row.slug}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">
                        {row.productCount || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">
                        {row.sortOrder}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.status === "active" ? "default" : "secondary"
                          }
                          className="capitalize"
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground xl:table-cell">
                        {formatDate(row.createdAt)}
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
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onClick={() => openEdit(row)}>
                              <Pencil /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openCreate(row.id)}
                            >
                              <Plus /> Add subcategory
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => void toggleStatus(row)}
                            >
                              <Power />
                              {row.status === "active"
                                ? "Deactivate"
                                : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleting(row)}
                            >
                              <Trash2 /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {rows.length > 0 && (
          <CardFooter className="border-t py-3">
            <p className="text-sm text-muted-foreground tabular-nums">
              {hasFilters
                ? `${matchCount} of ${categories.length} categories match`
                : `${categories.length} categories · ${rows.length} rows shown`}
            </p>
          </CardFooter>
        )}
      </Card>

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editing}
        categories={categories}
        defaultParentId={defaultParentId}
        onSubmit={handleSubmit}
      />
      <DeleteCategoryDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        category={deleting}
        affectedProductCount={deletingProductCount}
        onConfirm={handleDelete}
      />
    </>
  );
}
