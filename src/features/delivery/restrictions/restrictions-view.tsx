"use client";

import * as React from "react";
import { CalendarOff, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { DeliveryMethod } from "../methods/types";
import { formatIsoDate, todayIso } from "../shared";
import type { DeliverySlot } from "../slots/types";
import { deleteRestrictionAction } from "./actions";
import { DeleteRestrictionDialog } from "./delete-restriction-dialog";
import { RestrictionFormDialog } from "./restriction-form-dialog";
import {
  restrictionPhase,
  restrictionTypeLabels,
  type DeliveryRestriction,
} from "./types";

/**
 * The delivery blocks.
 *
 * Two fields here read backwards from everything else in the panel, so neither
 * is ever rendered as a blank: no delivery method means **every** method, and
 * no time slots means the **whole day**. A "—" in either column would say the
 * opposite of what the API does.
 *
 * There is no edit action because the API has no PUT for a restriction. The
 * only change is remove-and-re-add, which the create dialog says up front.
 */
export function RestrictionsView({
  restrictions,
  methods,
  slots,
  canManage,
}: {
  restrictions: DeliveryRestriction[];
  methods: DeliveryMethod[];
  slots: DeliverySlot[];
  /** `DELIVERY_CALENDAR_MANAGE` — the calendar grant, not the config one. */
  canManage: boolean;
}) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();
  const [formOpen, setFormOpen] = React.useState(false);
  const [removing, setRemoving] = React.useState<DeliveryRestriction | null>(
    null,
  );

  // Captured once per render rather than per row: a list re-rendering across
  // midnight should not label two rows by two different "todays".
  const today = todayIso();

  const methodNames = React.useMemo(() => {
    const byId = new Map<string, string>();
    for (const method of methods) byId.set(method.id, method.name);

    return byId;
  }, [methods]);

  const slotNames = React.useMemo(() => {
    const byId = new Map<string, string>();
    for (const slot of slots) byId.set(slot.id, slot.name);

    return byId;
  }, [slots]);

  function remove(restriction: DeliveryRestriction) {
    setPendingId(restriction.id);

    startTransition(async () => {
      try {
        const result = await deleteRestrictionAction(restriction.id);
        if (result.ok) toast.success(result.message);
        else toast.error(result.message);
      } finally {
        setPendingId(null);
      }
    });
  }

  const activeCount = restrictions.filter(
    (restriction) => restrictionPhase(restriction, today) === "active",
  ).length;

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Restrictions</h1>
          <p className="text-sm text-muted-foreground">
            Holidays and closures that take dates off the calendar.{" "}
            <span className="tabular-nums">
              {activeCount} in force of {restrictions.length}
            </span>
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setFormOpen(true)} className="w-full sm:w-auto">
            <Plus /> Add restriction
          </Button>
        ) : null}
      </div>

      <Card className="min-w-0 py-0">
        <CardContent className="p-0">
          {restrictions.length === 0 ? (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarOff />
                </EmptyMedia>
                <EmptyTitle>Nothing is blocked</EmptyTitle>
                <EmptyDescription>
                  Every open day is bookable. Add a restriction to close dates
                  for a holiday, a strike or maintenance.
                </EmptyDescription>
              </EmptyHeader>
              {canManage ? (
                <EmptyContent>
                  <Button onClick={() => setFormOpen(true)}>
                    <Plus /> Add restriction
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Restriction</TableHead>
                  <TableHead className="hidden md:table-cell">Dates</TableHead>
                  <TableHead className="hidden lg:table-cell">Method</TableHead>
                  <TableHead className="hidden lg:table-cell">Covers</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="w-12 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restrictions.map((restriction) => {
                  const phase = restrictionPhase(restriction, today);
                  const single =
                    restriction.startDate === restriction.endDate;

                  return (
                    <TableRow
                      key={restriction.id}
                      data-pending={pendingId === restriction.id}
                    >
                      <TableCell className="pl-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium">
                              {restriction.name}
                            </span>
                            {pendingId === restriction.id ? (
                              <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {restrictionTypeLabels[restriction.restrictionType]}
                          </div>
                          <div className="text-xs text-muted-foreground md:hidden">
                            {single
                              ? formatIsoDate(restriction.startDate)
                              : `${formatIsoDate(restriction.startDate)} – ${formatIsoDate(restriction.endDate)}`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {single ? (
                          formatIsoDate(restriction.startDate)
                        ) : (
                          <>
                            {formatIsoDate(restriction.startDate)}
                            <span className="px-1">–</span>
                            {formatIsoDate(restriction.endDate)}
                          </>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {restriction.deliveryMethodId ? (
                          <Badge variant="secondary">
                            {methodNames.get(restriction.deliveryMethodId) ??
                              "Unknown method"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Every method</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden max-w-xs lg:table-cell">
                        {restriction.slotIds.length === 0 ? (
                          <span className="text-muted-foreground">
                            Whole day
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {restriction.slotIds.map((slotId) => (
                              <Badge key={slotId} variant="secondary">
                                {slotNames.get(slotId) ?? "Unknown slot"}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            phase === "active"
                              ? "destructive"
                              : phase === "upcoming"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {phase === "active"
                            ? "In force"
                            : phase === "upcoming"
                              ? "Upcoming"
                              : "Past"}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        {canManage ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Remove ${restriction.name}`}
                            onClick={() => setRemoving(restriction)}
                          >
                            <Trash2 />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RestrictionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        methods={methods}
        slots={slots}
      />
      <DeleteRestrictionDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        restriction={removing}
        onConfirm={remove}
      />
    </>
  );
}
