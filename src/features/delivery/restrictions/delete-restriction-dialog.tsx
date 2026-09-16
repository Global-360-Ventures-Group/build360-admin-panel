"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { DeliveryRestriction } from "./types";

/**
 * Confirmation for removing a restriction.
 *
 * The wording is blunter than the archive dialogs elsewhere in the panel, and
 * it should be: `DELETE /admin/delivery/restrictions/{id}` is the one endpoint
 * in this API that actually destroys a record. Everywhere else "delete" sets a
 * status and the row comes back. This one does not.
 */
export type DeleteRestrictionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restriction: DeliveryRestriction | null;
  onConfirm: (restriction: DeliveryRestriction) => Promise<void> | void;
};

export function DeleteRestrictionDialog({
  open,
  onOpenChange,
  restriction,
  onConfirm,
}: DeleteRestrictionDialogProps) {
  const [working, setWorking] = React.useState(false);

  async function handleConfirm() {
    if (!restriction) return;

    setWorking(true);
    try {
      await onConfirm(restriction);
      onOpenChange(false);
    } finally {
      setWorking(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Remove this restriction?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">
              {restriction?.name}
            </span>{" "}
            will be deleted for good — there is no restore. Delivery re-opens
            over the dates it covered as soon as it goes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
            disabled={working}
          >
            {working && <Loader2 className="animate-spin" />}
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
