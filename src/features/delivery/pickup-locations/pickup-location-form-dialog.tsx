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
import { Textarea } from "@/components/ui/textarea";

import { savePickupLocationAction } from "./actions";
import { PICKUP_LOCATION_LIMITS, type PickupLocation } from "./types";

export type PickupLocationFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The location being edited, or null to create one. */
  location: PickupLocation | null;
};

export function PickupLocationFormDialog({
  open,
  onOpenChange,
  location,
}: PickupLocationFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {open ? (
          <PickupLocationForm
            key={location?.id ?? "new"}
            location={location}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PickupLocationForm({
  location,
  onDone,
}: {
  location: PickupLocation | null;
  onDone: () => void;
}) {
  const isEdit = location !== null;

  const [state, formAction, pending] = React.useActionState(
    savePickupLocationAction,
    undefined,
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
      <input type="hidden" name="id" value={location?.id ?? ""} />

      <DialogHeader>
        <DialogTitle>
          {isEdit ? "Edit pickup location" : "Add pickup location"}
        </DialogTitle>
        <DialogDescription>
          Where a Click & Collect order can be picked up. Only that method uses
          these.
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
            <FieldLabel htmlFor="location-name">
              Name <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="location-name"
              name="name"
              defaultValue={state?.values?.name ?? location?.name ?? ""}
              placeholder="e.g. Mirpur Outlet"
              maxLength={PICKUP_LOCATION_LIMITS.name}
              aria-invalid={Boolean(fieldErrors?.name) || undefined}
              disabled={busy}
              autoFocus
            />
            <FieldError>{fieldErrors?.name}</FieldError>
          </Field>

          <Field data-invalid={Boolean(fieldErrors?.addressLine) || undefined}>
            <FieldLabel htmlFor="location-address">Address</FieldLabel>
            <Textarea
              id="location-address"
              name="addressLine"
              defaultValue={
                state?.values?.addressLine ?? location?.addressLine ?? ""
              }
              placeholder="Street address, building, floor."
              rows={2}
              maxLength={PICKUP_LOCATION_LIMITS.addressLine}
              aria-invalid={Boolean(fieldErrors?.addressLine) || undefined}
              disabled={busy}
            />
            <FieldError>{fieldErrors?.addressLine}</FieldError>
          </Field>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field data-invalid={Boolean(fieldErrors?.division) || undefined}>
              <FieldLabel htmlFor="location-division">Division</FieldLabel>
              <Input
                id="location-division"
                name="division"
                defaultValue={state?.values?.division ?? location?.division ?? ""}
                placeholder="Dhaka"
                maxLength={PICKUP_LOCATION_LIMITS.division}
                aria-invalid={Boolean(fieldErrors?.division) || undefined}
                disabled={busy}
              />
              <FieldError>{fieldErrors?.division}</FieldError>
            </Field>

            <Field data-invalid={Boolean(fieldErrors?.district) || undefined}>
              <FieldLabel htmlFor="location-district">District</FieldLabel>
              <Input
                id="location-district"
                name="district"
                defaultValue={state?.values?.district ?? location?.district ?? ""}
                placeholder="Dhaka"
                maxLength={PICKUP_LOCATION_LIMITS.district}
                aria-invalid={Boolean(fieldErrors?.district) || undefined}
                disabled={busy}
              />
              <FieldError>{fieldErrors?.district}</FieldError>
            </Field>

            <Field data-invalid={Boolean(fieldErrors?.upazila) || undefined}>
              <FieldLabel htmlFor="location-upazila">Upazila</FieldLabel>
              <Input
                id="location-upazila"
                name="upazila"
                defaultValue={state?.values?.upazila ?? location?.upazila ?? ""}
                placeholder="Mirpur"
                maxLength={PICKUP_LOCATION_LIMITS.upazila}
                aria-invalid={Boolean(fieldErrors?.upazila) || undefined}
                disabled={busy}
              />
              <FieldError>{fieldErrors?.upazila}</FieldError>
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={Boolean(fieldErrors?.contactPhone) || undefined}>
              <FieldLabel htmlFor="location-phone">Contact phone</FieldLabel>
              <Input
                id="location-phone"
                name="contactPhone"
                type="tel"
                defaultValue={
                  state?.values?.contactPhone ?? location?.contactPhone ?? ""
                }
                placeholder="01700000000"
                maxLength={PICKUP_LOCATION_LIMITS.contactPhone}
                aria-invalid={Boolean(fieldErrors?.contactPhone) || undefined}
                disabled={busy}
              />
              <FieldError>{fieldErrors?.contactPhone}</FieldError>
            </Field>

            <Field data-invalid={Boolean(fieldErrors?.displayOrder) || undefined}>
              <FieldLabel htmlFor="location-display-order">
                Display order
              </FieldLabel>
              <Input
                id="location-display-order"
                name="displayOrder"
                type="number"
                min={0}
                step={1}
                defaultValue={
                  state?.values?.displayOrder ??
                  (location ? String(location.displayOrder) : "")
                }
                aria-invalid={Boolean(fieldErrors?.displayOrder) || undefined}
                disabled={busy}
              />
              <FieldDescription>Lower shows first.</FieldDescription>
              <FieldError>{fieldErrors?.displayOrder}</FieldError>
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={Boolean(fieldErrors?.latitude) || undefined}>
              <FieldLabel htmlFor="location-latitude">Latitude</FieldLabel>
              <Input
                id="location-latitude"
                name="latitude"
                type="number"
                step="any"
                min={-90}
                max={90}
                defaultValue={
                  state?.values?.latitude ??
                  (location?.latitude !== null && location?.latitude !== undefined
                    ? String(location.latitude)
                    : "")
                }
                placeholder="23.8103"
                aria-invalid={Boolean(fieldErrors?.latitude) || undefined}
                disabled={busy}
              />
              <FieldError>{fieldErrors?.latitude}</FieldError>
            </Field>

            <Field data-invalid={Boolean(fieldErrors?.longitude) || undefined}>
              <FieldLabel htmlFor="location-longitude">Longitude</FieldLabel>
              <Input
                id="location-longitude"
                name="longitude"
                type="number"
                step="any"
                min={-180}
                max={180}
                defaultValue={
                  state?.values?.longitude ??
                  (location?.longitude !== null &&
                  location?.longitude !== undefined
                    ? String(location.longitude)
                    : "")
                }
                placeholder="90.4125"
                aria-invalid={Boolean(fieldErrors?.longitude) || undefined}
                disabled={busy}
              />
              <FieldDescription>
                Both or neither — half a coordinate points nowhere.
              </FieldDescription>
              <FieldError>{fieldErrors?.longitude}</FieldError>
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
          {isEdit ? "Save changes" : "Create location"}
        </Button>
      </DialogFooter>
    </form>
  );
}
