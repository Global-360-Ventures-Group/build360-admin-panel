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
import { Textarea } from "@/components/ui/textarea";

import { formatIsoDate } from "../shared";
import { saveDeliveryDayAction } from "./actions";
import {
  DELIVERY_DAY_LIMITS,
  DELIVERY_DAY_STATUSES,
  deliveryDayStatusLabels,
  type DeliveryDay,
  type DeliveryDayStatus,
} from "./types";

const statusItems = DELIVERY_DAY_STATUSES.map((status) => ({
  label: deliveryDayStatusLabels[status],
  value: status,
}));

export type DayFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The day being edited, or null when opening a fresh date. */
  day: DeliveryDay | null;
  /** The date being opened, when `day` is null. */
  date: string;
};

export function DayFormDialog({
  open,
  onOpenChange,
  day,
  date,
}: DayFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <DayForm
            key={day?.id ?? date}
            day={day}
            date={date}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DayForm({
  day,
  date,
  onDone,
}: {
  day: DeliveryDay | null;
  date: string;
  onDone: () => void;
}) {
  const isEdit = day !== null;

  const [state, formAction, pending] = React.useActionState(
    saveDeliveryDayAction,
    undefined,
  );

  const [status, setStatus] = React.useState<DeliveryDayStatus>(
    day?.status ?? "AVAILABLE",
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
  const shownDate = day?.deliveryDate || date;

  return (
    <form
      action={formAction}
      noValidate
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <input type="hidden" name="id" value={day?.id ?? ""} />
      <input type="hidden" name="deliveryDate" value={shownDate} />
      <input type="hidden" name="status" value={status} />

      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit day" : "Open this day"}</DialogTitle>
        <DialogDescription>
          {formatIsoDate(shownDate)}
          {isEdit
            ? " — change the status or leave a note."
            : " — opening a day lets you put bookable slots on it."}
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
          {/* Shown, not editable: the date a day belongs to is fixed at
              creation and is not on the update body at all. */}
          <Field>
            <FieldLabel htmlFor="day-date">Date</FieldLabel>
            <Input
              id="day-date"
              value={shownDate}
              readOnly
              disabled
              className="font-mono"
            />
            <FieldError>{fieldErrors?.deliveryDate}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="day-status">Status</FieldLabel>
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus((value as DeliveryDayStatus) ?? "AVAILABLE")
              }
              items={statusItems}
              disabled={busy}
            >
              <SelectTrigger id="day-status" className="w-full">
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
              Only <strong>Available</strong> is bookable. Blocked and Holiday
              both close the day; Full closes it because the capacity is gone.
            </FieldDescription>
          </Field>

          <Field data-invalid={Boolean(fieldErrors?.remarks) || undefined}>
            <FieldLabel htmlFor="day-remarks">Remarks</FieldLabel>
            <Textarea
              id="day-remarks"
              name="remarks"
              defaultValue={state?.values?.remarks ?? day?.remarks ?? ""}
              placeholder="Internal note for whoever reads this next."
              rows={2}
              maxLength={DELIVERY_DAY_LIMITS.remarks}
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
          {isEdit ? "Save changes" : "Open day"}
        </Button>
      </DialogFooter>
    </form>
  );
}
