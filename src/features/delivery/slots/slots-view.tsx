"use client";

import * as React from "react";
import {
  Clock,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { DeliveryActionResult } from "../action-result";
import { formatTimeRange } from "../shared";
import { setDeliverySlotActiveAction } from "./actions";
import { SlotFormDialog } from "./slot-form-dialog";
import { dayPartLabels, type DeliverySlot } from "./types";

/**
 * The reusable time slots.
 *
 * Not paginated and not filtered: `GET /admin/delivery/slots` returns a plain
 * array and takes no query parameters, and a shop has a handful of windows,
 * not a catalogue of them. So there is no search box here — adding one would
 * be a control with nothing to do.
 */
export function SlotsView({
  slots,
  canManage,
}: {
  slots: DeliverySlot[];
  /** `DELIVERY_CONFIG_MANAGE`. Reading needs only the view grant. */
  canManage: boolean;
}) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DeliverySlot | null>(null);

  function runAction(
    slot: DeliverySlot,
    action: () => Promise<DeliveryActionResult>,
  ) {
    setPendingId(slot.id);

    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) toast.success(result.message);
        else toast.error(result.message);
      } finally {
        setPendingId(null);
      }
    });
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  const activeCount = slots.filter((slot) => slot.active).length;

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Time slots</h1>
          <p className="text-sm text-muted-foreground">
            The windows a day can be split into.{" "}
            <span className="tabular-nums">
              {activeCount} active of {slots.length}
            </span>
          </p>
        </div>
        {canManage ? (
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus /> Add time slot
          </Button>
        ) : null}
      </div>

      <Card className="min-w-0 py-0">
        <CardContent className="p-0">
          {slots.length === 0 ? (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Clock />
                </EmptyMedia>
                <EmptyTitle>No time slots yet</EmptyTitle>
                <EmptyDescription>
                  A delivery day is made of slots, so create at least one before
                  opening days on the calendar.
                </EmptyDescription>
              </EmptyHeader>
              {canManage ? (
                <EmptyContent>
                  <Button onClick={openCreate}>
                    <Plus /> Add time slot
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Slot</TableHead>
                  <TableHead className="hidden sm:table-cell">Window</TableHead>
                  <TableHead className="hidden md:table-cell">Day part</TableHead>
                  <TableHead className="text-right">Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.map((slot) => (
                  <TableRow key={slot.id} data-pending={pendingId === slot.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{slot.name}</span>
                        {pendingId === slot.id ? (
                          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground sm:hidden">
                        {formatTimeRange(slot.startTime, slot.endTime)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden tabular-nums text-muted-foreground sm:table-cell">
                      {formatTimeRange(slot.startTime, slot.endTime)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {slot.dayPart ? (
                        <Badge variant="secondary">
                          {dayPartLabels[slot.dayPart]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {slot.displayOrder}
                    </TableCell>
                    <TableCell>
                      <Badge variant={slot.active ? "default" : "secondary"}>
                        {slot.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      {canManage ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={`Actions for ${slot.name}`}
                              />
                            }
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(slot);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                runAction(slot, () =>
                                  setDeliverySlotActiveAction(
                                    slot.id,
                                    !slot.active,
                                  ),
                                )
                              }
                            >
                              {slot.active ? <ToggleLeft /> : <ToggleRight />}
                              {slot.active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SlotFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        slot={editing}
      />
    </>
  );
}
