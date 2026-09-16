"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import type { DeliveryMethod } from "../methods/types";
import type { PickupLocation } from "../pickup-locations/types";
import { formatIsoDate, formatTimeRange } from "../shared";
import type { DeliverySlot } from "../slots/types";
import { saveCalendarSlotAction } from "./actions";
import {
  CALENDAR_SLOT_STATUSES,
  calendarSlotStatusLabels,
  type CalendarSlot,
  type CalendarSlotStatus,
} from "./types";

const statusItems = CALENDAR_SLOT_STATUSES.map((status) => ({
  label: calendarSlotStatusLabels[status],
  value: status,
}));

export type CalendarSlotFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The day the slot belongs to. */
  dayId: string;
  dayDate: string;
  /** The bookable slot being edited, or null to add one. */
  slot: CalendarSlot | null;
  methods: DeliveryMethod[];
  slots: DeliverySlot[];
  locations: PickupLocation[];
};

export function CalendarSlotFormDialog(props: CalendarSlotFormDialogProps) {
  const { open, onOpenChange, slot, dayId } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open ? (
          <CalendarSlotForm
            key={slot?.id ?? `new-${dayId}`}
            {...props}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CalendarSlotForm({
  dayId,
  dayDate,
  slot,
  methods,
  slots,
  locations,
  onDone,
}: CalendarSlotFormDialogProps & { onDone: () => void }) {
  const isEdit = slot !== null;

  const [state, formAction, pending] = React.useActionState(
    saveCalendarSlotAction,
    undefined,
  );

  const [methodId, setMethodId] = React.useState(
    slot?.deliveryMethodId ?? methods[0]?.id ?? "",
  );
  const [slotId, setSlotId] = React.useState(slot?.deliverySlotId ?? "");
  const [locationId, setLocationId] = React.useState(
    slot?.pickupLocationId ?? "",
  );
  const [bestValue, setBestValue] = React.useState(slot?.bestValue ?? false);
  const [status, setStatus] = React.useState<CalendarSlotStatus>(
    slot?.status ?? "AVAILABLE",
  );

  const settled = React.useRef(false);
  React.useEffect(() => {
    if (state?.status === "success" && !settled.current) {
      settled.current = true;
      toast.success(state.message ?? "Saved.");
      onDone();
    }
  }, [state, onDone]);

  const fieldErrors = state?.fieldErrors;
  const busy = pending;

  const method = methods.find((candidate) => candidate.id === methodId) ?? null;
  const requiresPickup = method?.requiresPickupLocation ?? false;

  // Only active windows and branches are offered for a *new* slot. An edit
  // cannot change either field anyway, so a slot built on something since
  // deactivated still renders — it just cannot be re-pointed.
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

  const chosenSlot = slots.find((item) => item.id === slot?.deliverySlotId);
  const chosenLocation = locations.find(
    (item) => item.id === slot?.pickupLocationId,
  );

  return (
    <form
      action={formAction}
      noValidate
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <input type="hidden" name="slotId" value={slot?.id ?? ""} />
      <input type="hidden" name="dayId" value={dayId} />
      <input type="hidden" name="deliveryMethodId" value={methodId} />
      <input type="hidden" name="deliverySlotId" value={slotId} />
      <input type="hidden" name="pickupLocationId" value={locationId} />
      <input
        type="hidden"
        name="requiresPickup"
        value={requiresPickup ? "true" : "false"}
      />
      <input type="hidden" name="bestValue" value={bestValue ? "true" : "false"} />
      <input type="hidden" name="status" value={status} />

      <DialogHeader>
        <DialogTitle>
          {isEdit ? "Edit bookable slot" : "Add bookable slot"}
        </DialogTitle>
        <DialogDescription>
          {formatIsoDate(dayDate)}
          {isEdit
            ? " — capacity, price and status. Which method and window it covers are fixed."
            : " — one window, for one method, with its own capacity and price."}
        </DialogDescription>
      </DialogHeader>

      {state?.status === "error" && state.message ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.message}
        </div>
      ) : null}

      <DialogBody>
        <FieldGroup className="py-1">
          {isEdit ? (
            // `CalendarSlotUpdateRequest` has no method, window or location,
            // so they are shown as facts rather than as inputs that would
            // promise a change the API cannot make.
            <Field>
              <FieldLabel>Covers</FieldLabel>
              <div className="grid gap-2 rounded-md border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Method</span>
                  <span className="text-right">{method?.name ?? "Unknown"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Window</span>
                  <span className="text-right">
                    {chosenSlot
                      ? `${chosenSlot.name} · ${formatTimeRange(chosenSlot.startTime, chosenSlot.endTime)}`
                      : "Unknown"}
                  </span>
                </div>
                {slot.pickupLocationId ? (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Pickup</span>
                    <span className="text-right">
                      {chosenLocation?.name ?? "Unknown"}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Booked</span>
                  <span className="text-right tabular-nums">
                    {slot.bookedCount} of {slot.capacity}
                  </span>
                </div>
              </div>
              <FieldDescription>
                Fixed once the slot exists. To change any of it, block this slot
                and add another.
              </FieldDescription>
            </Field>
          ) : (
            <>
              <Field
                data-invalid={Boolean(fieldErrors?.deliveryMethodId) || undefined}
              >
                <FieldLabel htmlFor="calendar-slot-method">
                  Delivery method <span className="text-destructive">*</span>
                </FieldLabel>
                <Select
                  value={methodId}
                  onValueChange={(value) => {
                    setMethodId(value ?? "");
                    // A method that does not collect cannot carry a branch.
                    setLocationId("");
                  }}
                  items={methodItems}
                  disabled={busy}
                >
                  <SelectTrigger id="calendar-slot-method" className="w-full">
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
                <FieldError>{fieldErrors?.deliveryMethodId}</FieldError>
              </Field>

              <Field
                data-invalid={Boolean(fieldErrors?.deliverySlotId) || undefined}
              >
                <FieldLabel htmlFor="calendar-slot-window">
                  Time slot <span className="text-destructive">*</span>
                </FieldLabel>
                <Select
                  value={slotId}
                  onValueChange={(value) => setSlotId(value ?? "")}
                  items={slotItems}
                  disabled={busy || slotItems.length === 0}
                >
                  <SelectTrigger id="calendar-slot-window" className="w-full">
                    <SelectValue placeholder="Pick a window" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {slotItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {slotItems.length === 0
                    ? "No active time slots exist — create one first."
                    : "Only active windows are offered."}
                </FieldDescription>
                <FieldError>{fieldErrors?.deliverySlotId}</FieldError>
              </Field>

              {requiresPickup ? (
                <Field
                  data-invalid={
                    Boolean(fieldErrors?.pickupLocationId) || undefined
                  }
                >
                  <FieldLabel htmlFor="calendar-slot-location">
                    Pickup location <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select
                    value={locationId}
                    onValueChange={(value) => setLocationId(value ?? "")}
                    items={locationItems}
                    disabled={busy || locationItems.length === 0}
                  >
                    <SelectTrigger id="calendar-slot-location" className="w-full">
                      <SelectValue placeholder="Pick a branch" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {locationItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    {locationItems.length === 0
                      ? "No active pickup locations exist — add one first."
                      : `${method?.name} collects, so it needs somewhere to collect from.`}
                  </FieldDescription>
                  <FieldError>{fieldErrors?.pickupLocationId}</FieldError>
                </Field>
              ) : null}
            </>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={Boolean(fieldErrors?.capacity) || undefined}>
              <FieldLabel htmlFor="calendar-slot-capacity">
                Capacity <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="calendar-slot-capacity"
                name="capacity"
                type="number"
                min={0}
                step={1}
                defaultValue={
                  state?.values?.capacity ??
                  (slot ? String(slot.capacity) : "10")
                }
                aria-invalid={Boolean(fieldErrors?.capacity) || undefined}
                disabled={busy}
              />
              <FieldDescription>Orders this window can take.</FieldDescription>
              <FieldError>{fieldErrors?.capacity}</FieldError>
            </Field>

            <Field data-invalid={Boolean(fieldErrors?.price) || undefined}>
              <FieldLabel htmlFor="calendar-slot-price">
                Price (৳) <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="calendar-slot-price"
                name="price"
                type="number"
                min={0}
                step="any"
                defaultValue={
                  state?.values?.price ?? (slot ? String(slot.price) : "0")
                }
                aria-invalid={Boolean(fieldErrors?.price) || undefined}
                disabled={busy}
              />
              <FieldDescription>0 for free delivery.</FieldDescription>
              <FieldError>{fieldErrors?.price}</FieldError>
            </Field>
          </div>

          {isEdit ? (
            <Field>
              <FieldLabel htmlFor="calendar-slot-status">Status</FieldLabel>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus((value as CalendarSlotStatus) ?? "AVAILABLE")
                }
                items={statusItems}
                disabled={busy}
              >
                <SelectTrigger id="calendar-slot-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                Blocking is the only way to retire a slot — nothing deletes one.
              </FieldDescription>
            </Field>
          ) : null}

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="calendar-slot-best-value">
                Best value
              </FieldLabel>
              <FieldDescription>
                Highlights this window at checkout.
              </FieldDescription>
            </FieldContent>
            <Switch
              id="calendar-slot-best-value"
              checked={bestValue}
              onCheckedChange={setBestValue}
              disabled={busy}
            />
          </Field>
        </FieldGroup>
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {isEdit ? "Save changes" : "Add slot"}
        </Button>
      </DialogFooter>
    </form>
  );
}
