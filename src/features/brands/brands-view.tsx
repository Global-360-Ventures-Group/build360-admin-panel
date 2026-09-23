"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Star,
  StarOff,
  Tags,
  Archive,
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
import { formatDate, getInitials } from "@/lib/utils";

import {
  archiveBrandAction,
  restoreBrandAction,
  setBrandTopAction,
  type BrandActionResult,
} from "./actions";
import { ArchiveBrandDialog } from "./archive-brand-dialog";
import { BrandFormDialog } from "./brand-form-dialog";
import {
  brandSortLabels,
  BRAND_SORTS,
  NO_SORT,
  type Brand,
  type BrandPage,
  type BrandSort,
} from "./types";

export type BrandFilters = {
  search: string;
  /**
   * Archived brands are left out unless this is on. They are the exception —
   * an archived brand is off the storefront — so the list opens on the live
   * catalog and the archive is one click away rather than mixed in.
   */
  includeArchived: boolean;
  /** `NO_SORT` leaves the rows in the order the API returned them. */
  sort: BrandSort | typeof NO_SORT;
  /** 1-based, as it appears in the URL. */
  page: number;
};

export type BrandPermissions = {
  create: boolean;
  update: boolean;
  archive: boolean;
};

const sortItems = [
  { label: "Default order", value: NO_SORT },
  ...BRAND_SORTS.map((sort) => ({
    label: brandSortLabels[sort],
    value: sort,
  })),
];

/** How long to wait after typing before navigating. */
const SEARCH_DEBOUNCE_MS = 350;

/**
 * The brands table.
 *
 * Filtering and paging live in the URL and are served by
 * `GET /admin/brands`, rather than being applied to an in-memory array. That
 * is forced by the API: it returns one page at a time (max 50), so the client
 * never holds the full list and could not filter it correctly anyway.
 *
 * The list endpoint accepts only `status`, `search`, `page` and `size` — no
 * ordering parameter. So the sort control does not reorder the current page,
 * which would read as a whole-table sort and silently lie; picking a sort
 * makes the route fetch every matching row, order it, and slice the page from
 * that. Default order stays a single page request.
 */
export function BrandsView({
  brands,
  filters,
  incomplete,
  can,
}: {
  brands: BrandPage;
  filters: BrandFilters;
  /** Set when a sort ran over an incomplete set — see `listAllBrands`. */
  incomplete?: boolean;
  can: BrandPermissions;
}) {
  const router = useRouter();

  const [search, setSearch] = React.useState(filters.search);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Brand | null>(null);
  const [archiving, setArchiving] = React.useState<Brand | null>(null);

  const hasFilters = filters.search !== "" || filters.includeArchived;

  const buildHref = React.useCallback(
    (next: Partial<BrandFilters>) => {
      const merged = { ...filters, ...next };
      const params = new URLSearchParams();
      if (merged.search) params.set("q", merged.search);
      if (merged.includeArchived) params.set("archived", "1");
      if (merged.sort !== NO_SORT) params.set("sort", merged.sort);
      if (merged.page > 1) params.set("page", String(merged.page));

      const queryString = params.toString();
      return queryString ? `/brands?${queryString}` : "/brands";
    },
    [filters],
  );

  // Debounce typing into a navigation. `replace` keeps every keystroke out of
  // the history stack.
  React.useEffect(() => {
    if (search === filters.search) return;

    const timer = setTimeout(() => {
      router.replace(buildHref({ search, page: 1 }));
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search, filters.search, buildHref, router]);

  /**
   * Run a row mutation and report the outcome.
   *
   * The server action calls `revalidatePath`, so the table re-renders from the
   * API rather than from optimistic local state -- which matters here because
   * archiving can move a row out of the current filter entirely.
   */
  function runAction(brand: Brand, action: () => Promise<BrandActionResult>) {
    setPendingId(brand.id);

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
    brands.totalElements === 0 ? 0 : brands.page * brands.size + 1;
  const rangeEnd = Math.min(
    brands.page * brands.size + brands.content.length,
    brands.totalElements,
  );

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Brands</h1>
          <p className="text-sm text-muted-foreground">
            Manage the brands available in your catalog.{" "}
            <span className="tabular-nums">
              {brands.totalElements} {hasFilters ? "matching" : "total"}
            </span>
          </p>
        </div>
        {can.create ? (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="w-full sm:w-auto"
          >
            <Plus /> Add brand
          </Button>
        ) : null}
      </div>

      <Card className="min-w-0 py-0">
        <CardHeader className="border-b py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or description…"
                className="pr-8 pl-8"
                aria-label="Search brands"
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
            <div className="flex items-center gap-2">
              <div className="flex h-8 shrink-0 items-center gap-2">
                <Checkbox
                  id="brands-include-archived"
                  checked={filters.includeArchived}
                  onCheckedChange={(checked) =>
                    router.push(
                      buildHref({
                        includeArchived: checked === true,
                        page: 1,
                      }),
                    )
                  }
                />
                <label
                  htmlFor="brands-include-archived"
                  className="cursor-pointer text-sm font-normal whitespace-nowrap text-muted-foreground select-none"
                >
                  Include archived
                </label>
              </div>
              <Select
                value={filters.sort}
                onValueChange={(value) =>
                  router.push(
                    buildHref({
                      sort: (value as BrandSort) ?? NO_SORT,
                      page: 1,
                    }),
                  )
                }
                items={sortItems}
              >
                <SelectTrigger
                  className="w-full md:w-52"
                  aria-label="Sort brands"
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
              {hasFilters ? (
                <Button
                  variant="ghost"
                  render={
                    <Link
                      href={buildHref({
                        search: "",
                        includeArchived: false,
                        page: 1,
                      })}
                    />
                  }
                >
                  <X /> Reset
                </Button>
              ) : null}
            </div>
          </div>

          {incomplete ? (
            <div
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                Sorting needs every matching brand, and the API stopped
                returning new rows before the set was complete — this order is
                over the rows that did arrive. Reload, or clear the sort to
                page through the order the API returns.
              </span>
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="p-0">
          {brands.content.length === 0 ? (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Tags />
                </EmptyMedia>
                <EmptyTitle>
                  {hasFilters || !filters.includeArchived
                    ? "No brands match your filters"
                    : "No brands yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {filters.search !== ""
                    ? "Try a different search term or clear the filters."
                    : filters.includeArchived
                      ? "Get started by creating your first brand."
                      : "Every brand is archived. Tick Include archived to see them, or create a new one."}
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
                          includeArchived: false,
                          page: 1,
                        })}
                      />
                    }
                  >
                    Clear filters
                  </Button>
                ) : can.create ? (
                  <Button
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus /> Add brand
                  </Button>
                ) : null}
              </EmptyContent>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Brand</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Description
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead className="w-12 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.content.map((brand) => (
                  <TableRow key={brand.id} data-pending={pendingId === brand.id}>
                    <TableCell className="pl-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                          {brand.logoUrl ? (
                            <Image
                              src={brand.logoUrl}
                              alt=""
                              width={36}
                              height={36}
                              className="size-full object-contain"
                              unoptimized
                            />
                          ) : (
                            <span className="text-xs font-medium text-muted-foreground">
                              {getInitials(brand.name)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="block max-w-[14rem] truncate font-medium sm:max-w-xs">
                              {brand.name}
                            </span>
                            {brand.isTop ? (
                              <Star
                                className="size-3.5 shrink-0 fill-primary text-primary"
                                aria-label="Top brand"
                              />
                            ) : null}
                            {pendingId === brand.id ? (
                              <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                            ) : null}
                          </div>
                          <div className="truncate font-mono text-xs text-muted-foreground">
                            /{brand.slug}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden max-w-xs md:table-cell">
                      <span className="line-clamp-1 text-muted-foreground">
                        {brand.description ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          brand.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {brand.status === "ACTIVE" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {brand.createdAt ? formatDate(brand.createdAt) : "—"}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              aria-label={`Actions for ${brand.name}`}
                            />
                          }
                        >
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {can.update ? (
                            <>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditing(brand);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  runAction(brand, () =>
                                    setBrandTopAction(brand.id, !brand.isTop),
                                  )
                                }
                              >
                                {brand.isTop ? <StarOff /> : <Star />}
                                {brand.isTop ? "Remove from top" : "Mark as top"}
                              </DropdownMenuItem>
                            </>
                          ) : null}
                          {brand.status === "ACTIVE" ? (
                            can.archive ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setArchiving(brand)}
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
                                  runAction(brand, () => restoreBrandAction(brand.id))
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

        {brands.totalElements > 0 ? (
          <CardFooter className="flex flex-col gap-3 border-t py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm tabular-nums text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {brands.totalElements}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={brands.first}
                render={
                  brands.first ? (
                    <span />
                  ) : (
                    <Link href={buildHref({ page: filters.page - 1 })} />
                  )
                }
              >
                <ChevronLeft /> <span className="hidden sm:inline">Previous</span>
              </Button>
              <span className="px-2 text-sm tabular-nums text-muted-foreground">
                {brands.page + 1} / {Math.max(1, brands.totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={brands.last}
                render={
                  brands.last ? (
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

      <BrandFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        brand={editing}
      />
      <ArchiveBrandDialog
        open={archiving !== null}
        onOpenChange={(open) => {
          if (!open) setArchiving(null);
        }}
        brand={archiving}
        onConfirm={(brand) =>
          runAction(brand, () => archiveBrandAction(brand.id))
        }
      />
    </>
  );
}
