"use client";

import * as React from "react";
import { Table2, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn, formatCurrency, parseApiDateTime } from "@/lib/utils";

import { compactCurrency, niceScale, type DailyPoint } from "./types";

/* -------------------------------------------------------------------------- */
/* Shared chrome                                                              */
/* -------------------------------------------------------------------------- */

/**
 * A chart and its table view, in one card.
 *
 * Every chart on this page ships with the table: colour and geometry are the
 * fast channel, but they are never the *only* channel. The theme's own note on
 * `--chart-4` is explicit that a palette slot below 3:1 on white needs "direct
 * labels or a table view", and the toggle is how that promise is kept for a
 * keyboard, a screen reader, or anyone who just wants the number.
 */
export function ChartCard({
  title,
  description,
  table,
  children,
  className,
}: {
  title: string;
  description?: string;
  /** The same data as a real table. Required — never an optional extra. */
  table: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const [showTable, setShowTable] = React.useState(false);

  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTable((open) => !open)}
            aria-pressed={showTable}
          >
            {showTable ? <TrendingUp /> : <Table2 />}
            {showTable ? "Chart" : "Table"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="min-w-0">
        {showTable ? (
          <div className="-mx-1 overflow-x-auto px-1">{table}</div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

/**
 * The container's pixel width.
 *
 * Charts are drawn at real size rather than in a scaled viewBox: a viewBox
 * stretched to fit would scale the axis text with it, and 11px labels become
 * 20px on a wide screen. Renders nothing until measured, which is the same on
 * the server and the first client pass, so hydration matches.
 */
function useMeasuredWidth() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.round(measured));
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

/** "12 Sep" — short enough for an axis tick. */
function shortDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(parseApiDateTime(`${date}T12:00:00`));
}

/* -------------------------------------------------------------------------- */
/* Revenue over time                                                          */
/* -------------------------------------------------------------------------- */

const PLOT_HEIGHT = 200;
const PAD = { top: 16, right: 20, bottom: 26, left: 52 };

/**
 * Revenue per day.
 *
 * One series, so there is no legend — the card title says what is plotted, and
 * a legend box with a single swatch would only restate it. The reader gets the
 * shape from the area, the exact numbers from the crosshair, and every number
 * from the table view.
 *
 * Deliberately **not** a dual axis. Order count is the obvious second series
 * and it is a different scale entirely; plotting both against two y-axes
 * invents a correlation that is not in the data. The count lives in the
 * tooltip and in the KPI tile above instead.
 */
export function RevenueAreaChart({ points }: { points: DailyPoint[] }) {
  const [ref, width] = useMeasuredWidth();
  const [active, setActive] = React.useState<number | null>(null);

  const { max, step: tickStep, ticks } = niceScale(
    Math.max(1, ...points.map((point) => point.revenue)),
  );

  const height = PLOT_HEIGHT + PAD.top + PAD.bottom;
  const plotWidth = Math.max(0, width - PAD.left - PAD.right);

  // One x position per day, inset by half a step so the first and last points
  // are not painted on the axis itself.
  const step = points.length > 1 ? plotWidth / (points.length - 1) : 0;
  const xAt = (index: number) => PAD.left + index * step;
  const yAt = (value: number) =>
    PAD.top + PLOT_HEIGHT - (value / max) * PLOT_HEIGHT;

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${xAt(index)},${yAt(point.revenue)}`)
    .join(" ");
  const area =
    points.length > 0
      ? `${line} L${xAt(points.length - 1)},${yAt(0)} L${xAt(0)},${yAt(0)} Z`
      : "";

  const peakIndex = points.reduce(
    (best, point, index) =>
      point.revenue > points[best].revenue ? index : best,
    0,
  );
  const lastIndex = points.length - 1;

  // Labels are sparing on purpose: the peak and the final day, never a number
  // on every point. Dropped when they would sit on top of each other.
  const labelled = new Set<number>([lastIndex]);
  if (peakIndex !== lastIndex && Math.abs(peakIndex - lastIndex) > 1) {
    labelled.add(peakIndex);
  }

  // Roughly six x labels, whatever the window length.
  const tickEvery = Math.max(1, Math.ceil(points.length / 6));

  function pointerIndex(event: React.PointerEvent<SVGRectElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const offset = event.clientX - box.left;
    if (step === 0) return 0;

    return Math.max(
      0,
      Math.min(points.length - 1, Math.round(offset / step)),
    );
  }

  const activePoint = active === null ? null : points[active];

  return (
    <div ref={ref} className="relative min-w-0">
      {width === 0 ? (
        <div style={{ height }} aria-hidden />
      ) : (
        <>
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`Revenue per day from ${shortDate(points[0]?.date ?? "")} to ${shortDate(points[lastIndex]?.date ?? "")}. Use the table view for exact figures.`}
            className="overflow-visible"
          >
            {/* Gridlines: solid hairlines one step off the surface, never
                dashed — a dashed grid reads as a threshold. */}
            {Array.from({ length: ticks + 1 }, (_, tick) => {
              const value = tickStep * tick;
              const y = yAt(value);

              return (
                <g key={tick}>
                  <line
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={y}
                    y2={y}
                    className="stroke-border"
                    strokeWidth={1}
                  />
                  <text
                    x={PAD.left - 8}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="fill-muted-foreground text-[10px] tabular-nums"
                  >
                    {tick === 0 ? "0" : compactCurrency(value)}
                  </text>
                </g>
              );
            })}

            {/* The area is a wash, not a block: the hue at 10%. */}
            <path d={area} fill="var(--chart-1)" fillOpacity={0.1} />
            <path
              d={line}
              fill="none"
              stroke="var(--chart-1)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {points.map((point, index) =>
              index % tickEvery === 0 || index === lastIndex ? (
                <text
                  key={point.date}
                  x={xAt(index)}
                  y={height - 8}
                  textAnchor={
                    index === 0 ? "start" : index === lastIndex ? "end" : "middle"
                  }
                  className="fill-muted-foreground text-[10px]"
                >
                  {shortDate(point.date)}
                </text>
              ) : null,
            )}

            {[...labelled].map((index) => (
              <text
                key={`label-${index}`}
                x={xAt(index)}
                y={yAt(points[index].revenue) - 12}
                textAnchor={index === lastIndex ? "end" : "middle"}
                className="fill-foreground text-[11px] font-medium tabular-nums"
              >
                {compactCurrency(points[index].revenue)}
              </text>
            ))}

            {/* The end marker carries a 2px surface ring so it stays legible
                where it crosses the line. */}
            {points.length > 0 ? (
              <circle
                cx={xAt(lastIndex)}
                cy={yAt(points[lastIndex].revenue)}
                r={4}
                fill="var(--chart-1)"
                className="stroke-card"
                strokeWidth={2}
              />
            ) : null}

            {active !== null && activePoint ? (
              <g>
                <line
                  x1={xAt(active)}
                  x2={xAt(active)}
                  y1={PAD.top}
                  y2={PAD.top + PLOT_HEIGHT}
                  className="stroke-foreground/25"
                  strokeWidth={1}
                />
                <circle
                  cx={xAt(active)}
                  cy={yAt(activePoint.revenue)}
                  r={4}
                  fill="var(--chart-1)"
                  className="stroke-card"
                  strokeWidth={2}
                />
              </g>
            ) : null}

            {/* One wide hit area rather than per-point targets: the reader
                aims at a date, never at a 2px line. */}
            <rect
              x={PAD.left - step / 2}
              y={PAD.top}
              width={plotWidth + step}
              height={PLOT_HEIGHT}
              fill="transparent"
              onPointerMove={(event) => setActive(pointerIndex(event))}
              onPointerLeave={() => setActive(null)}
            />
          </svg>

          {/* Keyboard reaches the same readout as the pointer. */}
          <div
            tabIndex={0}
            role="slider"
            aria-label="Inspect a day"
            aria-valuemin={0}
            aria-valuemax={Math.max(0, lastIndex)}
            aria-valuenow={active ?? 0}
            aria-valuetext={
              activePoint
                ? `${shortDate(activePoint.date)}: ${formatCurrency(activePoint.revenue)}`
                : "No day selected"
            }
            onFocus={() => setActive((current) => current ?? lastIndex)}
            onBlur={() => setActive(null)}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                setActive((current) => {
                  const next = (current ?? lastIndex) +
                    (event.key === "ArrowLeft" ? -1 : 1);
                  return Math.max(0, Math.min(lastIndex, next));
                });
              }
            }}
            className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:inset-x-0 focus-visible:bottom-0 focus-visible:rounded-md focus-visible:bg-muted focus-visible:px-2 focus-visible:py-1 focus-visible:text-xs"
          >
            {activePoint
              ? `${shortDate(activePoint.date)}: ${formatCurrency(activePoint.revenue)}, ${activePoint.orders} orders`
              : "Arrow keys inspect each day"}
          </div>

          {active !== null && activePoint ? (
            <div
              role="status"
              className="pointer-events-none absolute top-0 z-10 w-max -translate-x-1/2 rounded-lg bg-popover p-2 text-xs shadow-md ring-1 ring-foreground/10"
              style={{
                left: Math.min(
                  Math.max(xAt(active), 70),
                  Math.max(70, width - 70),
                ),
              }}
            >
              <p className="font-medium">{shortDate(activePoint.date)}</p>
              {/* Values lead, labels follow — the reader has the date and
                  wants the number. */}
              <p className="mt-1 flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-0.5 w-3 shrink-0 rounded-full"
                  style={{ background: "var(--chart-1)" }}
                />
                <span className="font-medium tabular-nums">
                  {formatCurrency(activePoint.revenue)}
                </span>
                <span className="text-muted-foreground">revenue</span>
              </p>
              <p className="text-muted-foreground tabular-nums">
                {activePoint.orders}{" "}
                {activePoint.orders === 1 ? "order" : "orders"}
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Bar list                                                                   */
/* -------------------------------------------------------------------------- */

export type BarRow = {
  key: string;
  label: string;
  value: number;
  /** Shown under the label; the count behind the magnitude. */
  note?: string;
  /** Overrides the single-hue default. Only for rows that carry *state*. */
  color?: string;
  href?: string;
};

/**
 * A ranked bar list.
 *
 * Plain HTML, not SVG: a horizontal bar is a box of a given width, and drawing
 * it in SVG would only make the text harder to size.
 *
 * **One series, one colour.** Shading each bar darker-where-bigger would
 * double-encode length as hue and burn the only free channel on information
 * the bar already shows. The exception is a row whose colour *means* something
 * — order status — which passes its own token in.
 */
export function BarList({
  rows,
  format,
  max: providedMax,
}: {
  rows: BarRow[];
  format: (value: number) => string;
  /** Share a scale across lists that should be comparable. */
  max?: number;
}) {
  const max = providedMax ?? Math.max(1, ...rows.map((row) => row.value));

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.key} className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm">{row.label}</span>
            {/* Bars carry their value at the tip — on a ranked list that is
                the axis, which is why there is no axis. */}
            <span className="shrink-0 text-sm font-medium tabular-nums">
              {format(row.value)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-[4px] bg-muted">
              <div
                className="h-full rounded-r-[4px]"
                style={{
                  width: `${Math.max(1, (row.value / max) * 100)}%`,
                  background: row.color ?? "var(--chart-1)",
                }}
              />
            </div>
            {row.note ? (
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {row.note}
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Share bar                                                                  */
/* -------------------------------------------------------------------------- */

export type ShareSegment = {
  key: string;
  label: string;
  value: number;
  /** Slot index into the categorical palette, 1-5, assigned in fixed order. */
  slot: number;
};

/**
 * One stacked bar for a part-to-whole split, with its legend.
 *
 * Segments are separated by a 2px gap in the surface colour rather than by a
 * border — a stroke around a mark is data-weight ink doing a spacer's job.
 *
 * Palette slots are assigned by the **entity**, in a fixed order decided
 * before render, so filtering the data never repaints the survivors. A reader
 * who learned that bKash is blue keeps that.
 */
export function ShareBar({
  segments,
  format,
}: {
  segments: ShareSegment[];
  format: (value: number) => string;
}) {
  const total = Math.max(
    1,
    segments.reduce((sum, segment) => sum + segment.value, 0),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden">
        {segments.map((segment) => (
          <div
            key={segment.key}
            title={`${segment.label}: ${format(segment.value)}`}
            className="h-full first:rounded-l-[4px] last:rounded-r-[4px]"
            style={{
              width: `${(segment.value / total) * 100}%`,
              background: `var(--chart-${segment.slot})`,
            }}
          />
        ))}
      </div>

      {/* The legend is always present: identity must never be colour alone. */}
      <ul className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
        {segments.map((segment) => (
          <li key={segment.key} className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ background: `var(--chart-${segment.slot})` }}
            />
            <span className="min-w-0 flex-1 truncate text-sm">
              {segment.label}
            </span>
            <span className="shrink-0 text-sm font-medium tabular-nums">
              {Math.round((segment.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
