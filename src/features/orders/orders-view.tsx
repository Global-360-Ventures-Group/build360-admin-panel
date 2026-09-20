"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Building2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Hourglass,
  MoreHorizontal,
  Search,
  ShoppingCart,
  Truck,
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
import {
  deliveryMethodCodeLabels,
  type DeliveryMethodCode,
} from "@/features/delivery/methods/types";
import { isTradeAccount } from "@/features/customers/types";
import { toneFill, toneSurface, toneText, type Tone } from "@/lib/tone";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";

import {
  DeliveryMethodBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from "./order-badges";
import type {
  OrderFilters,
  OrderSummary,
  StatusCounts,
} from "./sample-data";
import {
  ALL,
  DATE_RANGES,
  ORDER_SORTS,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  dateRangeLabels,
  formatDeliveryDate,
  orderStatusLabels,
  orderStatusTone,
  orderSortLabels,
  paymentMethodLabels,
  paymentStatusLabels,
  unitCount,
  type DateRange,
  type OrderPage,
  type OrderSort,
  type OrderStatus,
  type PaymentStatus,
} from "./types";

const SEARCH_DEBOUNCE_MS = 350;

/** The range every visit starts on; also what "Reset filters" goes back to. */
const DEFAULT_RANGE: DateRange = "30d";

const DELIVERY_METHODS: DeliveryMethodCode[] = [
  "STANDARD",
  "EXPRESS",
  "CLICK_AND_COLLECT",
];

const sortItems = ORDER_SORTS.map((sort) => ({
  label: orderSortLabels[sort],
  value: sort,
}));

const paymentItems = [
  { label: "Any payment", value: ALL },
  ...PAYMENT_STATUSES.map((status) => ({
    label: paymentStatusLabels[status],
    value: status,
  })),
];

const methodItems = [
  { label: "Any delivery method", value: ALL },
  ...DELIVERY_METHODS.map((code) => ({
    label: deliveryMethodCodeLabels[code],
    value: code,
  })),
];

const rangeItems = DATE_RANGES.map((range) => ({
  label: dateRangeLabels[range],
  value: range,
}));

/* Header row shared by the table: quiet, small, and not hoverable. */
const headRow =
  "hover:bg-transparent [&>th]:h-9 [&>th]:text-xs [&>th]:font-medium [&>th]:text-muted-foreground";

/**
 * The orders table.
 *
 * Filtering, sorting and paging all live in the URL, exactly as on the
 * products screen — a filtered list should survive a reload and be sendable to
 * a colleague. The work behind that URL currently happens in
 * `listSampleOrders`; when `/admin/orders` exists it moves server-side and
 * this component does not change.
 *
 * Two deliberate choices:
 *
 * - **Status is a row of tabs, not a select.** It is the filter that gets used
 *   on every visit, and the counts beside each tab are the answer to "what
 *   needs me today" without running a filter at all.
 * - **Nothing here edits an order.** There is no endpoint to advance a status,
 *   so the row menu only reads: open, or copy the number into whatever tool
 *   actually does the work today.
 */
export function OrdersView({
  orders,
  counts,
  summary,
  filters,
}: {
  orders: OrderPage;
  counts: StatusCounts;
  summary: OrderSummary;
  filters: OrderFilters;
}) {
  const router = useRouter();

  const [search, setSearch] = React.useState(filters.search);

  const hasFilters =
    filters.search !== "" ||
    filters.status !== ALL ||
    filters.payment !== ALL ||
    filters.method !== ALL ||
    filters.range !== DEFAULT_RANGE;

  const buildHref = React.useCallback(
    (next: Partial<OrderFilters>) => {
      const merged = { ...filters, ...next };
      const params = new URLSearchParams();
      if (merged.search) params.set("q", merged.search);
      if (merged.status !== ALL) params.set("status", merged.status);
      if (merged.payment !== ALL) params.set("payment", merged.payment);
      if (merged.method !== ALL) params.set("method", merged.method);
      if (merged.range !== DEFAULT_RANGE) params.set("range", merged.range);
      if (merged.sort !== "newest") params.set("sort", merged.sort);
      if (merged.page > 1) params.set("page", String(merged.page));

      const queryString = params.toString();
      return queryString ? `/orders?${queryString}` : "/orders";
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

  async function copyOrderNo(orderNo: string) {
    try {
      await navigator.clipboard.writeText(orderNo);
      toast.success(`Copied ${orderNo}`);
    } catch {
      toast.error("Could not reach the clipboard.");
    }
  }

  const resetHref = buildHref({
    search: "",
    status: ALL,
    payment: ALL,
    method: ALL,
    range: DEFAULT_RANGE,
    page: 1,
  });

  const rangeStart =
    orders.totalElements === 0 ? 0 : orders.page * orders.size + 1;
  const rangeEnd = Math.min(
    orders.page * orders.size + orders.content.length,
    orders.totalElements,
  );

  const tabs: { label: string; value: OrderStatus | typeof ALL }[] = [
    { label: "All", value: ALL },
    ...ORDER_STATUSES.map((status) => ({
      label: orderStatusLabels[status],
      value: status,
    })),
  ];

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Every order placed through the storefront.{" "}
            <span className="tabular-nums">
              {orders.totalElements} {hasFilters ? "matching" : "total"}
            </span>
          </p>
        </div>
      </div>

      <SampleDataNotice detail="The API has no admin order endpoints yet — searching, filtering and paging all run over a fixture in the browser. Nothing here is a real order, and nothing saves." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          title="Orders today"
          value={String(summary.today)}
          icon={ShoppingCart}
          tone="info"
          note="Placed since midnight"
        />
        <Stat
          title="Awaiting action"
          value={String(summary.awaitingAction)}
          icon={Hourglass}
          tone="warning"
          note="Pending or confirmed, not yet picked"
        />
        <Stat
          title="On the road"
          value={String(summary.onTheRoad)}
          icon={Truck}
          tone="teal"
          note="Shipped, not yet delivered"
        />
        <Stat
          title="Revenue today"
          value={formatCurrency(summary.revenueToday)}
          icon={Banknote}
          tone="success"
          note="Cancelled orders excluded"
        />
      </div>

      <Card className="min-w-0 py-0">
        <CardHeader className="border-b py-4">
          <div className="flex flex-col gap-3">
            {/*
              Scrolls rather than wraps: eight tabs do not fit a phone, and a
              second row of them reads as a second, unrelated navigation.
            */}
            <nav
              aria-label="Filter by status"
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
                            : toneFill[orderStatusTone[tab.value]],
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
                  placeholder="Search by order no, customer, phone or product…"
                  className="pr-8 pl-8"
                  aria-label="Search orders"
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
                    buildHref({ sort: (value as OrderSort) ?? "newest", page: 1 }),
                  )
                }
                items={sortItems}
              >
                <SelectTrigger className="w-full sm:w-48" aria-label="Sort orders">
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
                value={filters.payment}
                onValueChange={(value) =>
                  router.push(
                    buildHref({
                      payment: (value as PaymentStatus) ?? ALL,
                      page: 1,
                    }),
                  )
                }
                items={paymentItems}
              >
                <SelectTrigger aria-label="Filter by payment status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.method}
                onValueChange={(value) =>
                  router.push(
                    buildHref({
                      method: (value as DeliveryMethodCode) ?? ALL,
                      page: 1,
                    }),
                  )
                }
                items={methodItems}
              >
                <SelectTrigger aria-label="Filter by delivery method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {methodItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.range}
                onValueChange={(value) =>
                  router.push(
                    buildHref({
                      range: (value as DateRange) ?? DEFAULT_RANGE,
                      page: 1,
                    }),
                  )
                }
                items={rangeItems}
              >
                <SelectTrigger aria-label="Filter by date placed">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rangeItems.map((item) => (
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
          {orders.content.length === 0 ? (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShoppingCart />
                </EmptyMedia>
                <EmptyTitle>
                  {hasFilters ? "No orders match your filters" : "No orders yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? "Try a wider date range, a different status, or clear the filters."
                    : "Orders placed on the storefront will land here."}
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
                  <TableHead className="pl-4">Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden lg:table-cell">Items</TableHead>
                  <TableHead className="hidden xl:table-cell">
                    Delivery
                  </TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.content.map((order) => {
                  const [first, ...rest] = order.items;

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="pl-4">
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-medium tabular-nums hover:underline"
                        >
                          {order.orderNo}
                        </Link>
                        <div className="text-xs whitespace-nowrap text-muted-foreground">
                          {formatDateTime(order.createdAt)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex min-w-0 items-center gap-1.5">
                          {isTradeAccount(order.customerType) ? (
                            <Building2
                              className="size-3.5 shrink-0 text-muted-foreground"
                              aria-label="Trade account"
                            />
                          ) : null}
                          <span className="block max-w-[11rem] truncate">
                            {order.address.contactName}
                          </span>
                        </div>
                        <div className="text-xs tabular-nums text-muted-foreground">
                          {order.address.phone}
                        </div>
                      </TableCell>

                      <TableCell className="hidden lg:table-cell">
                        <span className="block max-w-[14rem] truncate">
                          {first.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {rest.length > 0 ? `+${rest.length} more · ` : null}
                          {unitCount(order)} units
                        </span>
                      </TableCell>

                      <TableCell className="hidden xl:table-cell">
                        <DeliveryMethodBadge code={order.deliveryMethodCode} />
                        <div className="text-xs whitespace-nowrap text-muted-foreground">
                          {formatDeliveryDate(order.deliveryDate)} · {order.deliverySlotLabel}
                        </div>
                      </TableCell>

                      <TableCell>
                        <PaymentStatusBadge status={order.paymentStatus} />
                        <div className="text-xs whitespace-nowrap text-muted-foreground">
                          {paymentMethodLabels[order.paymentMethod]}
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">
                        {formatCurrency(order.totalAmount)}
                      </TableCell>

                      <TableCell>
                        <OrderStatusBadge status={order.orderStatus} />
                      </TableCell>

                      <TableCell className="pr-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={`Actions for ${order.orderNo}`}
                              />
                            }
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              render={<Link href={`/orders/${order.id}`} />}
                            >
                              <Eye /> View details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => copyOrderNo(order.orderNo)}
                            >
                              <Copy /> Copy order no
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

        {orders.totalElements > 0 ? (
          <CardFooter className="flex flex-col gap-3 border-t py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm tabular-nums text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {orders.totalElements}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={orders.first}
                render={
                  orders.first ? (
                    <span />
                  ) : (
                    <Link href={buildHref({ page: filters.page - 1 })} />
                  )
                }
              >
                <ChevronLeft /> <span className="hidden sm:inline">Previous</span>
              </Button>
              <span className="px-2 text-sm tabular-nums text-muted-foreground">
                {orders.page + 1} / {Math.max(1, orders.totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={orders.last}
                render={
                  orders.last ? (
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
