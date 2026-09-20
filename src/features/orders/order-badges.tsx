/**
 * The three pills an order is read by: where it is, whether it is paid, and
 * how it gets there.
 *
 * Shared by the list and the detail screen so a status can never be amber in
 * one place and blue in the other. No `"use client"` — there is no state here,
 * so each caller decides which bundle it lands in.
 */

import {
  Ban,
  CircleCheck,
  CircleCheckBig,
  Clock,
  MapPin,
  Package,
  Truck,
  Undo2,
  Zap,
  type LucideIcon,
} from "lucide-react";

import {
  deliveryMethodCodeLabels,
  type DeliveryMethodCode,
} from "@/features/delivery/methods/types";
import { Badge } from "@/components/ui/badge";
import { toneSurface } from "@/lib/tone";
import { cn } from "@/lib/utils";

import {
  orderStatusHints,
  orderStatusLabels,
  orderStatusTone,
  paymentStatusLabels,
  paymentStatusTone,
  type OrderStatus,
  type PaymentStatus,
} from "./types";

/**
 * Icons, not decoration.
 *
 * `globals.css` validates the chart hues at ≥3:1 — enough for a mark, under
 * the 4.5:1 body-text floor. Every pill therefore carries a glyph *and* its
 * word, so the status survives both a colour-blind reader and a glance.
 */
export const orderStatusIcons: Record<OrderStatus, LucideIcon> = {
  PENDING: Clock,
  CONFIRMED: CircleCheck,
  PROCESSING: Package,
  SHIPPED: Truck,
  DELIVERED: CircleCheckBig,
  CANCELLED: Ban,
  RETURNED: Undo2,
};

export const deliveryMethodIcons: Record<DeliveryMethodCode, LucideIcon> = {
  STANDARD: Truck,
  EXPRESS: Zap,
  CLICK_AND_COLLECT: MapPin,
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const Icon = orderStatusIcons[status];

  return (
    <Badge
      variant="secondary"
      // A native title: the tooltip primitive in this codebase wedges the
      // renderer, and the hint is a nicety rather than the only copy.
      title={orderStatusHints[status]}
      className={cn(
        "gap-1 ring-1 ring-inset",
        toneSurface[orderStatusTone[status]],
        className,
      )}
    >
      <Icon />
      {orderStatusLabels[status]}
    </Badge>
  );
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "ring-1 ring-inset",
        toneSurface[paymentStatusTone[status]],
        className,
      )}
    >
      {paymentStatusLabels[status]}
    </Badge>
  );
}

/** Quiet by design — the method is context, not status. */
export function DeliveryMethodBadge({
  code,
  className,
}: {
  code: DeliveryMethodCode;
  className?: string;
}) {
  const Icon = deliveryMethodIcons[code];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm whitespace-nowrap",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      {deliveryMethodCodeLabels[code]}
    </span>
  );
}
