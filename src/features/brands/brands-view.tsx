"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

import { formatDate, getInitials, newId } from "@/lib/utils";

import { BrandFormDialog } from "./brand-form-dialog";
import { DeleteBrandDialog } from "./delete-brand-dialog";
import type { Brand, BrandFormValues, BrandStatus } from "./types";

type StatusFilter = "all" | BrandStatus;
type SortKey = "newest" | "oldest" | "name-asc" | "name-desc" | "products";

const PAGE_SIZE = 8;

const statusItems = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const sortItems = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
  { label: "Name A–Z", value: "name-asc" },
  { label: "Name Z–A", value: "name-desc" },
  { label: "Most products", value: "products" },
];

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Simulated network latency so loading states are visible. Remove when wiring a real API. */
const fakeRequest = () => new Promise<void>((r) => setTimeout(r, 400));

export function BrandsView({ initialBrands }: { initialBrands: Brand[] }) {
  const [brands, setBrands] = React.useState<Brand[]>(initialBrands);

  // filters
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("newest");
  const [page, setPage] = React.useState(1);

  // dialogs
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Brand | null>(null);
  const [deleting, setDeleting] = React.useState<Brand | null>(null);

  const deferredQuery = React.useDeferredValue(query.trim().toLowerCase());
  const hasFilters = query !== "" || status !== "all";

  const filtered = React.useMemo(() => {
    let list = brands;
    if (deferredQuery) {
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(deferredQuery) ||
          b.slug.includes(deferredQuery) ||
          (b.website ?? "").toLowerCase().includes(deferredQuery),
      );
    }
    if (status !== "all") list = list.filter((b) => b.status === status);

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
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "products":
        sorted.sort((a, b) => b.productCount - a.productCount);
        break;
    }
    return sorted;
  }, [brands, deferredQuery, status, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

  const activeCount = brands.filter((b) => b.status === "active").length;
  const takenSlugs = React.useMemo(() => brands.map((b) => b.slug), [brands]);

  // ---- actions -------------------------------------------------------------

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(brand: Brand) {
    setEditing(brand);
    setFormOpen(true);
  }

  async function handleSubmit(values: BrandFormValues) {
    await fakeRequest();
    if (editing) {
      setBrands((list) =>
        list.map((b) =>
          b.id === editing.id
            ? {
                ...b,
                ...values,
                website: values.website || undefined,
                logoUrl: values.logoUrl || undefined,
                description: values.description || undefined,
              }
            : b,
        ),
      );
      toast.success("Brand updated", { description: values.name });
    } else {
      const brand: Brand = {
        id: newId("brd"),
        name: values.name,
        slug: values.slug,
        website: values.website || undefined,
        logoUrl: values.logoUrl || undefined,
        description: values.description || undefined,
        status: values.status,
        productCount: 0,
        createdAt: new Date().toISOString(),
      };
      setBrands((list) => [brand, ...list]);
      setPage(1);
      toast.success("Brand created", { description: values.name });
    }
  }

  async function handleDelete(brand: Brand) {
    await fakeRequest();
    setBrands((list) => list.filter((b) => b.id !== brand.id));
    toast.success("Brand deleted", { description: brand.name });
  }

  async function toggleStatus(brand: Brand) {
    const next: BrandStatus = brand.status === "active" ? "inactive" : "active";
    setBrands((list) =>
      list.map((b) => (b.id === brand.id ? { ...b, status: next } : b)),
    );
    toast.success(next === "active" ? "Brand activated" : "Brand deactivated", {
      description: brand.name,
    });
  }

  function resetFilters() {
    setQuery("");
    setStatus("all");
    setPage(1);
  }

  // ---- render --------------------------------------------------------------

  return (
    <>
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Brands</h1>
          <p className="text-sm text-muted-foreground">
            Manage the brands available in your catalog.{" "}
            <span className="tabular-nums">
              {brands.length} total · {activeCount} active
            </span>
          </p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus /> Add brand
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
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, slug or website…"
                className="pl-8 pr-8"
                aria-label="Search brands"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPage(1);
                  }}
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
                onValueChange={(v) => {
                  setStatus((v as StatusFilter) ?? "all");
                  setPage(1);
                }}
                items={statusItems}
              >
                <SelectTrigger className="w-full md:w-40" aria-label="Filter by status">
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
                value={sort}
                onValueChange={(v) => setSort((v as SortKey) ?? "newest")}
                items={sortItems}
              >
                <SelectTrigger className="w-full md:w-40" aria-label="Sort brands">
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

        {/* Table / empty */}
        <CardContent className="p-0">
          {pageItems.length === 0 ? (
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
                  <Button variant="outline" onClick={resetFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Button onClick={openCreate}>
                    <Plus /> Add brand
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Brand</TableHead>
                  <TableHead className="hidden md:table-cell">Website</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">
                    Products
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead className="w-12 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="pl-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-9 rounded-md border">
                          {brand.logoUrl && (
                            <AvatarImage src={brand.logoUrl} alt="" />
                          )}
                          <AvatarFallback className="rounded-md text-xs font-medium">
                            {getInitials(brand.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => openEdit(brand)}
                            className="block max-w-[14rem] truncate text-left font-medium hover:underline sm:max-w-xs"
                          >
                            {brand.name}
                          </button>
                          <div className="truncate font-mono text-xs text-muted-foreground">
                            /{brand.slug}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {brand.website ? (
                        <a
                          href={brand.website}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                        >
                          {hostname(brand.website)}
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {brand.productCount}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={brand.status === "active" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {brand.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {formatDate(brand.createdAt)}
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
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => openEdit(brand)}>
                            <Pencil /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void toggleStatus(brand)}>
                            <Power />
                            {brand.status === "active" ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleting(brand)}
                          >
                            <Trash2 /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
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
                <ChevronLeft /> <span className="hidden sm:inline">Previous</span>
              </Button>
              <div className="hidden items-center gap-1 sm:flex">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <Button
                    key={n}
                    variant={n === currentPage ? "outline" : "ghost"}
                    size="icon"
                    className="size-8"
                    onClick={() => setPage(n)}
                    aria-current={n === currentPage ? "page" : undefined}
                  >
                    {n}
                  </Button>
                ))}
              </div>
              <span className="px-2 text-sm text-muted-foreground tabular-nums sm:hidden">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <span className="hidden sm:inline">Next</span> <ChevronRight />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      <BrandFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        brand={editing}
        takenSlugs={takenSlugs}
        onSubmit={handleSubmit}
      />
      <DeleteBrandDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        brand={deleting}
        onConfirm={handleDelete}
      />
    </>
  );
}
