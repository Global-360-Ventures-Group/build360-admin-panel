"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Plus, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { newId } from "@/lib/utils";

import type { DeliveryMethod } from "../methods/types";
import type { PickupLocation } from "../pickup-locations/types";
import {
  addDays,
  daysBetween,
  formatIsoDate,
  formatTimeRange,
  todayIso,
} from "../shared";
import type { DeliverySlot } from "../slots/types";
import { bulkCreateCalendarAction } from "./actions";
import {
  BULK_MAX_DAYS,
  type BulkCalendarResult,
  type BulkSlotDraft,
} from "./types";

export type BulkCalendarDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  methods: DeliveryMethod[];
  slots: DeliverySlot[];
  locations: PickupLocation[];
  /** Called after a run lands, so cached slot lists can be refetched. */
  onBuilt?: () => void;
};

/**
 * The bulk builder: one method's slots across a date range.
 *
 * Not a `<form action>` like the rest of the panel, because the body is a
 * nested structure — a list of slot specs — rather than flat fields, and
 * flattening it into `FormData` and back would be more code than the direct
 * call.
 *
 * The result is kept on screen rather than toasted away: the endpoint skips
 * dates a restriction covers and slots that already exist, and those counts
 * are the whole point of running it.
 */
export function BulkCalendarDialog({
  open,
  onOpenChange,
  methods,
  slots,
  locations,
  onBuilt,
}: BulkCalendarDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        {open ? (
          <BulkCalendarForm
            methods={methods}
            slots={slots}
            locations={locations}
            onBuilt={onBuilt}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function emptyDraft(): BulkSlotDraft {
  return {
    key: newId("row"),
    deliverySlotId: "",
    pickupLocationId: "",
    capacity: "10",
    price: "0",
    bestValue: false,
  };
}

function BulkCalendarForm({
  methods,
  slots,
  locations,
  onBuilt,
  onDone,
}: {
  methods: DeliveryMethod[];
  slots: DeliverySlot[];
  locations: PickupLocation[];
  onBuilt?: () => void;
  onDone: () => void;
}) {
  const today = todayIso();

  const [fromDate, setFromDate] = React.useState(today);
  const [toDate, setToDate] = React.useState(addDays(today, 13));
  const [methodId, setMethodId] = React.useState(methods[0]?.id ?? "");
  const [drafts, setDrafts] = React.useState<BulkSlotDraft[]>([emptyDraft()]);
  const [result, setResult] = React.useState<BulkCalendarResult | null>(null);
  const [running, startTransition] = React.useTransition();

  const method = methods.find((candidate) => candidate.id === methodId) ?? null;
  const requiresPickup = method?.requiresPickupLocation ?? false;

  const methodItems = React.useMemo(
    () => methods.map((item) => ({ label: item.name, value: item.id })),
    [methods],
  );
  const slotItems = React.useMemo(
    () =>
      slots
        .filter((item) => item.active)
        .map((item) => ({
          label: `${item.name} · ${formatTimeRange(item.startTime, item.endTime)}`,
          value: item.id,
        })),
    [slots],
  );
  const locationItems = React.useMemo(
    () =>
      locations
        .filter((item) => item.active)
        .map((item) => ({ label: item.name, value: item.id })),
    [locations],
  );

  const span = daysBetween(fromDate, toDate);
  const dayCount = span === null ? null : span + 1;
  const tooWide = dayCount !== null && dayCount > BULK_MAX_DAYS;
  const backwards = dayCount !== null && dayCount < 1;

  function patch(key: string, change: Partial<BulkSlotDraft>) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.key === key ? { ...draft, ...change } : draft,
      ),
    );
  }

  function run() {
    startTransition(async () => {
      const response = await bulkCreateCalendarAction({
        fromDate,
        toDate,
        deliveryMethodId: methodId,
        slots: drafts.map((draft) => ({
          deliverySlotId: draft.deliverySlotId,
          pickupLocationId: requiresPickup
            ? draft.pickupLocationId || undefined
            : undefined,
          capacity: Number(draft.capacity),
          price: Number(draft.price),
          bestValue: draft.bestValue,
        })),
      });

      if (response.ok) {
        setResult(response.result);
        onBuilt?.();
        toast.success(
          `${response.result.slotsCreated} slot${response.result.slotsCreated === 1 ? "" : "s"} created.`,
        );
      } else {
        toast.error(response.message);
      }
    });
  }

  const incomplete = drafts.some(
    (draft) =>
      !draft.deliverySlotId ||
      draft.capacity === "" ||
      draft.price === "" ||
      (requiresPickup && !draft.pickupLocationId),
  );
  const blocked =
    running || !methodId || incomplete || tooWide || backwards || span === null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Build the calendar</DialogTitle>
        <DialogDescription>
          Opens every date in the range for one method and puts these windows on
          each. Dates a restriction covers are skipped, and so is any slot that
          already exists.
        </DialogDescription>
      </DialogHeader>

      <DialogBody>
        <FieldGroup className="py-1">
          <div className="grid gap-5 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="bulk-from">From</FieldLabel>
              <Input
                id="bulk-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                disabled={running}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bulk-to">To</FieldLabel>
              <Input
                id="bulk-to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                disabled={running}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bulk-method">Delivery method</FieldLabel>
              <Select
                value={methodId}
                onValueChange={(value) => {
                  setMethodId(value ?? "");
                  // A method that does not collect cannot carry branches.
                  setDrafts((current) =>
                    current.map((draft) => ({ ...draft, pickupLocationId: "" })),
                  );
                }}
                items={methodItems}
                disabled={running}
              >
                <SelectTrigger id="bulk-method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {methodItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {backwards ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>The end date is before the start date.</span>
            </div>
          ) : tooWide ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                That is {dayCount} days. Build at most {BULK_MAX_DAYS} at a
                time — nothing in this API deletes a day once it exists.
              </span>
            </div>
          ) : dayCount !== null ? (
            <p className="text-sm text-muted-foreground">
              {dayCount} day{dayCount === 1 ? "" : "s"}, {drafts.length} window
              {drafts.length === 1 ? "" : "s"} each — up to{" "}
              <span className="tabular-nums">{dayCount * drafts.length}</span>{" "}
              bookable slots.
            </p>
          ) : null}

          <Field>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <FieldTitle>Windows on every day</FieldTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDrafts((current) => [...current, emptyDraft()])}
                disabled={running}
              >
                <Plus /> Add window
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              {drafts.map((draft, index) => (
                <div
                  key={draft.key}
                  className="grid gap-3 rounded-md border p-3 sm:grid-cols-2"
                >
                  <div className="sm:col-span-2">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Window {index + 1}
                      </span>
                      {drafts.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() =>
                            setDrafts((current) =>
                              current.filter((item) => item.key !== draft.key),
                            )
                          }
                          disabled={running}
                        >
                          <X /> Remove
                        </Button>
                      ) : null}
                    </div>
                    <Select
                      value={draft.deliverySlotId}
                      onValueChange={(value) =>
                        patch(draft.key, { deliverySlotId: value ?? "" })
                      }
                      items={slotItems}
                      disabled={running || slotItems.length === 0}
                    >
                      <SelectTrigger
                        className="w-full"
                        aria-label={`Time slot for window ${index + 1}`}
                      >
                        <SelectValue placeholder="Pick a time slot" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {slotItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {requiresPickup ? (
                    <div className="sm:col-span-2">
                      <Select
                        value={draft.pickupLocationId}
                        onValueChange={(value) =>
                          patch(draft.key, { pickupLocationId: value ?? "" })
                        }
                        items={locationItems}
                        disabled={running || locationItems.length === 0}
                      >
                        <SelectTrigger
                          className="w-full"
                          aria-label={`Pickup location for window ${index + 1}`}
                        >
                          <SelectValue placeholder="Pick a pickup location" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {locationItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={draft.capacity}
                    onChange={(e) =>
                      patch(draft.key, { capacity: e.target.value })
                    }
                    placeholder="Capacity"
                    aria-label={`Capacity for window ${index + 1}`}
                    disabled={running}
                  />
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={draft.price}
                    onChange={(e) => patch(draft.key, { price: e.target.value })}
                    placeholder="Price"
                    aria-label={`Price for window ${index + 1}`}
                    disabled={running}
                  />

                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Checkbox
                      id={`bulk-best-${draft.key}`}
                      checked={draft.bestValue}
                      onCheckedChange={(next) =>
                        patch(draft.key, { bestValue: next === true })
                      }
                      disabled={running}
                    />
                    <label
                      htmlFor={`bulk-best-${draft.key}`}
                      className="cursor-pointer text-sm font-normal text-muted-foreground select-none"
                    >
                      Mark as best value
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <FieldDescription>
              {slotItems.length === 0
                ? "No active time slots exist — create one before building."
                : "Every window is created on every date in the range."}
            </FieldDescription>
          </Field>

          {result ? (
            <div className="rounded-md border border-success/30 bg-success/10 p-3 text-sm">
              <div className="flex items-start gap-2 text-success">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium">
                    {result.daysCreated} day
                    {result.daysCreated === 1 ? "" : "s"} opened,{" "}
                    {result.slotsCreated} slot
                    {result.slotsCreated === 1 ? "" : "s"} created
                  </p>
                  <p className="mt-0.5 text-foreground/80">
                    {result.datesProcessed} date
                    {result.datesProcessed === 1 ? "" : "s"} processed
                    {result.slotsSkipped > 0
                      ? `, ${result.slotsSkipped} slot${result.slotsSkipped === 1 ? "" : "s"} skipped as already there`
                      : ""}
                    .
                  </p>
                  {result.datesSkipped.length > 0 ? (
                    <p className="mt-1 text-foreground/80">
                      Skipped as restricted:{" "}
                      {result.datesSkipped
                        .map((date) => formatIsoDate(date))
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </FieldGroup>
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={running}>
          {result ? "Close" : "Cancel"}
        </Button>
        <Button type="button" onClick={run} disabled={blocked}>
          {running ? <Loader2 className="animate-spin" /> : null}
          Build calendar
        </Button>
      </DialogFooter>
    </div>
  );
}
