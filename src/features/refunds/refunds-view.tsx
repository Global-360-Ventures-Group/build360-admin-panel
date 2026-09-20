"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Hourglass,
  Inbox,
  MoreHorizontal,
  Receipt,
  Scale,
  Search,
  Undo2,
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
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";

import {
  RefundKindMark,
  RefundReasonMark,
  RefundStatusBadge,
} from "./refund-badges";
import type {
  RefundFilters,
  RefundSummary,
  StatusCounts,
} from "./sample-data";
import {
  ALL,
  REFUND_KINDS,
  REFUND_REASONS,
  REFUND_SLA_DAYS,
  REFUND_SORTS,
  REFUND_STATUSES,
  daysOpen,
  isPartial,
  refundKindLabels,
  refundReasonLabels,
  refundSortLabels,
  refundStatusLabels,
  refundStatusTone,
  unitCount,
  type RefundKind,
  type RefundPage,
  type RefundReason,
  type RefundSort,
  type RefundStatus,
} from "./types";

const SEARCH_DEBOUNCE_MS = 350;

const sortItems = REFUND_SORTS.map((sort) => ({
  label: refundSortLabels[sort],
  value: sort,
}));

const kindItems = [
  { label: "Refunds and cancellations", value: ALL },
  ...REFUND_KINDS.map((kind) => ({
    label: `${refundKindLabels[kind]}s only`,
    value: kind,
  })),
];

const reasonItems = [
  { label: "Any reason", value: ALL },
  ...REFUND_REASONS.map((reason) => ({
    label: refundReasonLabels[reason],
    value: reason,
  })),
];

/* Header row shared by the table: quiet, small, and not hoverable. */
const headRow =
  "hover:bg-transparent [&>th]:h-9 [&>th]:text-xs [&>th]:font-medium [&>th]:text-muted-foreground";

/**
 * The refund and cancellation queue.
 *
 * This is a work list, not a ledger, and three choices follow from that:
 *
 * - **It sorts by longest waiting, not newest.** A refund queue is read to
 *   find the person who has been ignored, and resolved requests sink below
 *   every open one.
 * - **Age is the alarm, not status.** Every status colour here is calm —
 *   rejection is a normal outcome, not a fault — so urgency is carried by how
 *   many days a request has been open, which turns red past the service level.
 * - **Nothing here approves anything.** The API has no refund resource at all,
 *   so the row menu only reads: open it, or copy the reference into whatever
 *   actually moves the money today.
 */
export function RefundsView({
  requests,
  counts,
  summary,
  filters,
}: {
  requests: RefundPage;
  counts: StatusCounts;
  summary: RefundSummary;
  filters: RefundFilters;
}) {
  const router = useRouter();

  const [search, setSearch] = React.useState(filters.search);

  const hasFilters =
    filters.search !== "" ||
    filters.status !== ALL ||
    filters.kind !== ALL ||
    filters.reason !== ALL;

  const buildHref = React.useCallback(
    (next: Partial<RefundFilters>) => {
      const merged = { ...filters, ...next };
      const params = new URLSearchParams();
      if (merged.search) params.set("q", merged.search);
      if (merged.status !== ALL) params.set("status", merged.status);
      if (merged.kind !== ALL) params.set("kind", merged.kind);
      if (merged.reason !== ALL) params.set("reason", merged.reason);
      if (merged.sort !== "oldest-open") params.set("sort", merged.sort);
      if (merged.page > 1) params.set("page", String(merged.page));

      const queryString = params.toString();
      return queryString ? `/refunds?${queryString}` : "/refunds";
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
    kind: ALL,
    reason: ALL,
    page: 1,
  });

  const rangeStart =
    requests.totalElements === 0 ? 0 : requests.page * requests.size + 1;
  const rangeEnd = Math.min(
    requests.page * requests.size + requests.content.length,
    requests.totalElements,
  );

  const tabs: { label: string; value: RefundStatus | typeof ALL }[] = [
    { label: "All", value: ALL },
    ...REFUND_STATUSES.map((status) => ({
      label: refundStatusLabels[status],
      value: status,
    })),
  ];

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Refunds &amp; cancellations
        </h1>
        <p className="text-sm text-muted-foreground">
          Money customers have asked to have back.{" "}
          <span className="tabular-nums">
            {requests.totalElements} {hasFilters ? "matching" : "total"}
          </span>
        </p>
      </div>

      <SampleDataNotice detail="The API has no refund resource at all — the nearest thing is POST /orders/{id}/cancel, which refuses a paid order with a 409 that says “refund required”. That 409 is this screen, and everything on it is a fixture." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          title="Open requests"
          value={String(summary.open)}
          icon={Inbox}
          tone="warning"
          note="Nobody has resolved these yet"
        />
        <Stat
          title={`Waiting over ${REFUND_SLA_DAYS} days`}
          value={String(summary.overdue)}
          icon={Hourglass}
          tone={summary.overdue > 0 ? "danger" : "success"}
          note={
            summary.overdue > 0
              ? "Past the service level — call these"
              : "Nothing is overdue"
          }
        />
        <Stat
          title="Open exposure"
          value={formatCurrency(summary.exposure)}
          icon={Scale}
          tone="info"
          note="If every open request were paid in full"
        />
        <Stat
          title="Refunded this month"
          value={formatCurrency(summary.refundedThisMonth)}
          icon={Receipt}
          tone="violet"
          note="Actually paid back in 30 days"
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
                            : toneFill[refundStatusTone[tab.value]],
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
                  placeholder="Search by reference, order no, customer or product…"
                  className="pr-8 pl-8"
                  aria-label="Search requests"
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
                      sort: (value as RefundSort) ?? "oldest-open",
                      page: 1,
                    }),
                  )
                }
                items={sortItems}
              >
                <SelectTrigger
                  className="w-full sm:w-48"
                  aria-label="Sort requests"
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
                value={filters.kind}
                onValueChange={(value) =>
                  router.push(
                    buildHref({ kind: (value as RefundKind) ?? ALL, page: 1 }),
                  )
                }
                items={kindItems}
              >
                <SelectTrigger aria-label="Filter by request type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {kindItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.reason}
                onValueChange={(value) =>
                  router.push(
                    buildHref({
                      reason: (value as RefundReason) ?? ALL,
                      page: 1,
                    }),
                  )
                }
                items={reasonItems}
              >
                <SelectTrigger aria-label="Filter by reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {reasonItems.map((item) => (
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
          {requests.content.length === 0 ? (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Undo2 />
                </EmptyMedia>
                <EmptyTitle>
                  {hasFilters
                    ? "No requests match your filters"
                    : "Nothing to refund"}
                </EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? "Try a different reason or status, or clear the filters."
                    : "Refund and cancellation requests will land here."}
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
                  <TableHead className="pl-4">Request</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Customer
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.content.map((request) => {
                  const age = daysOpen(request, SAMPLE_TODAY);
                  const overdue = age !== null && age > REFUND_SLA_DAYS;

                  return (
                    <TableRow key={request.id}>
                      <TableCell className="pl-4">
                        <Link
                          href={`/refunds/${request.id}`}
                          className="font-medium tabular-nums hover:underline"
                        >
                          {request.refNo}
                        </Link>
                        <div className="text-xs whitespace-nowrap text-muted-foreground">
                          {formatDateTime(request.requestedAt)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Link
                          href={`/orders/${request.orderId}`}
                          className="tabular-nums hover:underline"
                        >
                          {request.orderNo}
                        </Link>
                        <div className="text-xs whitespace-nowrap text-muted-foreground">
                          <RefundKindMark kind={request.kind} />
                        </div>
                      </TableCell>

                      <TableCell className="hidden lg:table-cell">
                        <Link
                          href={`/users/${request.customerId}`}
                          className="block max-w-[11rem] truncate hover:underline"
                        >
                          {request.customerName}
                        </Link>
                        <div className="text-xs tabular-nums text-muted-foreground">
                          {request.customerPhone}
                        </div>
                      </TableCell>

                      <TableCell className="hidden xl:table-cell">
                        <RefundReasonMark reason={request.reason} />
                        <div className="text-xs text-muted-foreground">
                          {isPartial(request) ? "Part of the order · " : null}
                          {unitCount(request)} units
                        </div>
                      </TableCell>

                      <TableCell className="text-right whitespace-nowrap">
                        <span className="font-medium tabular-nums">
                          {formatCurrency(request.requestedAmount)}
                        </span>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          of {formatCurrency(request.orderTotal)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <RefundStatusBadge status={request.status} />
                        {/*
                          Age is this screen's alarm. It only shows while a
                          request is open — "11 days" beside "Refunded" would
                          read as a complaint about finished work.
                        */}
                        {age !== null ? (
                          <div
                            className={cn(
                              "mt-0.5 text-xs whitespace-nowrap tabular-nums",
                              overdue
                                ? "font-medium text-destructive"
                                : "text-muted-foreground",
                            )}
                          >
                            {age === 0
                              ? "Today"
                              : `${age} day${age === 1 ? "" : "s"} open`}
                          </div>
                        ) : null}
                      </TableCell>

                      <TableCell className="pr-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={`Actions for ${request.refNo}`}
                              />
                            }
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              render={<Link href={`/refunds/${request.id}`} />}
                            >
                              <Eye /> Review request
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              render={<Link href={`/orders/${request.orderId}`} />}
                            >
                              <Receipt /> Open the order
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => copy(request.refNo, "reference")}
                            >
                              <Copy /> Copy reference
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

        {requests.totalElements > 0 ? (
          <CardFooter className="flex flex-col gap-3 border-t py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm tabular-nums text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {requests.totalElements}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={requests.first}
                render={
                  requests.first ? (
                    <span />
                  ) : (
                    <Link href={buildHref({ page: filters.page - 1 })} />
                  )
                }
              >
                <ChevronLeft /> <span className="hidden sm:inline">Previous</span>
              </Button>
              <span className="px-2 text-sm tabular-nums text-muted-foreground">
                {requests.page + 1} / {Math.max(1, requests.totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={requests.last}
                render={
                  requests.last ? (
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
