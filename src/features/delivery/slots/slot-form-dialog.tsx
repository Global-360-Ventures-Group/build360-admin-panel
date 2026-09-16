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

import { toTimeInput } from "../shared";
import { saveDeliverySlotAction } from "./actions";
import {
  DAY_PARTS,
  DELIVERY_SLOT_LIMITS,
  NO_DAY_PART,
  dayPartLabels,
  type DayPart,
  type DeliverySlot,
} from "./types";

const dayPartItems = [
  { label: "Not set", value: NO_DAY_PART },
  ...DAY_PARTS.map((part) => ({ label: dayPartLabels[part], value: part })),
];

export type SlotFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The slot being edited, or null to create one. */
  slot: DeliverySlot | null;
};

export function SlotFormDialog({
  open,
  onOpenChange,
  slot,
}: SlotFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open ? (
          <SlotForm
            key={slot?.id ?? "new"}
            slot={slot}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SlotForm({
  slot,
  onDone,
}: {
  slot: DeliverySlot | null;
  onDone: () => void;
}) {
  const isEdit = slot !== null;

  const [state, formAction, pending] = React.useActionState(
    saveDeliverySlotAction,
    undefined,
  );

  // The select is controlled, so its value rides along in a hidden input.
  const [dayPart, setDayPart] = React.useState<DayPart | typeof NO_DAY_PART>(
    slot?.dayPart || NO_DAY_PART,
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

  return (
    <form
      action={formAction}
      noValidate
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <input type="hidden" name="id" value={slot?.id ?? ""} />
      <input
        type="hidden"
        name="dayPart"
        value={dayPart === NO_DAY_PART ? "" : dayPart}
      />

      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit time slot" : "Add time slot"}</DialogTitle>
        <DialogDescription>
          A window you can then put on any number of delivery days, each with
          its own capacity and price.
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
          <Field data-invalid={Boolean(fieldErrors?.name) || undefined}>
            <FieldLabel htmlFor="slot-name">
              Name <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="slot-name"
              name="name"
              defaultValue={state?.values?.name ?? slot?.name ?? ""}
              placeholder="e.g. 10am – 11am"
              maxLength={DELIVERY_SLOT_LIMITS.name}
              aria-invalid={Boolean(fieldErrors?.name) || undefined}
              disabled={busy}
              autoFocus
            />
            <FieldDescription>
              What the customer sees at checkout.
            </FieldDescription>
            <FieldError>{fieldErrors?.name}</FieldError>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={Boolean(fieldErrors?.startTime) || undefined}>
              <FieldLabel htmlFor="slot-start">
                Starts <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="slot-start"
                name="startTime"
                type="time"
                defaultValue={
                  state?.values?.startTime ?? toTimeInput(slot?.startTime ?? "")
                }
                aria-invalid={Boolean(fieldErrors?.startTime) || undefined}
                disabled={busy}
              />
              <FieldError>{fieldErrors?.startTime}</FieldError>
            </Field>

            <Field data-invalid={Boolean(fieldErrors?.endTime) || undefined}>
              <FieldLabel htmlFor="slot-end">
                Ends <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="slot-end"
                name="endTime"
                type="time"
                defaultValue={
                  state?.values?.endTime ?? toTimeInput(slot?.endTime ?? "")
                }
                aria-invalid={Boolean(fieldErrors?.endTime) || undefined}
                disabled={busy}
              />
              <FieldError>{fieldErrors?.endTime}</FieldError>
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="slot-day-part">Day part</FieldLabel>
              <Select
                value={dayPart}
                onValueChange={(value) =>
                  setDayPart((value as DayPart) ?? NO_DAY_PART)
                }
                items={dayPartItems}
                disabled={busy}
              >
                <SelectTrigger id="slot-day-part" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayPartItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                Groups slots at checkout. Optional.
              </FieldDescription>
            </Field>

            <Field data-invalid={Boolean(fieldErrors?.displayOrder) || undefined}>
              <FieldLabel htmlFor="slot-display-order">Display order</FieldLabel>
              <Input
                id="slot-display-order"
                name="displayOrder"
                type="number"
                min={0}
                step={1}
                defaultValue={
                  state?.values?.displayOrder ??
                  (slot ? String(slot.displayOrder) : "")
                }
                aria-invalid={Boolean(fieldErrors?.displayOrder) || undefined}
                disabled={busy}
              />
              <FieldDescription>Lower shows first.</FieldDescription>
              <FieldError>{fieldErrors?.displayOrder}</FieldError>
            </Field>
          </div>
        </FieldGroup>
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {isEdit ? "Save changes" : "Create slot"}
        </Button>
      </DialogFooter>
    </form>
  );
}
