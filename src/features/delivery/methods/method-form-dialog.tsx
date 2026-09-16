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

import { saveDeliveryMethodAction } from "./actions";
import {
  DELIVERY_METHOD_LIMITS,
  deliveryMethodCodeLabels,
  type DeliveryMethod,
} from "./types";

export type MethodFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The method being edited. There is no create — the three are fixed. */
  method: DeliveryMethod | null;
};

export function MethodFormDialog({
  open,
  onOpenChange,
  method,
}: MethodFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && method ? (
          <MethodForm
            key={method.id}
            method={method}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function MethodForm({
  method,
  onDone,
}: {
  method: DeliveryMethod;
  onDone: () => void;
}) {
  const [state, formAction, pending] = React.useActionState(
    saveDeliveryMethodAction,
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
      <input type="hidden" name="id" value={method.id} />

      <DialogHeader>
        <DialogTitle>
          Edit {deliveryMethodCodeLabels[method.code]}
        </DialogTitle>
        <DialogDescription>
          How this method reads on the storefront. The method itself, and
          whether it needs a pickup location, are fixed by the backend.
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
            <FieldLabel htmlFor="method-name">
              Name <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="method-name"
              name="name"
              defaultValue={state?.values?.name ?? method.name}
              maxLength={DELIVERY_METHOD_LIMITS.name}
              aria-invalid={Boolean(fieldErrors?.name) || undefined}
              disabled={busy}
              autoFocus
            />
            <FieldError>{fieldErrors?.name}</FieldError>
          </Field>

          <Field data-invalid={Boolean(fieldErrors?.description) || undefined}>
            <FieldLabel htmlFor="method-description">Description</FieldLabel>
            <Textarea
              id="method-description"
              name="description"
              defaultValue={state?.values?.description ?? method.description}
              placeholder="What the customer gets, in a line."
              rows={3}
              maxLength={DELIVERY_METHOD_LIMITS.description}
              aria-invalid={Boolean(fieldErrors?.description) || undefined}
              disabled={busy}
            />
            <FieldError>{fieldErrors?.description}</FieldError>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={Boolean(fieldErrors?.badge) || undefined}>
              <FieldLabel htmlFor="method-badge">Badge</FieldLabel>
              <Input
                id="method-badge"
                name="badge"
                defaultValue={state?.values?.badge ?? method.badge}
                placeholder="e.g. Fastest"
                maxLength={DELIVERY_METHOD_LIMITS.badge}
                aria-invalid={Boolean(fieldErrors?.badge) || undefined}
                disabled={busy}
              />
              <FieldDescription>
                The small pill next to the name at checkout.
              </FieldDescription>
              <FieldError>{fieldErrors?.badge}</FieldError>
            </Field>

            <Field data-invalid={Boolean(fieldErrors?.displayOrder) || undefined}>
              <FieldLabel htmlFor="method-display-order">
                Display order
              </FieldLabel>
              <Input
                id="method-display-order"
                name="displayOrder"
                type="number"
                min={0}
                step={1}
                defaultValue={
                  state?.values?.displayOrder ?? String(method.displayOrder)
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
          Save changes
        </Button>
      </DialogFooter>
    </form>
  );
}
