/**
 * The marks a stock line is read by.
 *
 * Shared by the list and the detail screen. No `"use client"` — there is no
 * state here, so each caller decides which bundle it lands in.
 */

import {
  CircleCheck,
  CircleSlash,
  PackageX,
  TrendingDown,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { toneFill, toneSurface } from "@/lib/tone";
import { cn } from "@/lib/utils";

import {
  availableStock,
  mismatchHints,
  mismatchLabels,
  statusMismatch,
  stockPercent,
  stockStatus,
  stockStatusHints,
  stockStatusLabels,
  stockStatusTone,
  type InventoryItem,
  type StockStatus,
} from "./types";

/**
 * Icons, not decoration.
 *
 * `globals.css` validates the status hues for marks rather than body text, so
 * every pill carries a glyph *and* its word.
 */
export const stockStatusIcons: Record<StockStatus, LucideIcon> = {
  IN_STOCK: CircleCheck,
  LOW: TrendingDown,
  OUT_OF_STOCK: PackageX,
  DISCONTINUED: CircleSlash,
};

export function StockStatusBadge({
  item,
  className,
}: {
  item: InventoryItem;
  className?: string;
}) {
  const status = stockStatus(item);
  const Icon = stockStatusIcons[status];

  return (
    <Badge
      variant="secondary"
      // A native title: the tooltip primitive in this codebase wedges the
      // renderer, and the hint is a nicety rather than the only copy.
      title={stockStatusHints[status]}
      className={cn(
        "gap-1 ring-1 ring-inset",
        toneSurface[stockStatusTone[status]],
        className,
      )}
    >
      <Icon />
      {stockStatusLabels[status]}
    </Badge>
  );
}

/**
 * The warning this whole screen exists for.
 *
 * Renders nothing when the counted stock and the storefront agree, which is
 * the normal case — see `statusMismatch`.
 */
export function MismatchBadge({
  item,
  className,
}: {
  item: InventoryItem;
  className?: string;
}) {
  const mismatch = statusMismatch(item);
  if (!mismatch) return null;

  return (
    <Badge
      variant="secondary"
      title={mismatchHints[mismatch]}
      className={cn(
        "gap-1 ring-1 ring-inset",
        // Overselling takes money for goods that do not exist; hidden stock
        // only loses a sale. The first is the louder problem.
        mismatch === "OVERSELLING" ? toneSurface.danger : toneSurface.warning,
        className,
      )}
    >
      <TriangleAlert />
      {mismatchLabels[mismatch]}
    </Badge>
  );
}

/**
 * How much is free to sell, over a bar that reads against the reorder point.
 *
 * The bar is full at twice the reorder point, so "half empty" is exactly the
 * level at which a buyer should act — that is the only threshold on this
 * screen that means anything, so it is the one the geometry encodes.
 */
export function StockBar({
  item,
  className,
}: {
  item: InventoryItem;
  className?: string;
}) {
  const available = availableStock(item);
  const percent = stockPercent(item);
  const tone = stockStatusTone[stockStatus(item)];

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-end gap-1 tabular-nums">
        <span className="font-medium">{available}</span>
        <span className="text-xs text-muted-foreground">{item.unit}</span>
      </div>
      <div
        className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${available} free to sell, reorder at ${item.reorderPoint}`}
      >
        <div
          className={cn("h-full rounded-full", toneFill[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
