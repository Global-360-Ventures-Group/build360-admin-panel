"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { cn, formatCurrency } from "@/lib/utils";

import { mockCategories } from "@/features/categories/data";
import { getPathLabel } from "@/features/categories/types";

import { mockBrandRefs } from "./data";
import { DeleteProductDialog } from "./delete-product-dialog";
import { useProducts } from "./products-store";
import {
  NONE,
  getDiscountPercent,
  getStockLevel,
  productStatusLabels,
  productStatusVariant,
  stockLevelLabels,
  type Product,
  type ProductStatus,
  type StockLevel,
} from "./types";

type StatusFilter = "all" | ProductStatus;
type StockFilter = "all" | StockLevel;
type SortKey =
  | "newest"
  | "oldest"
  | "name-asc"
  | "price-asc"
  | "price-desc"
  | "stock-asc";

const PAGE_SIZE = 10;

const statusItems = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

const stockItems = [
  { value: "all", label: "All stock" },
  { value: "in", label: "In stock" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
];

const sortItems = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "price-desc", label: "Price high → low" },
  { value: "price-asc", label: "Price low → high" },
  { value: "stock-asc", label: "Stock low → high" },
];

const stockBadgeClass: Record<StockLevel, string> = {
  in: "text-success border-success/30 bg-success/10",
  low: "text-warning border-warning/30 bg-warning/10",
  out: "text-destructive border-destructive/30 bg-destructive/10",
};

export function ProductsView() {
  const { products, remove, setStatus, toggleFeatured } = useProducts();

  // filters
  const [query, setQuery] = React.useState("");
  const [status, setStatusFilter] = React.useState<StatusFilter>("all");
  const [brandId, setBrandId] = React.useState<string>("all");
  const [categoryId, setCategoryId] = React.useState<string>("all");
  const [stock, setStock] = React.useState<StockFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("newest");
  const [page, setPage] = React.useState(1);

  // selection + delete
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [deleteIds, setDeleteIds] = React.useState<string[] | null>(null);

  const deferredQuery = React.useDeferredValue(query.trim().toLowerCase());
  const hasFilters =
    query !== "" ||
    status !== "all" ||
    brandId !== "all" ||
    categoryId !== "all" ||
    stock !== "all";

  const brandById = React.useMemo(
    () => new Map(mockBrandRefs.map((b) => [b.id, b])),
    [],
  );
  const categoryById = React.useMemo(
    () => new Map(mockCategories.map((c) => [c.id, c])),
    [],
  );

  const brandItems = React.useMemo(
    () => [
      { value: "all", label: "All brands" },
      { value: NONE, label: "No brand" },
      ...[...mockBrandRefs]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((b) => ({ value: b.id, label: b.name })),
    ],
    [],
  );

  const categoryItems = React.useMemo(
    () => [
      { value: "all", label: "All categories" },
      { value: NONE, label: "Uncategorized" },
      ...mockCategories
        .map((c) => ({
          value: c.id,
          label: getPathLabel(mockCategories, c.id),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ],
    [],
  );

  const filtered = React.useMemo(() => {
    let list = products;

    if (deferredQuery) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(deferredQuery) ||
          p.sku.toLowerCase().includes(deferredQuery) ||
          p.slug.includes(deferredQuery),
      );
    }
    if (status !== "all") list = list.filter((p) => p.status === status);
    if (brandId !== "all") {
      list = list.filter((p) =>
        brandId === NONE ? p.brandId === null : p.brandId === brandId,
      );
    }
    if (categoryId !== "all") {
      list = list.filter((p) =>
        categoryId === NONE
          ? p.categoryId === null
          : p.categoryId === categoryId,
      );
    }
    if (stock !== "all") list = list.filter((p) => getStockLevel(p) === stock);

    const sorted = [...list];
    switch (sort) {
      case "newest":
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case "oldest":
        sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        break;
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "price-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "stock-asc":
        sorted.sort((a, b) => a.stock - b.stock);
        break;
    }
    return sorted;
  }, [products, deferredQuery, status, brandId, categoryId, stock, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

  // Selection only ever refers to rows the user can currently see.
  const selectedOnPage = pageItems.filter((p) => selected.has(p.id));
  const allOnPageSelected =
    pageItems.length > 0 && selectedOnPage.length === pageItems.length;
  const someOnPageSelected =
    selectedOnPage.length > 0 && !allOnPageSelected;

  const lowStockCount = products.filter(
    (p) => p.status === "active" && getStockLevel(p) !== "in",
  ).length;
  const activeCount = products.filter((p) => p.status === "active").length;

  // ---- selection -----------------------------------------------------------

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of pageItems) {
        if (checked) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  }

  const clearSelection = React.useCallback(() => setSelected(new Set()), []);

  // ---- actions -------------------------------------------------------------

  async function bulkStatus(next: ProductStatus) {
    const ids = [...selected];
    if (ids.length === 0) return;
    await setStatus(ids, next);
    clearSelection();
    toast.success(
      `${ids.length} product${ids.length === 1 ? "" : "s"} marked ${productStatusLabels[next].toLowerCase()}`,
    );
  }

  async function confirmDelete() {
    const ids = deleteIds ?? [];
    if (ids.length === 0) return;
    await remove(ids);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
    toast.success(
      ids.length === 1
        ? "Product deleted"
        : `${ids.length} products deleted`,
    );
    setDeleteIds(null);
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setBrandId("all");
    setCategoryId("all");
    setStock("all");
    setPage(1);
  }

  const onFilterChange = () => {
    setPage(1);
    clearSelection();
  };

  const deleteLabel =
    deleteIds?.length === 1
      ? products.find((p) => p.id === deleteIds[0])?.name
      : undefined;

  // ---- render --------------------------------------------------------------

  return (
    <>
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage your catalog.{" "}
            <span className="tabular-nums">
              {products.length} total · {activeCount} active
            </span>
            {lowStockCount > 0 && (
              <>
                {" · "}
                <span className="tabular-nums text-warning">
                  {lowStockCount} need restocking
                </span>
              </>
            )}
          </p>
        </div>
        <Button className="w-full sm:w-auto" render={<Link href="/products/new" />}>
          <Plus /> Add product
        </Button>
      </div>

      <Card className="min-w-0 py-0">
        {/* Toolbar */}
        <CardHeader className="border-b py-4">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  onFilterChange();
                }}
                placeholder="Search by name, SKU or slug…"
                className="pr-8 pl-8"
                aria-label="Search products"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    onFilterChange();
                  }}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatusFilter((v as StatusFilter) ?? "all");
                  onFilterChange();
                }}
                items={statusItems}
              >
                <SelectTrigger className="w-full" aria-label="Filter by status">
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

              <Select
                value={brandId}
                onValueChange={(v) => {
                  setBrandId(String(v ?? "all"));
                  onFilterChange();
                }}
                items={brandItems}
              >
                <SelectTrigger className="w-full" aria-label="Filter by brand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {brandItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={categoryId}
                onValueChange={(v) => {
                  setCategoryId(String(v ?? "all"));
                  onFilterChange();
                }}
                items={categoryItems}
              >
                <SelectTrigger
                  className="w-full"
                  aria-label="Filter by category"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {categoryItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={stock}
                onValueChange={(v) => {
                  setStock((v as StockFilter) ?? "all");
                  onFilterChange();
                }}
                items={stockItems}
              >
                <SelectTrigger className="w-full" aria-label="Filter by stock">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stockItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={sort}
                onValueChange={(v) => setSort((v as SortKey) ?? "newest")}
                items={sortItems}
              >
                <SelectTrigger className="w-full" aria-label="Sort products">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasFilters && (
              <div>
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <X /> Reset filters
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex flex-col gap-2 border-b bg-accent/50 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium tabular-nums">
              {selected.size} selected
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void bulkStatus("active")}
              >
                <CheckCircle2 /> Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void bulkStatus("archived")}
              >
                <Archive /> Archive
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteIds([...selected])}
              >
                <Trash2 /> Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X /> Clear
              </Button>
            </div>
          </div>
        )}

        {/* Table / empty */}
        <CardContent className="p-0">
          {pageItems.length === 0 ? (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Package />
                </EmptyMedia>
                <EmptyTitle>
                  {hasFilters
                    ? "No products match your filters"
                    : "No products yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? "Try a different search term or clear the filters."
                    : "Add your first product to start selling."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {hasFilters ? (
                  <Button variant="outline" onClick={resetFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Button render={<Link href="/products/new" />}>
                    <Plus /> Add product
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 pl-4">
                    <Checkbox
                      checked={allOnPageSelected}
                      indeterminate={someOnPageSelected}
                      onCheckedChange={(checked) => togglePage(checked)}
                      aria-label="Select all rows on this page"
                    />
                  </TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden lg:table-cell">Brand</TableHead>
                  <TableHead className="hidden xl:table-cell">
                    Category
                  </TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">
                    Stock
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="w-12 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    selected={selected.has(product.id)}
                    onToggle={() => toggleRow(product.id)}
                    brandName={
                      product.brandId
                        ? brandById.get(product.brandId)?.name
                        : undefined
                    }
                    categoryLabel={
                      product.categoryId && categoryById.has(product.categoryId)
                        ? getPathLabel(mockCategories, product.categoryId)
                        : undefined
                    }
                    onToggleFeatured={() => {
                      toggleFeatured(product.id);
                      toast.success(
                        product.featured
                          ? "Removed from featured"
                          : "Marked as featured",
                        { description: product.name },
                      );
                    }}
                    onDelete={() => setDeleteIds([product.id])}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {filtered.length > 0 && (
          <CardFooter className="flex flex-col gap-3 border-t py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground tabular-nums">
              Showing {rangeStart}–{rangeEnd} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <span className="px-2 text-sm text-muted-foreground tabular-nums">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      <DeleteProductDialog
        open={deleteIds !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteIds(null);
        }}
        count={deleteIds?.length ?? 0}
        label={deleteLabel}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function ProductRow({
  product,
  selected,
  onToggle,
  brandName,
  categoryLabel,
  onToggleFeatured,
  onDelete,
}: {
  product: Product;
  selected: boolean;
  onToggle: () => void;
  brandName?: string;
  categoryLabel?: string;
  onToggleFeatured: () => void;
  onDelete: () => void;
}) {
  const level = getStockLevel(product);
  const discount = getDiscountPercent(product);
  const editHref = `/products/${product.id}/edit`;

  return (
    <TableRow data-state={selected ? "selected" : undefined}>
      <TableCell className="pl-4">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          aria-label={`Select ${product.name}`}
        />
      </TableCell>

      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative size-10 shrink-0 overflow-hidden rounded-md border bg-muted/40">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt=""
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <ImageOff className="size-4" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                href={editHref}
                className="max-w-[16rem] truncate font-medium hover:underline sm:max-w-xs"
              >
                {product.name}
              </Link>
              {product.featured && (
                <Star
                  className="size-3.5 shrink-0 fill-primary text-primary"
                  aria-label="Featured"
                />
              )}
            </div>
            <div className="truncate font-mono text-xs text-muted-foreground">
              {product.sku}
            </div>
          </div>
        </div>
      </TableCell>

      <TableCell className="hidden max-w-[10rem] truncate lg:table-cell">
        {brandName ?? <span className="text-muted-foreground">—</span>}
      </TableCell>

      <TableCell className="hidden max-w-[14rem] truncate text-muted-foreground xl:table-cell">
        {categoryLabel ?? "—"}
      </TableCell>

      <TableCell className="text-right">
        <div className="font-medium tabular-nums">
          {formatCurrency(product.price)}
        </div>
        {discount !== null && (
          <div className="text-xs text-muted-foreground tabular-nums">
            <span className="line-through">
              {formatCurrency(product.compareAtPrice!)}
            </span>{" "}
            <span className="text-success">−{discount}%</span>
          </div>
        )}
      </TableCell>

      <TableCell className="hidden text-right sm:table-cell">
        <div className="tabular-nums">
          {product.stock} <span className="text-muted-foreground">{product.unit}</span>
        </div>
        <Badge
          variant="outline"
          className={cn("mt-0.5 text-[10px]", stockBadgeClass[level])}
        >
          {stockLevelLabels[level]}
        </Badge>
      </TableCell>

      <TableCell className="hidden md:table-cell">
        <Badge variant={productStatusVariant[product.status]}>
          {productStatusLabels[product.status]}
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
                aria-label={`Actions for ${product.name}`}
              />
            }
          >
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem render={<Link href={editHref} />}>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleFeatured}>
              <Star />
              {product.featured ? "Unfeature" : "Feature"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
