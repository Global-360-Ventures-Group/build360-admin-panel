/**
 * The marks a coupon is read by.
 *
 * Shared by the list and the detail screen. No `"use client"` — there is no
 * state here, so each caller decides which bundle it lands in.
 */

import {
  CalendarClock,
  CircleCheck,
  CircleSlash,
  Gift,
  Globe,
  Infinity as InfinityIcon,
  Pause,
  Percent,
  Tag,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { toneFill, toneSurface } from "@/lib/tone";
import { cn } from "@/lib/utils";

import {
  audienceHints,
  audienceLabels,
  couponStatusHints,
  couponStatusLabels,
  couponStatusTone,
  discountLabel,
  discountTypeLabels,
  usagePercent,
  type Audience,
  type Coupon,
  type CouponStatus,
  type DiscountType,
} from "./types";

/**
 * Icons, not decoration.
 *
 * `globals.css` validates the status hues for marks rather than body text, so
 * every pill carries a glyph *and* its word.
 */
export const couponStatusIcons: Record<CouponStatus, LucideIcon> = {
  SCHEDULED: CalendarClock,
  ACTIVE: CircleCheck,
  PAUSED: Pause,
  EXPIRED: CircleSlash,
  EXHAUSTED: Gift,
};

const discountIcons: Record<DiscountType, LucideIcon> = {
  PERCENTAGE: Percent,
  FIXED_AMOUNT: Tag,
  FREE_DELIVERY: Truck,
};

const audienceIcons: Record<Audience, LucideIcon> = {
  PUBLIC: Globe,
  TARGETED: Users,
};

export function CouponStatusBadge({
  status,
  className,
}: {
  status: CouponStatus;
  className?: string;
}) {
  const Icon = couponStatusIcons[status];

  return (
    <Badge
      variant="secondary"
      // A native title: the tooltip primitive in this codebase wedges the
      // renderer, and the hint is a nicety rather than the only copy.
      title={couponStatusHints[status]}
      className={cn(
        "gap-1 ring-1 ring-inset",
        toneSurface[couponStatusTone[status]],
        className,
      )}
    >
      <Icon />
      {couponStatusLabels[status]}
    </Badge>
  );
}

/** The rule in three words or fewer, with the glyph for its kind. */
export function DiscountMark({
  coupon,
  className,
}: {
  coupon: Coupon;
  className?: string;
}) {
  const Icon = discountIcons[coupon.discountType];

  return (
    <span
      title={discountTypeLabels[coupon.discountType]}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium whitespace-nowrap",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      {discountLabel(coupon)}
    </span>
  );
}

/** Quiet by design — who can use it is context, not status. */
export function AudienceMark({
  audience,
  issuedTo,
  className,
}: {
  audience: Audience;
  /** For `TARGETED`, how many customers hold it. */
  issuedTo?: number | null;
  className?: string;
}) {
  const Icon = audienceIcons[audience];

  return (
    <span
      title={audienceHints[audience]}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      {audienceLabels[audience]}
      {audience === "TARGETED" && issuedTo != null ? (
        <span className="text-muted-foreground tabular-nums">· {issuedTo}</span>
      ) : null}
    </span>
  );
}

/**
 * Redemptions against the cap, as a number over a bar.
 *
 * An unlimited coupon gets the infinity glyph rather than a full bar: a bar
 * implies a ceiling, and inventing one would misread as "nearly used up" to
 * anyone scanning the column.
 */
export function UsageMeter({
  coupon,
  className,
}: {
  coupon: Coupon;
  className?: string;
}) {
  const percent = usagePercent(coupon);

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-baseline justify-end gap-1 tabular-nums">
        <span className="font-medium">{coupon.usageCount}</span>
        <span className="text-xs text-muted-foreground">
          {coupon.usageLimit === null ? (
            <InfinityIcon className="inline size-3" aria-label="no limit" />
          ) : (
            `/ ${coupon.usageLimit}`
          )}
        </span>
      </div>
      {percent === null ? (
        <div className="mt-1 h-1 w-full rounded-full bg-muted" />
      ) : (
        <div
          className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`${coupon.usageCount} of ${coupon.usageLimit} redeemed`}
        >
          <div
            className={cn(
              "h-full rounded-full",
              // Full is not a failure — it is a campaign that worked — so it
              // reads as the "used up" violet rather than as an alarm.
              percent >= 100 ? toneFill.violet : toneFill.info,
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}
