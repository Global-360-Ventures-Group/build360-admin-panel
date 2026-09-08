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
import { formatDate, getInitials } from "@/lib/utils";

import {
  archiveBrandAction,
  restoreBrandAction,
  setBrandTopAction,
  type BrandActionResult,
} from "./actions";
import { ArchiveBrandDialog } from "./archive-brand-dialog";
import { BrandFormDialog } from "./brand-form-dialog";
import type { Brand, BrandPage, BrandStatus } from "./types";

export type BrandStatusFilter = BrandStatus | "ALL";

export type BrandFilters = {
  search: string;
  status: BrandStatusFilter;
  /** 1-based, as it appears in the URL. */
  page: number;
};

export type BrandPermissions = {
  create: boolean;
  update: boolean;
  archive: boolean;
};

const statusItems = [
  { label: "All statuses", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Inactive", value: "INACTIVE" },
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
 * There is deliberately no sort control. The list endpoint accepts only
 * `status`, `search`, `page` and `size` -- no ordering parameter -- so a sort
 * dropdown could only have reordered the current page, which reads as a
 * whole-table sort and silently lies. It was removed rather than left in as a
 * control that appears to work.
 */
export function BrandsView({
  brands,
  filters,
  can,
}: {
  brands: BrandPage;
  filters: BrandFilters;
  can: BrandPermissions;
}) {
  const router = useRouter();

  const [search, setSearch] = React.useState(filters.search);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Brand | null>(null);
  const [archiving, setArchiving] = React.useState<Brand | null>(null);

  const hasFilters = filters.search !== "" || filters.status !== "ALL";

  const buildHref = React.useCallback(
    (next: Partial<BrandFilters>) => {
      const merged = { ...filters, ...next };
      const params = new URLSearchParams();
      if (merged.search) params.set("q", merged.search);
      if (merged.status !== "ALL") params.set("status", merged.status);
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
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  router.push(
                    buildHref({
                      status: (value as BrandStatusFilter) ?? "ALL",
                      page: 1,
                    }),
                  )
                }
                items={statusItems}
              >
                <SelectTrigger
                  className="w-full md:w-40"
                  aria-label="Filter by status"
                >
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
              {hasFilters ? (
                <Button variant="ghost" render={<Link href="/brands" />}>
                  <X /> Reset
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {brands.content.length === 0 ? (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Tags />
                </EmptyMedia>
                <EmptyTitle>
                  {hasFilters ? "No brands match your filters" : "No brands yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? "Try a different search term or clear the filters."
                    : "Get started by creating your first brand."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {hasFilters ? (
                  <Button variant="outline" render={<Link href="/brands" />}>
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
