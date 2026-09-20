"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Landmark,
  MoreHorizontal,
  PackageX,
  Search,
  TrendingDown,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { SampleDataNotice } from "@/components/sample-data-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { toneFill, toneSurface, toneText, type Tone } from "@/lib/tone";
import { cn, formatCurrency } from "@/lib/utils";

import {
  MismatchBadge,
  StockBar,
  StockStatusBadge,
} from "./inventory-badges";
import type {
  InventoryFilters,
  InventorySummary,
  StatusCounts,
} from "./sample-data";
import {
  ALL,
  INVENTORY_SORTS,
  STOCK_STATUSES,
  inventorySortLabels,
  statusMismatch,
  stockStatusLabels,
  stockStatusTone,
  stockValue,
  type InventoryPage,
  type InventorySort,
  type StockStatus,
} from "./types";

const SEARCH_DEBOUNCE_MS = 350;

const sortItems = INVENTORY_SORTS.map((sort) => ({
  label: inventorySortLabels[sort],
  value: sort,
}));

/* Header row shared by the table: quiet, small, and not hoverable. */
const headRow =
  "hover:bg-transparent [&>th]:h-9 [&>th]:text-xs [&>th]:font-medium [&>th]:text-muted-foreground";

/**
 * The stock list.
 *
 * The API has no stock at all, so this screen is a proposal — but it is a
 * proposal with a point, and the point is the "Needs attention" tab and the
 * mismatch badge. With no quantity in the backend, the storefront's only
 * notion of availability is a product's `status` field, which a human has to
 * keep in step with a shelf the backend cannot see. That drift is the first
 * thing this table sorts for and the loudest thing it renders.
 *
 * The default sort is therefore *not* alphabetical: it is nothing-to-sell
 * first, then about-to-run-out, with any line whose storefront status is lying
 * pulled to the very top of its group.
 */
export function InventoryView({
  items,
  counts,
  summary,
  filters,
  brands,
  locations,
}: {
  items: InventoryPage;
  counts: StatusCounts;
  summary: InventorySummary;
  filters: InventoryFilters;
  brands: string[];
  locations: string[];
}) {
  const router = useRouter();

  const [search, setSearch] = React.useState(filters.search);

  const hasFilters =
    filters.search !== "" ||
    filters.status !== ALL ||
    filters.brand !== ALL ||
    filters.location !== ALL;

  const buildHref = React.useCallback(
    (next: Partial<InventoryFilters>) => {
      const merged = { ...filters, ...next };
      const params = new URLSearchParams();
      if (merged.search) params.set("q", merged.search);
      if (merged.status !== ALL) params.set("status", merged.status);
      if (merged.brand !== ALL) params.set("brand", merged.brand);
      if (merged.location !== ALL) params.set("location", merged.location);
      if (merged.sort !== "attention") params.set("sort", merged.sort);
      if (merged.page > 1) params.set("page", String(merged.page));

      const queryString = params.toString();
      return queryString ? `/inventory?${queryString}` : "/inventory";
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

  async function copySku(sku: string) {
    try {
      await navigator.clipboard.writeText(sku);
      toast.success(`Copied ${sku}`);
    } catch {
      toast.error("Could not reach the clipboard.");
    }
  }

  const resetHref = buildHref({
    search: "",
    status: ALL,
    brand: ALL,
    location: ALL,
    page: 1,
  });

  const rangeStart =
    items.totalElements === 0 ? 0 : items.page * items.size + 1;
  const rangeEnd = Math.min(
    items.page * items.size + items.content.length,
    items.totalElements,
  );

  const tabs: { label: string; value: StockStatus | typeof ALL }[] = [
    { label: "All", value: ALL },
    ...STOCK_STATUSES.map((status) => ({
      label: stockStatusLabels[status],
      value: status,
    })),
  ];

  const brandItems = [
    { label: "Any brand", value: ALL },
    ...brands.map((brand) => ({ label: brand, value: brand })),
  ];

  const locationItems = [
    { label: "Any depot", value: ALL },
    ...locations.map((location) => ({ label: location, value: location })),
  ];

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          What is on the shelves and what is free to sell.{" "}
          <span className="tabular-nums">
            {items.totalElements} {hasFilters ? "matching" : "SKUs"}
          </span>
        </p>
      </div>

      <SampleDataNotice detail="The API has no stock of any kind — not a field, not an endpoint. A product's only availability signal is its status, one value of which is Out of stock. Every quantity on this screen is a fixture, and the design's argument is the mismatch warning below." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          title="Needs attention"
          value={String(summary.mismatched)}
          icon={TriangleAlert}
          tone={summary.mismatched > 0 ? "danger" : "success"}
          note={
            summary.mismatched > 0
              ? "Storefront disagrees with the shelf"
              : "Storefront matches the shelf"
          }
        />
        <Stat
          title="Low stock"
          value={String(summary.low)}
          icon={TrendingDown}
          tone="warning"
          note="At or below the reorder point"
        />
        <Stat
          title="Out of stock"
          value={String(summary.outOfStock)}
          icon={PackageX}
          tone="danger"
          note="Nothing free to sell"
        />
        <Stat
          title="Stock value"
          value={formatCurrency(summary.stockValue)}
          icon={Landmark}
          tone="info"
          note={`${summary.skus} SKUs, counted at cost`}
        />
      </div>

      <Card className="min-w-0 py-0">
        <CardHeader className="border-b py-4">
          <div className="flex flex-col gap-3">
            {/* Scrolls rather than wraps — a second row of tabs reads as a
                second, unrelated navigation. */}
            <nav
              aria-label="Filter by stock status"
              className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5"
            >
              {tabs.map((tab) => {
                const active = filters.status === tab.value;
                const count = counts[tab.value] ?? 0;

                return (
                  <Link
                    key={tab.value}
                    href={buildHref({ status: tab.value, page: 1 })}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {tab.value !== ALL ? (
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          active
                            ? "bg-primary-foreground/70"
                            : toneFill[stockStatusTone[tab.value]],
                        )}
                      />
                    ) : null}
                    {tab.label}
                    <span
                      className={cn(
                        "tabular-nums",
                        active
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground/70",
                      )}
                    >
                      {count}
                    </span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by product, SKU, brand or category…"
                  className="pr-8 pl-8"
                  aria-label="Search inventory"
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

              <Select
                value={filters.sort}
                onValueChange={(value) =>
                  router.push(
                    buildHref({
                      sort: (value as InventorySort) ?? "attention",
                      page: 1,
                    }),
                  )
                }
                items={sortItems}
              >
                <SelectTrigger
                  className="w-full sm:w-56"
                  aria-label="Sort inventory"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                value={filters.brand}
                onValueChange={(value) =>
                  router.push(buildHref({ brand: value ?? ALL, page: 1 }))
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

              <Select
                value={filters.location}
                onValueChange={(value) =>
                  router.push(buildHref({ location: value ?? ALL, page: 1 }))
                }
                items={locationItems}
              >
                <SelectTrigger aria-label="Filter by depot">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {locationItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters ? (
                <Button variant="ghost" render={<Link href={resetHref} />}>
                  <X /> Reset filters
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {items.content.length === 0 ? (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Boxes />
                </EmptyMedia>
                <EmptyTitle>
                  {hasFilters
                    ? "No stock matches your filters"
                    : "Nothing tracked yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? "Try a different depot or brand, or clear the filters."
                    : "Products with a tracked quantity will appear here."}
                </EmptyDescription>
              </EmptyHeader>
              {hasFilters ? (
                <EmptyContent>
                  <Button variant="outline" render={<Link href={resetHref} />}>
                    Clear filters
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className={headRow}>
                  <TableHead className="pl-4">Product</TableHead>
                  <TableHead className="hidden xl:table-cell">Depot</TableHead>
                  <TableHead className="text-right">On hand</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">
                    Reserved
                  </TableHead>
                  <TableHead className="text-right">Free to sell</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">
                    Stock value
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.content.map((one) => {
                  const flagged = statusMismatch(one) !== null;

                  return (
                    <TableRow
                      key={one.id}
                      // A lying storefront is the one row you must not miss, so
                      // it is tinted rather than merely badged.
                      className={cn(flagged && "bg-destructive/[0.035]")}
                    >
                      <TableCell className="pl-4">
                        <Link
                          href={`/inventory/${one.id}`}
                          className="block max-w-[18rem] truncate font-medium hover:underline"
                        >
                          {one.name}
                        </Link>
                        <div className="truncate text-xs text-muted-foreground">
                          <span className="font-mono">{one.sku}</span> ·{" "}
                          {one.category}
                        </div>
                      </TableCell>

                      <TableCell className="hidden whitespace-nowrap text-muted-foreground xl:table-cell">
                        {one.location}
                      </TableCell>

                      <TableCell className="text-right whitespace-nowrap tabular-nums">
                        {one.onHand}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {one.unit}
                        </span>
                      </TableCell>

                      <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">
                        {one.reserved === 0 ? "—" : one.reserved}
                      </TableCell>

                      <TableCell className="text-right">
                        <StockBar item={one} className="ml-auto w-24" />
                      </TableCell>

                      <TableCell className="hidden text-right whitespace-nowrap tabular-nums lg:table-cell">
                        {formatCurrency(stockValue(one))}
                      </TableCell>

                      <TableCell>
                        <StockStatusBadge item={one} />
                        <div className="mt-0.5">
                          <MismatchBadge item={one} />
                        </div>
                      </TableCell>

                      <TableCell className="pr-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={`Actions for ${one.name}`}
                              />
                            }
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              render={<Link href={`/inventory/${one.id}`} />}
                            >
                              <Eye /> Stock movements
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              render={
                                <Link
                                  href={`/products?q=${encodeURIComponent(one.sku)}`}
                                />
                              }
                            >
                              <Boxes /> Find in products
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copySku(one.sku)}>
                              <Copy /> Copy SKU
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

        {items.totalElements > 0 ? (
          <CardFooter className="flex flex-col gap-3 border-t py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm tabular-nums text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {items.totalElements}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={items.first}
                render={
                  items.first ? (
                    <span />
                  ) : (
                    <Link href={buildHref({ page: filters.page - 1 })} />
                  )
                }
              >
                <ChevronLeft /> <span className="hidden sm:inline">Previous</span>
              </Button>
              <span className="px-2 text-sm tabular-nums text-muted-foreground">
                {items.page + 1} / {Math.max(1, items.totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={items.last}
                render={
                  items.last ? (
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
    </>
  );
}

/** One headline number, built like the dashboard's stat cards. */
function Stat({
  title,
  value,
  icon: Icon,
  tone,
  note,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
  note: string;
}) {
  return (
    <Card size="sm" className="min-w-0">
      <CardContent>
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              toneSurface[tone],
            )}
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-muted-foreground">
              {title}
            </p>
            <p className="mt-0.5 truncate text-xl font-semibold tracking-tight">
              {value}
            </p>
          </div>
        </div>
        <p className={cn("mt-3 truncate text-xs", toneText[tone])}>{note}</p>
      </CardContent>
    </Card>
  );
}
