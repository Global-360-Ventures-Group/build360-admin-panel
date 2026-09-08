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

import type { Product } from "./types";

/**
 * Confirmation for archiving a product.
 *
 * Replaces a "Delete product?" dialog that offered a permanent delete and bulk
 * selection. Neither exists in the API: `DELETE /admin/products/{id}` sets the
 * status to INACTIVE, one product at a time, and restore brings it back.
 */
export type ArchiveProductDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onConfirm: (product: Product) => Promise<void> | void;
};

export function ArchiveProductDialog({
  open,
  onOpenChange,
  product,
  onConfirm,
}: ArchiveProductDialogProps) {
  const [archiving, setArchiving] = React.useState(false);

  async function handleConfirm() {
    if (!product) return;

    setArchiving(true);
    try {
      await onConfirm(product);
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
          <AlertDialogTitle>Archive product?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium text-foreground">{product?.name}</span>{" "}
            will be set to inactive and hidden from the storefront. Its images
            and details are kept, and you can restore it later from the Inactive
            filter.
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
