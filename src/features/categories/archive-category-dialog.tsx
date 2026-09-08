"use client";

import * as React from "react";
import { Archive, Loader2 } from "lucide-react";

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

import type { CategoryRow } from "./types";

/**
 * Confirmation for archiving a category.
 *
 * Replaces a "Delete category?" dialog that warned the action could not be
 * undone. `DELETE /admin/categories/{id}` sets the category INACTIVE and it
 * can be restored; nothing in the API hard-deletes one.
 */
export type ArchiveCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryRow | null;
  onConfirm: (category: CategoryRow) => Promise<void> | void;
};

export function ArchiveCategoryDialog({
  open,
  onOpenChange,
  category,
  onConfirm,
}: ArchiveCategoryDialogProps) {
  const [archiving, setArchiving] = React.useState(false);

  async function handleConfirm() {
    if (!category) return;

    setArchiving(true);
    try {
      await onConfirm(category);
      onOpenChange(false);
    } finally {
      setArchiving(false);
    }
  }

  const descendants = category?.descendantCount ?? 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Archive />
          </AlertDialogMedia>
          <AlertDialogTitle>Archive category?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">
              {category?.fullPath}
            </span>{" "}
            will be set to inactive and hidden from the storefront.
            {descendants > 0 ? (
              <>
                {" "}
                It has{" "}
                <span className="font-medium text-foreground">
                  {descendants} subcategor{descendants === 1 ? "y" : "ies"}
                </span>
                {" "}— archiving only affects this one, so they stay active
                unless you archive them too.
              </>
            ) : null}{" "}
            You can restore it later from the Inactive filter.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={archiving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
            disabled={archiving}
          >
            {archiving && <Loader2 className="animate-spin" />}
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
