"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Mail,
  MoreHorizontal,
  Search,
  ShieldAlert,
  Users,
  UserPlus,
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
import { cn, formatCurrency, formatDate } from "@/lib/utils";

import {
  CustomerAvatar,
  CustomerStatusBadge,
  CustomerTypeMark,
} from "./customer-badges";
import type {
  CustomerFilters,
  CustomerSummary,
  StatusCounts,
} from "./sample-data";
import {
  ALL,
  CUSTOMER_SORTS,
  CUSTOMER_STATUSES,
  CUSTOMER_TYPES,
  VERIFIED_FILTERS,
  customerSortLabels,
  customerStatusLabels,
  customerStatusTone,
  customerTypeLabels,
  verifiedFilterLabels,
  type CustomerPage,
  type CustomerSort,
  type CustomerStatus,
  type CustomerType,
  type VerifiedFilter,
} from "./types";

const SEARCH_DEBOUNCE_MS = 350;

const sortItems = CUSTOMER_SORTS.map((sort) => ({
  label: customerSortLabels[sort],
  value: sort,
}));

const typeItems = [
  { label: "Any trade", value: ALL },
  ...CUSTOMER_TYPES.map((type) => ({
    label: customerTypeLabels[type],
    value: type,
  })),
];

const verifiedItems = [
  { label: "Verified or not", value: ALL },
  ...VERIFIED_FILTERS.map((value) => ({
    label: verifiedFilterLabels[value],
    value,
  })),
];

/* Header row shared by the table: quiet, small, and not hoverable. */
const headRow =
  "hover:bg-transparent [&>th]:h-9 [&>th]:text-xs [&>th]:font-medium [&>th]:text-muted-foreground";

/**
 * The customer book.
 *
 * Read-only, and not because of an oversight: the API has no admin customer
 * surface at all, so there is nothing to edit, block or message from here. The
 * screen is built for the two questions a desk actually asks of it — "who is
 * this person on the phone" and "who is worth calling back" — which is why
 * spend and last-order sit in the table rather than behind a detail click.
 *
 * Filtering and paging live in the URL, as on products and orders, so a
 * filtered book survives a reload and can be sent to a colleague.
 */
export function CustomersView({
  customers,
  counts,
  summary,
  filters,
}: {
  customers: CustomerPage;
  counts: StatusCounts;
  summary: CustomerSummary;
  filters: CustomerFilters;
}) {
  const router = useRouter();

  const [search, setSearch] = React.useState(filters.search);

  const hasFilters =
    filters.search !== "" ||
    filters.status !== ALL ||
    filters.type !== ALL ||
    filters.verified !== ALL;

  const buildHref = React.useCallback(
    (next: Partial<CustomerFilters>) => {
      const merged = { ...filters, ...next };
      const params = new URLSearchParams();
      if (merged.search) params.set("q", merged.search);
      if (merged.status !== ALL) params.set("status", merged.status);
      if (merged.type !== ALL) params.set("type", merged.type);
      if (merged.verified !== ALL) params.set("verified", merged.verified);
      if (merged.sort !== "recent") params.set("sort", merged.sort);
      if (merged.page > 1) params.set("page", String(merged.page));

      const queryString = params.toString();
      return queryString ? `/users?${queryString}` : "/users";
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

  async function copy(value: string, what: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Copied ${what}`);
    } catch {
      toast.error("Could not reach the clipboard.");
    }
  }

  const resetHref = buildHref({
    search: "",
    status: ALL,
    type: ALL,
    verified: ALL,
    page: 1,
  });

  const rangeStart =
    customers.totalElements === 0 ? 0 : customers.page * customers.size + 1;
  const rangeEnd = Math.min(
    customers.page * customers.size + customers.content.length,
    customers.totalElements,
  );

  const tabs: { label: string; value: CustomerStatus | typeof ALL }[] = [
    { label: "All", value: ALL },
    ...CUSTOMER_STATUSES.map((status) => ({
      label: customerStatusLabels[status],
      value: status,
    })),
  ];

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Everyone who has registered on the storefront.{" "}
          <span className="tabular-nums">
            {customers.totalElements} {hasFilters ? "matching" : "total"}
          </span>
        </p>
      </div>

      <SampleDataNotice detail="The API has no admin customer endpoints — shoppers exist only behind their own /auth/customer and /customer/addresses routes. This whole screen runs over a fixture, and account status is a field the API does not have at all." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          title="Customers"
          value={String(summary.total)}
          icon={Users}
          tone="info"
          note="Registered accounts"
        />
        <Stat
          title="New this month"
          value={String(summary.newThisMonth)}
          icon={UserPlus}
          tone="success"
          note="Signed up in September"
        />
        <Stat
          title="Trade accounts"
          value={String(summary.trade)}
          icon={Building2}
          tone="violet"
          note="Everything but Personal"
        />
        <Stat
          title="Blocked or dormant"
          value={String(summary.blockedOrDormant)}
          icon={ShieldAlert}
          tone="warning"
          note="Cannot or does not buy"
        />
      </div>

      <Card className="min-w-0 py-0">
        <CardHeader className="border-b py-4">
          <div className="flex flex-col gap-3">
            {/* Scrolls rather than wraps — a second row of tabs reads as a
                second, unrelated navigation. */}
            <nav
              aria-label="Filter by account status"
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
                            : toneFill[customerStatusTone[tab.value]],
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
                  placeholder="Search by name, business, email or phone…"
                  className="pr-8 pl-8"
                  aria-label="Search customers"
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
                      sort: (value as CustomerSort) ?? "recent",
                      page: 1,
                    }),
                  )
                }
                items={sortItems}
              >
                <SelectTrigger
                  className="w-full sm:w-52"
                  aria-label="Sort customers"
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
                value={filters.type}
                onValueChange={(value) =>
                  router.push(
                    buildHref({ type: (value as CustomerType) ?? ALL, page: 1 }),
                  )
                }
                items={typeItems}
              >
                <SelectTrigger aria-label="Filter by trade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {typeItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.verified}
                onValueChange={(value) =>
                  router.push(
                    buildHref({
                      verified: (value as VerifiedFilter) ?? ALL,
                      page: 1,
                    }),
                  )
                }
                items={verifiedItems}
              >
                <SelectTrigger aria-label="Filter by phone verification">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {verifiedItems.map((item) => (
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
          {customers.content.length === 0 ? (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>
                  {hasFilters
                    ? "No customers match your filters"
                    : "No customers yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? "Try a different trade, or clear the filters."
                    : "Accounts registered on the storefront will appear here."}
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
                  <TableHead className="pl-4">Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="hidden lg:table-cell">Trade</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Lifetime spend</TableHead>
                  <TableHead className="hidden xl:table-cell">
                    Last order
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.content.map((one) => (
                  <TableRow key={one.id}>
                    <TableCell className="pl-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <CustomerAvatar name={one.fullName} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/users/${one.id}`}
                              className="block max-w-[12rem] truncate font-medium hover:underline"
                            >
                              {one.fullName}
                            </Link>
                            {one.verified ? null : (
                              <ShieldAlert
                                className="size-3.5 shrink-0 text-warning"
                                aria-label="Phone not verified"
                              />
                            )}
                          </div>
                          <div className="max-w-[12rem] truncate text-xs text-muted-foreground">
                            {one.businessName ?? "—"}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      <span className="block max-w-[14rem] truncate">
                        {one.email}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {one.phone}
                      </span>
                    </TableCell>

                    <TableCell className="hidden lg:table-cell">
                      <CustomerTypeMark type={one.customerType} />
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {one.lifetimeOrders}
                    </TableCell>

                    <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">
                      {formatCurrency(one.lifetimeSpend)}
                    </TableCell>

                    <TableCell className="hidden whitespace-nowrap text-muted-foreground xl:table-cell">
                      {one.lastOrderAt ? formatDate(one.lastOrderAt) : "Never"}
                    </TableCell>

                    <TableCell>
                      <CustomerStatusBadge status={one.status} />
                    </TableCell>

                    <TableCell className="pr-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              aria-label={`Actions for ${one.fullName}`}
                            />
                          }
                        >
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            render={<Link href={`/users/${one.id}`} />}
                          >
                            <Eye /> View details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => copy(one.phone, "phone number")}
                          >
                            <Copy /> Copy phone
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => copy(one.email, "email address")}
                          >
                            <Mail /> Copy email
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

        {customers.totalElements > 0 ? (
          <CardFooter className="flex flex-col gap-3 border-t py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm tabular-nums text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {customers.totalElements}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={customers.first}
                render={
                  customers.first ? (
                    <span />
                  ) : (
                    <Link href={buildHref({ page: filters.page - 1 })} />
                  )
                }
              >
                <ChevronLeft /> <span className="hidden sm:inline">Previous</span>
              </Button>
              <span className="px-2 text-sm tabular-nums text-muted-foreground">
                {customers.page + 1} / {Math.max(1, customers.totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={customers.last}
                render={
                  customers.last ? (
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
