"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Loader2,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Star,
  TriangleAlert,
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
import { cn, formatCurrency } from "@/lib/utils";

import {
  archiveProductAction,
  restoreProductAction,
  type ProductActionResult,
} from "./actions";
import { ArchiveProductDialog } from "./archive-product-dialog";
import { CategoryPicker } from "./category-picker";
import type { BrandOption, CategoryOption } from "./product-options";
import {
  discountPercent,
  NO_SORT,
  primaryImage,
  productSortLabels,
  productStatusLabels,
  productStatusTone,
  PRODUCT_SORTS,
  PRODUCT_STATUSES,
  type Product,
  type ProductPage,
  type ProductSort,
  type ProductStatus,
} from "./types";

export const ALL = "ALL";

export type ProductFilters = {
  search: string;
  status: ProductStatus | typeof ALL;
  brandId: string;
  categoryId: string;
  /** `NO_SORT` leaves the rows in the order the API returned them. */
  sort: ProductSort | typeof NO_SORT;
  /** 1-based, as it appears in the URL. */
  page: number;
};

export type ProductPermissions = {
  create: boolean;
  update: boolean;
  archive: boolean;
};

const SEARCH_DEBOUNCE_MS = 350;

const statusItems = [
  { label: "All statuses", value: ALL },
  ...PRODUCT_STATUSES.map((status) => ({
    label: productStatusLabels[status],
    value: status,
  })),
];

const sortItems = [
  { label: "Default order", value: NO_SORT },
  ...PRODUCT_SORTS.map((sort) => ({
    label: productSortLabels[sort],
    value: sort,
  })),
];

/**
 * The products table.
 *
 * Filtering and paging live in the URL and are served by
 * `GET /admin/products`, which supports every filter shown here — status,
 * brand, category, and a case-insensitive name-or-SKU search. Unlike
 * categories there is no hierarchy to assemble, so one page at a time is both
 * correct and cheaper.
 *
 * The list endpoint takes no ordering parameter, so the sort control does not
 * reorder the fetched page — that would read as a whole-table sort and
 * silently lie. Picking a sort makes the route fetch every matching row, order
 * it, and slice the page from that; default order stays one page request.
 *
 * There is still no stock column: the API has no stock field at all —
 * availability is carried by the OUT_OF_STOCK status instead.
 */
export function ProductsView({
  products,
  filters,
  incomplete,
  brands,
  categories,
  can,
}: {
  products: ProductPage;
  filters: ProductFilters;
  /** Set when a sort ran over an incomplete set — see `listAllProducts`. */
  incomplete?: boolean;
  brands: BrandOption[];
  categories: CategoryOption[];
  can: ProductPermissions;
}) {
  const router = useRouter();

  const [search, setSearch] = React.useState(filters.search);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();
  const [archiving, setArchiving] = React.useState<Product | null>(null);

  const hasFilters =
    filters.search !== "" ||
    filters.status !== ALL ||
    filters.brandId !== "" ||
    filters.categoryId !== "";

  const brandName = React.useMemo(
    () => new Map(brands.map((brand) => [brand.id, brand.name])),
    [brands],
  );
  const categoryPath = React.useMemo(
    () => new Map(categories.map((category) => [category.id, category.path])),
    [categories],
  );

  const buildHref = React.useCallback(
    (next: Partial<ProductFilters>) => {
      const merged = { ...filters, ...next };
      const params = new URLSearchParams();
      if (merged.search) params.set("q", merged.search);
      if (merged.status !== ALL) params.set("status", merged.status);
      if (merged.brandId) params.set("brand", merged.brandId);
      if (merged.categoryId) params.set("category", merged.categoryId);
      if (merged.sort !== NO_SORT) params.set("sort", merged.sort);
      if (merged.page > 1) params.set("page", String(merged.page));

      const queryString = params.toString();
      return queryString ? `/products?${queryString}` : "/products";
    },
    [filters],
  );

  // Debounce typing into a navigation; `replace` keeps keystrokes out of
  // history.
  React.useEffect(() => {
    if (search === filters.search) return;

    const timer = setTimeout(() => {
      router.replace(buildHref({ search, page: 1 }));
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search, filters.search, buildHref, router]);

  function runAction(product: Product, action: () => Promise<ProductActionResult>) {
    setPendingId(product.id);

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

  const rangeStart =
    products.totalElements === 0 ? 0 : products.page * products.size + 1;
  const rangeEnd = Math.min(
    products.page * products.size + products.content.length,
    products.totalElements,
  );

  // Archived brands and categories stay in the filters: products already
  // assigned to them still exist and must remain findable.
  const brandItems = [
    { label: "All brands", value: ALL },
    ...brands.map((brand) => ({
      label: brand.active ? brand.name : `${brand.name} (archived)`,
      value: brand.id,
    })),
  ];

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage the catalog.{" "}
            <span className="tabular-nums">
              {products.totalElements} {hasFilters ? "matching" : "total"}
            </span>
          </p>
        </div>
        {can.create ? (
          <Button className="w-full sm:w-auto" render={<Link href="/products/new" />}>
            <Plus /> Add product
          </Button>
        ) : null}
      </div>

      <Card className="min-w-0 py-0">
        <CardHeader className="border-b py-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or SKU…"
                  className="pr-8 pl-8"
                  aria-label="Search products"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>

              {/*
                Sorting is done by this app, not by the API — picking one
                trades the single page request for a walk of every matching
                row. Hence its own control rather than clickable column
                headers, which would invite a re-sort on every glance.
              */}
              <Select
                value={filters.sort}
                onValueChange={(value) =>
                  router.push(
                    buildHref({
                      sort: (value as ProductSort) ?? NO_SORT,
                      page: 1,
                    }),
                  )
                }
                items={sortItems}
              >
                <SelectTrigger className="w-full sm:w-56" aria-label="Sort products">
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
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  router.push(
                    buildHref({ status: (value as ProductStatus) ?? ALL, page: 1 }),
                  )
                }
                items={statusItems}
              >
                <SelectTrigger aria-label="Filter by status">
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

              <Select
                value={filters.brandId || ALL}
                onValueChange={(value) =>
                  router.push(
                    buildHref({
                      brandId: value === ALL ? "" : (value ?? ""),
                      page: 1,
                    }),
                  )
                }
                items={brandItems}
              >
                <SelectTrigger aria-label="Filter by brand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {brandItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/*
                One select per level rather than one flat list of full paths.
                The API filters on a single exact category id, so picking a
                base category matches only the products filed directly under
                it — the subcategory select is how you reach the rest.
              */}
              <CategoryPicker
                categories={categories}
                value={filters.categoryId}
                onValueChange={(categoryId) =>
                  router.push(buildHref({ categoryId, page: 1 }))
                }
                allLabel="All categories"
              />

              {hasFilters ? (
                <Button
                  variant="ghost"
                  render={
                    <Link
                      href={buildHref({
                        search: "",
                        status: ALL,
                        brandId: "",
                        categoryId: "",
                        page: 1,
                      })}
                    />
                  }
                >
                  <X /> Reset filters
                </Button>
              ) : null}
            </div>

            {incomplete ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  Sorting needs every matching product, and the API stopped
                  returning new rows before the set was complete — this order
                  is over the rows that did arrive. Reload, or clear the sort
                  to page through the order the API returns.
                </span>
              </div>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {products.content.length === 0 ? (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Package />
                </EmptyMedia>
                <EmptyTitle>
                  {hasFilters ? "No products match your filters" : "No products yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? "Try a different search term or clear the filters."
                    : "Get started by creating your first product."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {hasFilters ? (
                  <Button
                    variant="outline"
                    render={
                      <Link
                        href={buildHref({
                          search: "",
                          status: ALL,
                          brandId: "",
                          categoryId: "",
                          page: 1,
                        })}
                      />
                    }
                  >
                    Clear filters
                  </Button>
                ) : can.create ? (
                  <Button render={<Link href="/products/new" />}>
                    <Plus /> Add product
                  </Button>
                ) : null}
              </EmptyContent>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Product</TableHead>
                  <TableHead className="hidden lg:table-cell">Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.content.map((product) => {
                  const image = primaryImage(product);
                  const discount = discountPercent(product);
                  const tone = productStatusTone[product.status];

                  return (
                    <TableRow key={product.id}>
                      <TableCell className="pl-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                            {image ? (
                              /* Thumbnails come pre-sized from the API's
                                 bucket, so next/image has nothing to add. */
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={image.imageUrl}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <ImageOff className="size-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/products/${product.id}/edit`}
                                className="block max-w-[14rem] truncate font-medium hover:underline sm:max-w-xs"
                              >
                                {product.name}
                              </Link>
                              {product.featured ? (
                                <Star
                                  className="size-3.5 shrink-0 fill-primary text-primary"
                                  aria-label="Featured"
                                />
                              ) : null}
                              {pendingId === product.id ? (
                                <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                              ) : null}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              <span className="font-mono">{product.sku}</span>
                              {brandName.has(product.brandId)
                                ? ` · ${brandName.get(product.brandId)}`
                                : null}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden max-w-xs lg:table-cell">
                        <span className="line-clamp-1 text-muted-foreground">
                          {categoryPath.get(product.categoryId) ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">
                        {discount !== null && product.discountPrice !== null ? (
                          <>
                            <span className="font-medium">
                              {formatCurrency(product.discountPrice)}
                            </span>
                            <div className="text-xs text-muted-foreground">
                              <span className="line-through">
                                {formatCurrency(product.price)}
                              </span>{" "}
                              <span className="text-success">−{discount}%</span>
                            </div>
                          </>
                        ) : (
                          <span className="font-medium">
                            {formatCurrency(product.price)}
                          </span>
                        )}
                        <div className="text-xs text-muted-foreground">
                          per {product.unit.toLowerCase()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* Badge has no warning variant, so OUT_OF_STOCK
                            borrows secondary and paints the warning token. */}
                        <Badge
                          variant={tone === "warning" ? "secondary" : tone}
                          className={cn(
                            tone === "warning" &&
                              "border-warning/30 bg-warning/10 text-warning",
                          )}
                        >
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
                          <DropdownMenuContent align="end" className="w-44">
                            {can.update ? (
                              <DropdownMenuItem
                                render={<Link href={`/products/${product.id}/edit`} />}
                              >
                                <Pencil /> Edit
                              </DropdownMenuItem>
                            ) : null}
                            {product.status === "INACTIVE"
                              ? can.update && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() =>
                                        runAction(product, () =>
                                          restoreProductAction(product.id),
                                        )
                                      }
                                    >
                                      <RotateCcw /> Restore
                                    </DropdownMenuItem>
                                  </>
                                )
                              : can.archive && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() => setArchiving(product)}
                                    >
                                      <Archive /> Archive
                                    </DropdownMenuItem>
                                  </>
                                )}
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

        {products.totalElements > 0 ? (
          <CardFooter className="flex flex-col gap-3 border-t py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm tabular-nums text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {products.totalElements}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={products.first}
                render={
                  products.first ? (
                    <span />
                  ) : (
                    <Link href={buildHref({ page: filters.page - 1 })} />
                  )
                }
              >
                <ChevronLeft /> <span className="hidden sm:inline">Previous</span>
              </Button>
              <span className="px-2 text-sm tabular-nums text-muted-foreground">
                {products.page + 1} / {Math.max(1, products.totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={products.last}
                render={
                  products.last ? (
                    <span />
                  ) : (
                    <Link href={buildHref({ page: filters.page + 1 })} />
                  )
                }
              >
                <span className="hidden sm:inline">Next</span> <ChevronRight />
              </Button>
            </div>
          </CardFooter>
        ) : null}
      </Card>

      <ArchiveProductDialog
        open={archiving !== null}
        onOpenChange={(open) => {
          if (!open) setArchiving(null);
        }}
        product={archiving}
        onConfirm={(product) =>
          runAction(product, () => archiveProductAction(product.id))
        }
      />
    </>
  );
}
