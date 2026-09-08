"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ImageSlotField } from "@/components/shared/image-slot-field";
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
import { slugify } from "@/lib/utils";

import { saveCategoryAction } from "./actions";
import {
  CATEGORY_LIMITS,
  NO_PARENT,
  type Category,
} from "./types";

export type CategoryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The category being edited, or null to create one. */
  category: Category | null;
  /** Pre-selected parent when creating a subcategory from a row. */
  defaultParentId?: string | null;
  /** Every category, for the parent picker. */
  allCategories: Category[];
};

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  defaultParentId,
  allCategories,
}: CategoryFormDialogProps) {
  // Remounting resets the form and the action state together, so reopening
  // never shows the previous submission's errors.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open ? (
          <CategoryForm
            key={category?.id ?? `new-${defaultParentId ?? "root"}`}
            category={category}
            defaultParentId={defaultParentId ?? null}
            allCategories={allCategories}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({
  category,
  defaultParentId,
  allCategories,
  onDone,
}: {
  category: Category | null;
  defaultParentId: string | null;
  allCategories: Category[];
  onDone: () => void;
}) {
  const isEdit = category !== null;

  const [state, formAction, pending] = React.useActionState(
    saveCategoryAction,
    undefined,
  );

  const [name, setName] = React.useState(category?.name ?? "");
  const [slug, setSlug] = React.useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = React.useState(isEdit);
  const [parentId, setParentId] = React.useState<string>(
    category?.parentId ?? defaultParentId ?? NO_PARENT,
  );

  const settled = React.useRef(false);
  React.useEffect(() => {
    if (state?.status === "success" && !settled.current) {
      settled.current = true;
      toast.success(state.message ?? "Saved.");
      onDone();
    }
  }, [state, onDone]);

  /**
   * Candidate parents.
   *
   * When editing, a category cannot be its own parent nor a descendant's
   * child. That guard is belt-and-braces here — the picker is disabled while
   * editing, because the API cannot re-parent at all.
   */
  const parentItems = React.useMemo(() => {
    const options = allCategories
      .filter((candidate) => candidate.id !== category?.id)
      .sort((a, b) => a.fullPath.localeCompare(b.fullPath))
      .map((candidate) => ({ value: candidate.id, label: candidate.fullPath }));

    return [{ value: NO_PARENT, label: "No parent (top level)" }, ...options];
  }, [allCategories, category?.id]);

  const fieldErrors = state?.fieldErrors;
  const busy = pending;

  return (
    <form
      action={formAction}
      noValidate
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <input type="hidden" name="id" value={category?.id ?? ""} />
      {/*
        parentId is only sent when creating. CategoryUpdateRequest has no such
        field, so an existing category's parent cannot be changed.
      */}
      <input
        type="hidden"
        name="parentId"
        value={isEdit || parentId === NO_PARENT ? "" : parentId}
      />

      <DialogHeader>
        <DialogTitle>
          {isEdit ? "Edit category" : "Add category"}
        </DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update the category details below."
            : "Create a category, or pick a parent to nest it under one."}
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
            <FieldLabel htmlFor="category-name">
              Name <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="category-name"
              name="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              placeholder="e.g. Cement & Concretes"
              maxLength={CATEGORY_LIMITS.name}
              aria-invalid={Boolean(fieldErrors?.name) || undefined}
              disabled={busy}
              autoFocus
            />
            <FieldError>{fieldErrors?.name}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="category-parent">Parent</FieldLabel>
            <Select
              value={parentId}
              onValueChange={(value) => setParentId(value ?? NO_PARENT)}
              items={parentItems}
              disabled={busy || isEdit}
            >
              <SelectTrigger
                id="category-parent"
                className="w-full"
                aria-label="Parent category"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {parentItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              {isEdit
                ? "The parent cannot be changed after creation — the API has no way to move a category."
                : "Leave as top level, or nest this under an existing category."}
            </FieldDescription>
          </Field>

          <Field data-invalid={Boolean(fieldErrors?.slug) || undefined}>
            <FieldLabel htmlFor="category-slug">Slug</FieldLabel>
            <Input
              id="category-slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="cement-concretes"
              className="font-mono"
              maxLength={CATEGORY_LIMITS.slug}
              aria-invalid={Boolean(fieldErrors?.slug) || undefined}
              disabled={busy}
            />
            <FieldDescription>
              Used in storefront URLs. Leave blank and the API will derive one
              from the name.
            </FieldDescription>
            <FieldError>{fieldErrors?.slug}</FieldError>
          </Field>

          <Field data-invalid={Boolean(fieldErrors?.shortLabel) || undefined}>
            <FieldLabel htmlFor="category-short-label">Short label</FieldLabel>
            <Input
              id="category-short-label"
              name="shortLabel"
              defaultValue={category?.shortLabel ?? ""}
              placeholder="Cement"
              maxLength={CATEGORY_LIMITS.shortLabel}
              aria-invalid={Boolean(fieldErrors?.shortLabel) || undefined}
              disabled={busy}
            />
            <FieldDescription>
              Compact name for storefront navigation, where the full name is too
              long.
            </FieldDescription>
            <FieldError>{fieldErrors?.shortLabel}</FieldError>
          </Field>

          <Field data-invalid={Boolean(fieldErrors?.sortOrder) || undefined}>
            <FieldLabel htmlFor="category-sort-order">Sort order</FieldLabel>
            <Input
              id="category-sort-order"
              name="sortOrder"
              type="number"
              min={0}
              step={10}
              defaultValue={category ? String(category.sortOrder) : ""}
              placeholder="10"
              aria-invalid={Boolean(fieldErrors?.sortOrder) || undefined}
              disabled={busy}
            />
            <FieldDescription>
              Lower values appear first among siblings. Existing categories use
              steps of 10, leaving room to insert between them.
            </FieldDescription>
            <FieldError>{fieldErrors?.sortOrder}</FieldError>
          </Field>

          <ImageSlotField
            field="icon"
            label="Icon"
            existingUrl={category?.iconUrl}
            existingObjectKey={category?.iconObjectKey}
            error={fieldErrors?.icon}
            description="Small monochrome mark for navigation. SVG works best."
            disabled={busy}
          />

          <ImageSlotField
            field="image"
            label="Cover image"
            existingUrl={category?.imageUrl}
            existingObjectKey={category?.imageObjectKey}
            error={fieldErrors?.image}
            description="Larger photo used on category landing pages."
            disabled={busy}
          />
        </FieldGroup>
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {isEdit ? "Save changes" : "Create category"}
        </Button>
      </DialogFooter>
    </form>
  );
}
