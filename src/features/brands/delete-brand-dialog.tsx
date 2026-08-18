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

import type { Brand } from "./types";

export type DeleteBrandDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: Brand | null;
  onConfirm: (brand: Brand) => Promise<void> | void;
};

export function DeleteBrandDialog({
  open,
  onOpenChange,
  brand,
  onConfirm,
}: DeleteBrandDialogProps) {
  const [deleting, setDeleting] = React.useState(false);

  async function handleConfirm() {
    if (!brand) return;
    setDeleting(true);
    try {
      await onConfirm(brand);
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete brand?</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to delete{" "}
            <span className="font-medium text-foreground">{brand?.name}</span>.
            {brand && brand.productCount > 0 && (
              <>
                {" "}
                This brand is linked to{" "}
                <span className="font-medium text-foreground">
                  {brand.productCount} product{brand.productCount === 1 ? "" : "s"}
                </span>
                .
              </>
            )}{" "}
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
            disabled={deleting}
          >
            {deleting && <Loader2 className="animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
