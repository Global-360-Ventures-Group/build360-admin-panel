/**
 * The marks a customer row is read by.
 *
 * Shared by the list and the detail screen so an account cannot be green in
 * one place and grey in the other. No `"use client"` — there is no state here,
 * so each caller decides which bundle it lands in.
 */

import {
  Ban,
  BadgeCheck,
  Building2,
  CircleCheck,
  Moon,
  ShieldAlert,
  User,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { toneSurface } from "@/lib/tone";
import { cn, getInitials } from "@/lib/utils";

import {
  customerStatusHints,
  customerStatusLabels,
  customerStatusTone,
  customerTypeLabels,
  isTradeAccount,
  type CustomerStatus,
  type CustomerType,
} from "./types";

const statusIcons: Record<CustomerStatus, LucideIcon> = {
  ACTIVE: CircleCheck,
  DORMANT: Moon,
  BLOCKED: Ban,
};

export function CustomerStatusBadge({
  status,
  className,
}: {
  status: CustomerStatus;
  className?: string;
}) {
  const Icon = statusIcons[status];

  return (
    <Badge
      variant="secondary"
      // A native title: the tooltip primitive in this codebase wedges the
      // renderer, and the hint is a nicety rather than the only copy.
      title={customerStatusHints[status]}
      className={cn(
        "gap-1 ring-1 ring-inset",
        toneSurface[customerStatusTone[status]],
        className,
      )}
    >
      <Icon />
      {customerStatusLabels[status]}
    </Badge>
  );
}

/**
 * The trade, with a mark that separates personal from everything else.
 *
 * Quiet by design: the trade is context for how someone buys, not a status.
 */
export function CustomerTypeMark({
  type,
  className,
}: {
  type: CustomerType;
  className?: string;
}) {
  const Icon = isTradeAccount(type) ? Building2 : User;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      {customerTypeLabels[type]}
    </span>
  );
}

/**
 * Whether the phone behind the account was proved by OTP.
 *
 * Unverified is the one worth showing loudly: it is the reason a delivery gets
 * confirmed by a phone call instead of dispatched. Verified stays quiet, so
 * the list is not a wall of green ticks.
 */
export function VerifiedMark({
  verified,
  className,
}: {
  verified: boolean;
  className?: string;
}) {
  return verified ? (
    <span
      title="Phone verified by OTP"
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <BadgeCheck className="size-3.5 shrink-0" />
      Verified
    </span>
  ) : (
    <span
      title="Phone never verified — confirm by call before dispatch"
      className={cn(
        "inline-flex items-center gap-1 text-xs text-warning",
        className,
      )}
    >
      <ShieldAlert className="size-3.5 shrink-0" />
      Unverified
    </span>
  );
}

/** The circle of initials that stands in for a customer photo. */
export function CustomerAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}
