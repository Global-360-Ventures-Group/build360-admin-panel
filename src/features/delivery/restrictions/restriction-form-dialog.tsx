"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
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
  FieldError,
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
import { Textarea } from "@/components/ui/textarea";

import type { DeliveryMethod } from "../methods/types";
import { formatTimeRange, todayIso } from "../shared";
import type { DeliverySlot } from "../slots/types";
import { createRestrictionAction } from "./actions";
import {
  ALL_METHODS,
  RESTRICTION_LIMITS,
  RESTRICTION_TYPES,
  restrictionTypeLabels,
  type RestrictionType,
} from "./types";

const typeItems = RESTRICTION_TYPES.map((type) => ({
  label: restrictionTypeLabels[type],
  value: type,
}));

export type RestrictionFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  methods: DeliveryMethod[];
  slots: DeliverySlot[];
};

/**
 * Create a restriction. There is no edit variant, because the API has no PUT
 * for one — a block is added and removed, never changed.
 */
export function RestrictionFormDialog({
  open,
  onOpenChange,
  methods,
  slots,
}: RestrictionFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {open ? (
          <RestrictionForm
            methods={methods}
            slots={slots}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RestrictionForm({
  methods,
  slots,
  onDone,
}: {
  methods: DeliveryMethod[];
  slots: DeliverySlot[];
  onDone: () => void;
}) {
  const [state, formAction, pending] = React.useActionState(
    createRestrictionAction,
    undefined,
  );

  const [type, setType] = React.useState<RestrictionType>("HOLIDAY");
  const [methodId, setMethodId] = React.useState<string>(ALL_METHODS);
  const [slotIds, setSlotIds] = React.useState<Set<string>>(new Set());

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
  const today = todayIso();

  const methodItems = React.useMemo(
    () => [
      { label: "Every method", value: ALL_METHODS },
      ...methods.map((method) => ({ label: method.name, value: method.id })),
    ],
    [methods],
  );

  function toggleSlot(id: string, checked: boolean) {
    setSlotIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);

      return next;
    });
  }

  return (
    <form
      action={formAction}
      noValidate
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      {/* The selects and checkboxes are controlled, so what gets submitted
          rides in hidden inputs. `deliveryMethodId` and `slotIds` are sent
          empty for "everything" — which is what the API reads them as. */}
      <input type="hidden" name="restrictionType" value={type} />
      <input
        type="hidden"
        name="deliveryMethodId"
        value={methodId === ALL_METHODS ? "" : methodId}
      />
      {[...slotIds].map((id) => (
        <input key={id} type="hidden" name="slotIds" value={id} />
      ))}

      <DialogHeader>
        <DialogTitle>Add restriction</DialogTitle>
        <DialogDescription>
          Blocks delivery over a date range. Restrictions cannot be edited
          afterwards — only removed and re-added.
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
            <FieldLabel htmlFor="restriction-name">
              Name <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="restriction-name"
              name="name"
              defaultValue={state?.values?.name ?? ""}
              placeholder="e.g. Eid ul-Fitr holiday"
              maxLength={RESTRICTION_LIMITS.name}
              aria-invalid={Boolean(fieldErrors?.name) || undefined}
              disabled={busy}
              autoFocus
            />
            <FieldError>{fieldErrors?.name}</FieldError>
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="restriction-type">
                Type <span className="text-destructive">*</span>
              </FieldLabel>
              <Select
                value={type}
                onValueChange={(value) =>
                  setType((value as RestrictionType) ?? "HOLIDAY")
                }
                items={typeItems}
                disabled={busy}
              >
                <SelectTrigger id="restriction-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field data-invalid={Boolean(fieldErrors?.startDate) || undefined}>
              <FieldLabel htmlFor="restriction-start">
                From <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="restriction-start"
                name="startDate"
                type="date"
                defaultValue={state?.values?.startDate ?? today}
                aria-invalid={Boolean(fieldErrors?.startDate) || undefined}
                disabled={busy}
              />
              <FieldError>{fieldErrors?.startDate}</FieldError>
            </Field>

            <Field data-invalid={Boolean(fieldErrors?.endDate) || undefined}>
              <FieldLabel htmlFor="restriction-end">
                To <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="restriction-end"
                name="endDate"
                type="date"
                defaultValue={state?.values?.endDate ?? today}
                aria-invalid={Boolean(fieldErrors?.endDate) || undefined}
                disabled={busy}
              />
              <FieldDescription>Both ends included.</FieldDescription>
              <FieldError>{fieldErrors?.endDate}</FieldError>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="restriction-method">Delivery method</FieldLabel>
            <Select
              value={methodId}
              onValueChange={(value) => setMethodId(value ?? ALL_METHODS)}
              items={methodItems}
              disabled={busy}
            >
              <SelectTrigger id="restriction-method" className="w-full">
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
            <FieldDescription>
              Leave on “Every method” to block all three.
            </FieldDescription>
          </Field>

          <Field data-invalid={Boolean(fieldErrors?.slotIds) || undefined}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <FieldTitle>Time slots</FieldTitle>
              <span className="text-xs text-muted-foreground">
                {slotIds.size === 0
                  ? "Whole day blocked"
                  : `${slotIds.size} slot${slotIds.size === 1 ? "" : "s"} blocked`}
              </span>
            </div>
            {slots.length === 0 ? (
              <FieldDescription>
                No time slots exist yet, so this blocks the whole day.
              </FieldDescription>
            ) : (
              <div className="max-h-48 divide-y overflow-y-auto rounded-md border">
                {slots.map((slot) => {
                  const inputId = `restriction-slot-${slot.id}`;

                  return (
                    <div
                      key={slot.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50"
                    >
                      <Checkbox
                        id={inputId}
                        checked={slotIds.has(slot.id)}
                        onCheckedChange={(next) =>
                          toggleSlot(slot.id, next === true)
                        }
                        disabled={busy}
                      />
                      <label
                        htmlFor={inputId}
                        className="min-w-0 flex-1 cursor-pointer text-sm font-normal select-none"
                      >
                        <span className="font-medium">{slot.name}</span>{" "}
                        <span className="text-muted-foreground tabular-nums">
                          {formatTimeRange(slot.startTime, slot.endTime)}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
            <FieldDescription>
              Pick none to block the entire day. Picking some blocks only those
              windows and leaves the rest bookable.
            </FieldDescription>
            <FieldError>{fieldErrors?.slotIds}</FieldError>
          </Field>

          <Field data-invalid={Boolean(fieldErrors?.remarks) || undefined}>
            <FieldLabel htmlFor="restriction-remarks">Remarks</FieldLabel>
            <Textarea
              id="restriction-remarks"
              name="remarks"
              defaultValue={state?.values?.remarks ?? ""}
              placeholder="Why, for whoever reads this next."
              rows={2}
              maxLength={RESTRICTION_LIMITS.remarks}
              aria-invalid={Boolean(fieldErrors?.remarks) || undefined}
              disabled={busy}
            />
            <FieldError>{fieldErrors?.remarks}</FieldError>
          </Field>
        </FieldGroup>
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Create restriction
        </Button>
      </DialogFooter>
    </form>
  );
}
