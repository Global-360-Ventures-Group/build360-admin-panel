/**
 * The marks a refund request is read by.
 *
 * Shared by the list and the detail screen. No `"use client"` — there is no
 * state here, so each caller decides which bundle it lands in.
 */

import {
  CircleCheck,
  CircleDollarSign,
  CircleSlash,
  Eye,
  Inbox,
  PackageX,
  Undo2,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { toneSurface } from "@/lib/tone";
import { cn } from "@/lib/utils";

import {
  refundKindHints,
  refundKindLabels,
  refundReasonFault,
  refundReasonLabels,
  refundStatusHints,
  refundStatusLabels,
  refundStatusTone,
  type RefundKind,
  type RefundReason,
  type RefundStatus,
} from "./types";

/**
 * Icons, not decoration.
 *
 * `globals.css` validates the chart hues at ≥3:1 — enough for a mark, under
 * the 4.5:1 body-text floor. Every pill therefore carries a glyph *and* its
 * word, so the status survives both a colour-blind reader and a glance.
 */
export const refundStatusIcons: Record<RefundStatus, LucideIcon> = {
  PENDING: Inbox,
  UNDER_REVIEW: Eye,
  APPROVED: CircleCheck,
  REFUNDED: CircleDollarSign,
  REJECTED: CircleSlash,
};

const kindIcons: Record<RefundKind, LucideIcon> = {
  CANCELLATION: PackageX,
  REFUND: Undo2,
};

export function RefundStatusBadge({
  status,
  className,
}: {
  status: RefundStatus;
  className?: string;
}) {
  const Icon = refundStatusIcons[status];

  return (
    <Badge
      variant="secondary"
      // A native title: the tooltip primitive in this codebase wedges the
      // renderer, and the hint is a nicety rather than the only copy.
      title={refundStatusHints[status]}
      className={cn(
        "gap-1 ring-1 ring-inset",
        toneSurface[refundStatusTone[status]],
        className,
      )}
    >
      <Icon />
      {refundStatusLabels[status]}
    </Badge>
  );
}

/** Quiet by design — what was asked for is context, not status. */
export function RefundKindMark({
  kind,
  className,
}: {
  kind: RefundKind;
  className?: string;
}) {
  const Icon = kindIcons[kind];

  return (
    <span
      title={refundKindHints[kind]}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      {refundKindLabels[kind]}
    </span>
  );
}

/**
 * The reason, coloured by whose mistake it was.
 *
 * Our own errors read amber because they are the ones that should be fixed
 * upstream; a change of mind is nobody's fault and stays neutral.
 */
export function RefundReasonMark({
  reason,
  className,
}: {
  reason: RefundReason;
  className?: string;
}) {
  const fault = refundReasonFault[reason];

  return (
    <span
      className={cn(
        "whitespace-nowrap",
        fault === "ours" ? "text-warning" : "text-foreground",
        className,
      )}
      title={
        fault === "ours"
          ? "Our error — worth checking against the warehouse"
          : fault === "theirs"
            ? "The customer's decision, not a fault"
            : "Neither side at fault"
      }
    >
      {refundReasonLabels[reason]}
    </span>
  );
}
