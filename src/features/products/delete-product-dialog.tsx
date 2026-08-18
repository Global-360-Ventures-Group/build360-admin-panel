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

export type DeleteProductDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** How many products are being deleted. */
  count: number;
  /** Product name, shown when deleting exactly one. */
  label?: string;
  onConfirm: () => Promise<void> | void;
};

export function DeleteProductDialog({
  open,
  onOpenChange,
  count,
  label,
  onConfirm,
}: DeleteProductDialogProps) {
  const [deleting, setDeleting] = React.useState(false);

  async function handleConfirm() {
    setDeleting(true);
    try {
      await onConfirm();
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
          <AlertDialogTitle>
            {count === 1 ? "Delete product?" : `Delete ${count} products?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {count === 1 && label ? (
              <>
                You are about to delete{" "}
                <span className="font-medium text-foreground">{label}</span>.
              </>
            ) : (
              <>
                You are about to delete{" "}
                <span className="font-medium text-foreground">
                  {count} products
                </span>
                .
              </>
            )}{" "}
            Any orders already referencing{" "}
            {count === 1 ? "it" : "them"} will keep their historical data. This
            action cannot be undone.
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
