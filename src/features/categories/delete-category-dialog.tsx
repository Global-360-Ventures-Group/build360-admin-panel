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

import type { CategoryRow } from "./types";

export type DeleteCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryRow | null;
  /** Total products across the category and all its descendants. */
  affectedProductCount: number;
  onConfirm: (category: CategoryRow) => Promise<void> | void;
};

export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
  affectedProductCount,
  onConfirm,
}: DeleteCategoryDialogProps) {
  const [deleting, setDeleting] = React.useState(false);
  const subCount = category?.descendantCount ?? 0;

  async function handleConfirm() {
    if (!category) return;
    setDeleting(true);
    try {
      await onConfirm(category);
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
            {subCount > 0 ? "Delete category and subcategories?" : "Delete category?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            You are about to delete{" "}
            <span className="font-medium text-foreground">{category?.name}</span>
            {subCount > 0 && (
              <>
                {" "}
                and its{" "}
                <span className="font-medium text-foreground">
                  {subCount} subcategor{subCount === 1 ? "y" : "ies"}
                </span>
              </>
            )}
            . This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {affectedProductCount > 0 && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
            <span className="font-medium tabular-nums">
              {affectedProductCount} product
              {affectedProductCount === 1 ? "" : "s"}
            </span>{" "}
            {affectedProductCount === 1 ? "is" : "are"} assigned to{" "}
            {subCount > 0 ? "these categories" : "this category"} and will become
            uncategorized.
          </div>
        )}

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
