"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Landmark,
  MoreHorizontal,
  Search,
  TicketPercent,
  Ticket,
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
import { SAMPLE_TODAY } from "@/lib/fixtures";
import { toneFill, toneSurface, toneText, type Tone } from "@/lib/tone";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

import {
  AudienceMark,
  CouponStatusBadge,
  DiscountMark,
  UsageMeter,
} from "./coupon-badges";
import type {
  CouponFilters,
  CouponSummary,
  StatusCounts,
} from "./sample-data";
import {
  ALL,
  AUDIENCES,
  COUPON_ENDING_SOON_DAYS,
  COUPON_SORTS,
  COUPON_STATUSES,
  DISCOUNT_TYPES,
  audienceLabels,
  couponSortLabels,
  couponStatusLabels,
  couponStatusTone,
  daysUntilEnd,
  discountTypeLabels,
  isLive,
  scopeTypeLabels,
  type Audience,
  type CouponPage,
  type CouponSort,
  type CouponStatus,
  type DiscountType,
} from "./types";

const SEARCH_DEBOUNCE_MS = 350;

const sortItems = COUPON_SORTS.map((sort) => ({
  label: couponSortLabels[sort],
  value: sort,
}));

const discountItems = [
  { label: "Any discount", value: ALL },
  ...DISCOUNT_TYPES.map((type) => ({
    label: discountTypeLabels[type],
    value: type,
  })),
];

const audienceItems = [
  { label: "Any audience", value: ALL },
  ...AUDIENCES.map((audience) => ({
    label: audienceLabels[audience],
    value: audience,
  })),
];

/* Header row shared by the table: quiet, small, and not hoverable. */
const headRow =
  "hover:bg-transparent [&>th]:h-9 [&>th]:text-xs [&>th]:font-medium [&>th]:text-muted-foreground";

/**
 * The coupon book.
 *
 * The *rule* each row shows — discount type, scope, minimum, cap, end date —
 * is real: those fields come straight from `VoucherSummaryResponse`. The
 * campaign management around them is the proposal, because the API has no
 * admin voucher surface at all.
 *
 * Two choices worth keeping:
 *
 * - **It sorts by ending soonest**, with finished campaigns behind live ones.
 *   A promotions list is read to catch the thing that is about to lapse, not
 *   to browse history.
 * - **No status colour is red.** Expired, paused and used-up are all normal
 *   ends for a campaign. The only thing that earns a warning is a live coupon
 *   inside a week of its end date, which gets an amber date instead.
 */
export function CouponsView({
  coupons,
  counts,
  summary,
  filters,
}: {
  coupons: CouponPage;
  counts: StatusCounts;
  summary: CouponSummary;
  filters: CouponFilters;
}) {
  const router = useRouter();

  const [search, setSearch] = React.useState(filters.search);

  const hasFilters =
    filters.search !== "" ||
    filters.status !== ALL ||
    filters.discountType !== ALL ||
    filters.audience !== ALL;

  const buildHref = React.useCallback(
    (next: Partial<CouponFilters>) => {
      const merged = { ...filters, ...next };
      const params = new URLSearchParams();
      if (merged.search) params.set("q", merged.search);
      if (merged.status !== ALL) params.set("status", merged.status);
      if (merged.discountType !== ALL) params.set("type", merged.discountType);
      if (merged.audience !== ALL) params.set("audience", merged.audience);
      if (merged.sort !== "ending") params.set("sort", merged.sort);
      if (merged.page > 1) params.set("page", String(merged.page));

      const queryString = params.toString();
      return queryString ? `/coupons?${queryString}` : "/coupons";
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

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Copied ${code}`);
    } catch {
      toast.error("Could not reach the clipboard.");
    }
  }

  const resetHref = buildHref({
    search: "",
    status: ALL,
    discountType: ALL,
    audience: ALL,
    page: 1,
  });

  const rangeStart =
    coupons.totalElements === 0 ? 0 : coupons.page * coupons.size + 1;
  const rangeEnd = Math.min(
    coupons.page * coupons.size + coupons.content.length,
    coupons.totalElements,
  );

  const tabs: { label: string; value: CouponStatus | typeof ALL }[] = [
    { label: "All", value: ALL },
    ...COUPON_STATUSES.map((status) => ({
      label: couponStatusLabels[status],
      value: status,
    })),
  ];

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Coupons</h1>
          <p className="text-sm text-muted-foreground">
            Discount codes and who can use them.{" "}
            <span className="tabular-nums">
              {coupons.totalElements} {hasFilters ? "matching" : "total"}
            </span>
          </p>
        </div>
        {/* The API has nothing to POST to, so this cannot be a live control —
            but a coupon screen with no "new coupon" button is not the design. */}
        <Button
          className="w-full sm:w-auto"
          disabled
          title="The API has no endpoint that creates a voucher"
        >
          <TicketPercent /> New coupon
        </Button>
      </div>

      <SampleDataNotice detail="Vouchers exist in the API, but only for the shopper: GET /vouchers returns the signed-in customer's own codes, and checkout can apply or remove one. Nothing lists, creates or edits a voucher from the back office, so this screen is a fixture — though the discount rule it shows is the API's real shape." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          title="Active coupons"
          value={String(summary.active)}
          icon={Ticket}
          tone="success"
          note="Redeemable at checkout now"
        />
        <Stat
          title={`Ending within ${COUPON_ENDING_SOON_DAYS} days`}
          value={String(summary.endingSoon)}
          icon={CalendarClock}
          tone={summary.endingSoon > 0 ? "warning" : "neutral"}
          note={
            summary.endingSoon > 0
              ? "Extend them or let them lapse"
              : "Nothing lapsing this week"
          }
        />
        <Stat
          title="Redemptions"
          value={summary.redemptions.toLocaleString("en-US")}
          icon={TicketPercent}
          tone="info"
          note="Across every campaign, all time"
        />
        <Stat
          title="Discount given"
          value={formatCurrency(summary.discountGiven)}
          icon={Landmark}
          tone="violet"
          note="What the promotions have cost"
        />
      </div>

      <Card className="min-w-0 py-0">
        <CardHeader className="border-b py-4">
          <div className="flex flex-col gap-3">
            {/* Scrolls rather than wraps — a second row of tabs reads as a
                second, unrelated navigation. */}
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
                            : toneFill[couponStatusTone[tab.value]],
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
                  placeholder="Search by code, name or scope…"
                  className="pr-8 pl-8"
                  aria-label="Search coupons"
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
                      sort: (value as CouponSort) ?? "ending",
                      page: 1,
                    }),
                  )
                }
                items={sortItems}
              >
                <SelectTrigger
                  className="w-full sm:w-52"
                  aria-label="Sort coupons"
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
                value={filters.discountType}
                onValueChange={(value) =>
                  router.push(
                    buildHref({
                      discountType: (value as DiscountType) ?? ALL,
                      page: 1,
                    }),
                  )
                }
                items={discountItems}
              >
                <SelectTrigger aria-label="Filter by discount type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {discountItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.audience}
                onValueChange={(value) =>
                  router.push(
                    buildHref({
                      audience: (value as Audience) ?? ALL,
                      page: 1,
                    }),
                  )
                }
                items={audienceItems}
              >
                <SelectTrigger aria-label="Filter by audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {audienceItems.map((item) => (
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
          {coupons.content.length === 0 ? (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TicketPercent />
                </EmptyMedia>
                <EmptyTitle>
                  {hasFilters
                    ? "No coupons match your filters"
                    : "No coupons yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? "Try a different discount type or audience, or clear the filters."
                    : "Discount codes you create will appear here."}
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
                  <TableHead className="pl-4">Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead className="hidden lg:table-cell">Applies to</TableHead>
                  <TableHead className="hidden xl:table-cell">Audience</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">
                    Given
                  </TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.content.map((coupon) => {
                  const days = daysUntilEnd(coupon, SAMPLE_TODAY);
                  const endingSoon =
                    isLive(coupon.status) &&
                    days >= 0 &&
                    days <= COUPON_ENDING_SOON_DAYS;

                  return (
                    <TableRow key={coupon.id}>
                      <TableCell className="pl-4">
                        <Link
                          href={`/coupons/${coupon.id}`}
                          className="font-mono font-medium hover:underline"
                        >
                          {coupon.code}
                        </Link>
                        <div className="max-w-[13rem] truncate text-xs text-muted-foreground">
                          {coupon.name}
                        </div>
                      </TableCell>

                      <TableCell>
                        <DiscountMark coupon={coupon} />
                        <div className="text-xs whitespace-nowrap text-muted-foreground">
                          {coupon.minimumOrderAmount === null
                            ? "No minimum"
                            : `Over ${formatCurrency(coupon.minimumOrderAmount)}`}
                        </div>
                      </TableCell>

                      <TableCell className="hidden lg:table-cell">
                        <span className="block max-w-[11rem] truncate">
                          {coupon.scopeLabel}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {scopeTypeLabels[coupon.scopeType]}
                        </span>
                      </TableCell>

                      <TableCell className="hidden xl:table-cell">
                        <AudienceMark
                          audience={coupon.audience}
                          issuedTo={coupon.issuedTo}
                        />
                      </TableCell>

                      <TableCell className="text-right">
                        <UsageMeter coupon={coupon} className="ml-auto w-20" />
                      </TableCell>

                      <TableCell className="hidden text-right whitespace-nowrap tabular-nums lg:table-cell">
                        {formatCurrency(coupon.discountGiven)}
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        {formatDate(coupon.endDate)}
                        {/*
                          The only warning on this screen: a campaign that is
                          live now and will not be next week.
                        */}
                        <div
                          className={cn(
                            "text-xs tabular-nums",
                            endingSoon
                              ? "font-medium text-warning"
                              : "text-muted-foreground",
                          )}
                        >
                          {days < 0
                            ? `${Math.abs(days)} days ago`
                            : days === 0
                              ? "Today"
                              : `in ${days} day${days === 1 ? "" : "s"}`}
                        </div>
                      </TableCell>

                      <TableCell>
                        <CouponStatusBadge status={coupon.status} />
                      </TableCell>

                      <TableCell className="pr-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={`Actions for ${coupon.code}`}
                              />
                            }
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              render={<Link href={`/coupons/${coupon.id}`} />}
                            >
                              <Eye /> View details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => copyCode(coupon.code)}
                            >
                              <Copy /> Copy code
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

        {coupons.totalElements > 0 ? (
          <CardFooter className="flex flex-col gap-3 border-t py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm tabular-nums text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {coupons.totalElements}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={coupons.first}
                render={
                  coupons.first ? (
                    <span />
                  ) : (
                    <Link href={buildHref({ page: filters.page - 1 })} />
                  )
                }
              >
                <ChevronLeft /> <span className="hidden sm:inline">Previous</span>
              </Button>
              <span className="px-2 text-sm tabular-nums text-muted-foreground">
                {coupons.page + 1} / {Math.max(1, coupons.totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={coupons.last}
                render={
                  coupons.last ? (
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
