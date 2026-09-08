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

import type { Brand } from "./types";

/**
 * Confirmation for archiving a brand.
 *
 * This replaced a "Delete brand?" dialog that warned the action could not be
 * undone. That was never true of this API: `DELETE /admin/brands/{id}` sets
 * the brand INACTIVE and it can be restored, so the wording here says what
 * actually happens. Nothing in the API hard-deletes a brand.
 */
export type ArchiveBrandDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: Brand | null;
  onConfirm: (brand: Brand) => Promise<void> | void;
};

export function ArchiveBrandDialog({
  open,
  onOpenChange,
  brand,
  onConfirm,
}: ArchiveBrandDialogProps) {
  const [archiving, setArchiving] = React.useState(false);

  async function handleConfirm() {
    if (!brand) return;

    setArchiving(true);
    try {
      await onConfirm(brand);
      onOpenChange(false);
    } finally {
      setArchiving(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Archive />
          </AlertDialogMedia>
          <AlertDialogTitle>Archive brand?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">{brand?.name}</span>{" "}
            will be set to inactive and hidden from the storefront. You can
            restore it later from the Inactive filter.
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
