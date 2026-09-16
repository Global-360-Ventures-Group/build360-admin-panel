"use client";

import * as React from "react";
import { Loader2, UserRoundX } from "lucide-react";

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

import { staffLabel, type StaffListItem } from "./types";

/**
 * Confirmation for deactivating a staff account.
 *
 * Not "Delete staff?": `POST /{id}/deactivate` is the only removal this API
 * has, it is reversible with `/activate`, and nothing anywhere hard-deletes a
 * staff record. The wording says what actually happens.
 *
 * Activation is not confirmed at all — restoring someone's access is the safe
 * direction, and a dialog for it would only be noise.
 */
export type DeactivateStaffDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffListItem | null;
  onConfirm: (staff: StaffListItem) => Promise<void> | void;
};

export function DeactivateStaffDialog({
  open,
  onOpenChange,
  staff,
  onConfirm,
}: DeactivateStaffDialogProps) {
  const [working, setWorking] = React.useState(false);

  async function handleConfirm() {
    if (!staff) return;

    setWorking(true);
    try {
      await onConfirm(staff);
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
            <UserRoundX />
          </AlertDialogMedia>
          <AlertDialogTitle>Deactivate this account?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">
              {staff ? staffLabel(staff) : ""}
            </span>{" "}
            will no longer be able to sign in to the backoffice. Their roles are
            kept, and you can reactivate the account at any time.
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
            Deactivate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
