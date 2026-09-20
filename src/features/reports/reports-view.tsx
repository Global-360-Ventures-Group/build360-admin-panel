"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Receipt,
  ShoppingCart,
  Undo2,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { SampleDataNotice } from "@/components/sample-data-notice";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatusBadge } from "@/features/orders/order-badges";
import { orderStatusLabels, orderStatusTone } from "@/features/orders/types";
import { toneSurface, toneText, type Tone } from "@/lib/tone";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

import { BarList, ChartCard, RevenueAreaChart, ShareBar } from "./charts";
import {
  REPORT_RANGES,
  compactCurrency,
  percentChange,
  reportRangeLabels,
  type Kpi,
  type ReportData,
  type ReportRange,
} from "./types";

/* Header row shared by the table views: quiet, small, and not hoverable. */
const headRow =
  "hover:bg-transparent [&>th]:h-9 [&>th]:text-xs [&>th]:font-medium [&>th]:text-muted-foreground";

/**
 * The reports screen.
 *
 * Every figure is summed from the same fixtures the other screens page
 * through, so the numbers here and the numbers there always agree — see
 * `./sample-data`.
 *
 * The chart decisions worth not undoing:
 *
 * - **One filter row, above everything.** The range scopes every tile, chart
 *   and table on the page, so the figures can never disagree with each other.
 * - **No dual axis.** Revenue and order count are different scales; plotting
 *   both against two y-axes would invent a correlation. Count lives in the
 *   tooltip and its own tile.
 * - **Every chart has a table view**, reachable from its own header. The
 *   theme's palette note requires it for the amber slot, and it is the right
 *   default for all of them.
 * - **One series, one colour.** Bars are not shaded darker-where-bigger; that
 *   would double-encode length as hue. The only coloured-by-meaning list is
 *   order status, which uses the reserved status tones.
 */
export function ReportsView({
  report,
  range,
}: {
  report: ReportData;
  range: ReportRange;
}) {
  const categoryTotal = report.byCategory.reduce(
    (total, slice) => total + slice.value,
    0,
  );

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(report.from)} – {formatDate(report.to)}
          {report.comparedWith ? (
            <>
              {" "}
              · compared with {formatDate(report.comparedWith.from)} –{" "}
              {formatDate(report.comparedWith.to)}
            </>
          ) : null}
        </p>
      </div>

      <SampleDataNotice detail="The API has no analytics endpoints at all. Unlike the other sample screens this one invents nothing — every figure is summed from the same order, refund and stock fixtures the rest of the panel reads, so the numbers agree. It inherits their horizon too: about four weeks of trading." />

      {/*
        One filter row, above everything it scopes. Presets rather than a
        calendar: nobody fights a date grid for "last 14 days".
      */}
      <nav
        aria-label="Report period"
        className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5"
      >
        {REPORT_RANGES.map((option) => {
          const active = option === range;

          return (
            <Link
              key={option}
              href={option === "14d" ? "/reports" : `/reports?range=${option}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {reportRangeLabels[option]}
            </Link>
          );
        })}
      </nav>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          title="Revenue"
          kpi={report.revenue}
          format={formatCurrency}
          icon={Wallet}
          tone="success"
          note="Cancelled orders excluded"
        />
        <Stat
          title="Orders"
          kpi={report.orders}
          format={(value) => String(value)}
          icon={ShoppingCart}
          tone="info"
          note="Every order placed, cancelled or not"
        />
        <Stat
          title="Average order"
          kpi={report.averageOrderValue}
          format={formatCurrency}
          icon={Receipt}
          tone="violet"
          note="Revenue over selling orders"
        />
        <Stat
          title="Refunded"
          kpi={report.refunded}
          format={formatCurrency}
          icon={Undo2}
          // Up is bad here, so the delta's colour has to invert.
          upIsGood={false}
          tone="warning"
          note="Paid back in the period"
        />
      </div>

      <ChartCard
        title="Revenue per day"
        description="Order value on the day it was placed, cancelled orders excluded."
        table={
          <Table>
            <TableHeader>
              <TableRow className={headRow}>
                <TableHead>Day</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.daily.map((point) => (
                <TableRow key={point.date}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(point.date)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {point.orders}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(point.revenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }
      >
        <RevenueAreaChart points={report.daily} />
      </ChartCard>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Revenue by category"
          description={`Priced at line value, so these sum to ${compactCurrency(categoryTotal)} of goods rather than to revenue — a voucher discounts the order, not a category.`}
          table={
            <Table>
              <TableHeader>
                <TableRow className={headRow}>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Goods value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.byCategory.map((slice) => (
                  <TableRow key={slice.key}>
                    <TableCell>{slice.label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {slice.count}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(slice.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        >
          <BarList
            rows={report.byCategory.map((slice) => ({
              key: slice.key,
              label: slice.label,
              value: slice.value,
              note: `${slice.count} ${slice.count === 1 ? "order" : "orders"}`,
            }))}
            format={compactCurrency}
          />
        </ChartCard>

        <ChartCard
          title="Orders by status"
          description="Where every order in the period currently sits."
          table={
            <Table>
              <TableHeader>
                <TableRow className={headRow}>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.byStatus.map((slice) => (
                  <TableRow key={slice.status}>
                    <TableCell>
                      <OrderStatusBadge status={slice.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {slice.count}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(slice.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        >
          {/*
            The one list coloured by meaning rather than by a single hue:
            these are the reserved status tones, and every bar is labelled, so
            the colour is a reinforcement and never the only channel.
          */}
          <BarList
            rows={report.byStatus.map((slice) => ({
              key: slice.status,
              label: orderStatusLabels[slice.status],
              value: slice.count,
              note: compactCurrency(slice.value),
              color: statusColor(orderStatusTone[slice.status]),
            }))}
            format={(value) => String(value)}
          />
        </ChartCard>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <ChartCard
          title="How customers paid"
          description="Share of revenue by payment method."
          table={
            <Table>
              <TableHeader>
                <TableRow className={headRow}>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.byPayment.map((slice) => (
                  <TableRow key={slice.label}>
                    <TableCell>{slice.label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {slice.count}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(slice.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        >
          <ShareBar
            segments={report.byPayment.map((slice, index) => ({
              key: slice.label,
              label: slice.label,
              value: slice.value,
              // Fixed order, assigned once: the palette follows the method,
              // never its current rank in a filtered view.
              slot: index + 1,
            }))}
            format={formatCurrency}
          />
        </ChartCard>

        <ChartCard
          title="Where it went"
          description="Revenue by the division the order shipped to."
          table={
            <Table>
              <TableHeader>
                <TableRow className={headRow}>
                  <TableHead>Division</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.byDivision.map((slice) => (
                  <TableRow key={slice.key}>
                    <TableCell>{slice.label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {slice.count}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(slice.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          }
        >
          <BarList
            rows={report.byDivision.map((slice) => ({
              key: slice.key,
              label: slice.label,
              value: slice.value,
              note: `${slice.count} ${slice.count === 1 ? "order" : "orders"}`,
            }))}
            format={compactCurrency}
          />
        </ChartCard>
      </div>

      {/*
        A table, not a chart: eight products with four measures each is a grid
        of numbers, and the join to stock is the point — "we sold sixty and
        have four left" is the thing neither screen says on its own.
      */}
      <Card className="min-w-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>Best sellers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className={headRow}>
                <TableHead className="pl-4">Product</TableHead>
                <TableHead className="text-right">Units sold</TableHead>
                <TableHead className="text-right">Goods value</TableHead>
                <TableHead className="pr-4 text-right">Free to sell</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.topProducts.map((product) => (
                <TableRow key={product.productId}>
                  <TableCell className="pl-4">
                    <span className="block max-w-[22rem] truncate font-medium">
                      {product.name}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {product.sku}
                    </span>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">
                    {product.units}
                    <span className="ml-1 text-xs text-muted-foreground">
                      {product.unit}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">
                    {formatCurrency(product.revenue)}
                  </TableCell>
                  <TableCell className="pr-4 text-right whitespace-nowrap tabular-nums">
                    {product.available === null ? (
                      <span className="text-muted-foreground">Not tracked</span>
                    ) : product.inventoryId ? (
                      <Link
                        href={`/inventory/${product.inventoryId}`}
                        className={cn(
                          "hover:underline",
                          product.available <= 0 && toneText.danger,
                        )}
                      >
                        {product.available}
                        <span className="ml-1 text-xs text-muted-foreground">
                          {product.unit}
                        </span>
                      </Link>
                    ) : (
                      product.available
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

/** The solid fill behind a status bar, from the shared tone palette. */
function statusColor(tone: Tone): string {
  const byTone: Record<Tone, string> = {
    neutral: "var(--muted-foreground)",
    info: "var(--chart-2)",
    violet: "var(--chart-5)",
    teal: "var(--chart-3)",
    success: "var(--success)",
    warning: "var(--warning)",
    danger: "var(--destructive)",
  };

  return byTone[tone];
}

/**
 * One headline figure, with its change against the previous period.
 *
 * The delta is dropped rather than faked when there is nothing to compare
 * against — the fixture only holds four weeks, so the longer ranges genuinely
 * have no prior period, and a made-up percentage is how a dashboard starts
 * lying. Direction and goodness are separate: refunds going up is not good
 * news in green.
 */
function Stat({
  title,
  kpi,
  format,
  icon: Icon,
  tone,
  note,
  upIsGood = true,
}: {
  title: string;
  kpi: Kpi;
  format: (value: number) => string;
  icon: LucideIcon;
  tone: Tone;
  note: string;
  upIsGood?: boolean;
}) {
  const change = percentChange(kpi);
  const flat = change === 0;
  const up = change !== null && change > 0;
  const good = up === upIsGood;

  const DeltaIcon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;

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
            {/* Proportional figures, not tabular: at this size equal-width
                digits make a number like 121 look loose. */}
            <p className="mt-0.5 truncate text-xl font-semibold tracking-tight">
              {format(kpi.value)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {change === null ? (
            <span className="truncate text-muted-foreground">{note}</span>
          ) : (
            <>
              <span
                className={cn(
                  "flex items-center gap-0.5 font-medium tabular-nums",
                  flat
                    ? "text-muted-foreground"
                    : good
                      ? toneText.success
                      : toneText.danger,
                )}
              >
                <DeltaIcon className="size-3" />
                {Math.abs(change)}%
              </span>
              <span className="truncate text-muted-foreground">
                vs previous period
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
