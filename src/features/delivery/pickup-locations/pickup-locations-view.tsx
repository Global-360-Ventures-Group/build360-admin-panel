"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
import { setPickupLocationActiveAction } from "./actions";
import { PickupLocationFormDialog } from "./pickup-location-form-dialog";
import {
  hasCoordinates,
  pickupLocationArea,
  type PickupLocation,
  type PickupLocationPage,
} from "./types";

/**
 * The Click & Collect pickup points.
 *
 * Paged through the URL, because `GET /admin/delivery/pickup-locations` serves
 * one page at a time and takes nothing else — no search, no status filter. So
 * there is no filter bar: every control here would have to be faked on the
 * client over a page of twenty, which is worse than not offering it.
 */
export function PickupLocationsView({
  locations,
  page,
  canManage,
}: {
  locations: PickupLocationPage;
  /** 1-based, as it appears in the URL. */
  page: number;
  /** `DELIVERY_CONFIG_MANAGE`. Reading needs only the view grant. */
  canManage: boolean;
}) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PickupLocation | null>(null);

  function runAction(
    location: PickupLocation,
    action: () => Promise<DeliveryActionResult>,
  ) {
    setPendingId(location.id);

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

  function hrefFor(next: number): string {
    return next > 1
      ? `/delivery/pickup-locations?page=${next}`
      : "/delivery/pickup-locations";
  }

  const rangeStart =
    locations.totalElements === 0 ? 0 : locations.page * locations.size + 1;
  const rangeEnd = Math.min(
    locations.page * locations.size + locations.content.length,
    locations.totalElements,
  );

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Pickup locations
          </h1>
          <p className="text-sm text-muted-foreground">
            Where a Click &amp; Collect order can be collected.{" "}
            <span className="tabular-nums">{locations.totalElements} total</span>
          </p>
        </div>
        {canManage ? (
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus /> Add location
          </Button>
        ) : null}
      </div>

      <Card className="min-w-0 py-0">
        <CardContent className="p-0">
          {locations.content.length === 0 ? (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MapPin />
                </EmptyMedia>
                <EmptyTitle>No pickup locations yet</EmptyTitle>
                <EmptyDescription>
                  Click &amp; Collect slots have to name one, so add a branch
                  before opening those days.
                </EmptyDescription>
              </EmptyHeader>
              {canManage ? (
                <EmptyContent>
                  <Button onClick={openCreate}>
                    <Plus /> Add location
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Location</TableHead>
                  <TableHead className="hidden lg:table-cell">Address</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="text-right">Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.content.map((location) => {
                  const area = pickupLocationArea(location);

                  return (
                    <TableRow
                      key={location.id}
                      data-pending={pendingId === location.id}
                    >
                      <TableCell className="pl-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium">
                              {location.name}
                            </span>
                            {pendingId === location.id ? (
                              <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                            ) : null}
                          </div>
                          {area ? (
                            <div className="truncate text-xs text-muted-foreground">
                              {area}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="hidden max-w-xs lg:table-cell">
                        <span className="line-clamp-1 text-muted-foreground">
                          {location.addressLine || "—"}
                        </span>
                        {hasCoordinates(location) ? (
                          <span className="block font-mono text-xs text-muted-foreground">
                            {location.latitude}, {location.longitude}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {location.contactPhone || "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {location.displayOrder}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={location.active ? "default" : "secondary"}
                        >
                          {location.active ? "Active" : "Inactive"}
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
                                  aria-label={`Actions for ${location.name}`}
                                />
                              }
                            >
                              <MoreHorizontal />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditing(location);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  runAction(location, () =>
                                    setPickupLocationActiveAction(
                                      location.id,
                                      !location.active,
                                    ),
                                  )
                                }
                              >
                                {location.active ? (
                                  <ToggleLeft />
                                ) : (
                                  <ToggleRight />
                                )}
                                {location.active ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {locations.totalElements > 0 ? (
          <CardFooter className="flex flex-col gap-3 border-t py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm tabular-nums text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {locations.totalElements}
            </p>
            <div className="flex items-center gap-1">
              {locations.first ? (
                <Button variant="outline" size="sm" disabled>
                  <ChevronLeft />{" "}
                  <span className="hidden sm:inline">Previous</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={hrefFor(page - 1)} />}
                >
                  <ChevronLeft />{" "}
                  <span className="hidden sm:inline">Previous</span>
                </Button>
              )}
              <span className="px-2 text-sm tabular-nums text-muted-foreground">
                {locations.page + 1} / {Math.max(1, locations.totalPages)}
              </span>
              {locations.last ? (
                <Button variant="outline" size="sm" disabled>
                  <span className="hidden sm:inline">Next</span> <ChevronRight />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={hrefFor(page + 1)} />}
                >
                  <span className="hidden sm:inline">Next</span> <ChevronRight />
                </Button>
              )}
            </div>
          </CardFooter>
        ) : null}
      </Card>

      <PickupLocationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        location={editing}
      />
    </>
  );
}
