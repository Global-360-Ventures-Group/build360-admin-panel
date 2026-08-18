"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload, isValidImageSrc } from "@/components/shared/image-upload";
import { slugify } from "@/lib/utils";

import {
  NO_PARENT,
  emptyCategoryForm,
  getDescendantIds,
  getPathLabel,
  type Category,
  type CategoryFormValues,
} from "./types";

type FormErrors = Partial<Record<keyof CategoryFormValues, string>>;

function validate(
  values: CategoryFormValues,
  takenSlugs: string[],
): FormErrors {
  const errors: FormErrors = {};
  const name = values.name.trim();
  const slug = values.slug.trim();

  if (!name) errors.name = "Category name is required.";
  else if (name.length < 2) errors.name = "Name must be at least 2 characters.";
  else if (name.length > 60) errors.name = "Name must be 60 characters or less.";

  if (!slug) errors.slug = "Slug is required.";
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    errors.slug = "Use lowercase letters, numbers and hyphens only.";
  else if (takenSlugs.includes(slug))
    errors.slug = "This slug is already in use.";

  if (values.imageUrl.trim() && !isValidImageSrc(values.imageUrl.trim()))
    errors.imageUrl = "Upload an image or enter a valid image URL.";

  if (values.description.length > 300)
    errors.description = "Description must be 300 characters or less.";

  if (!Number.isFinite(values.sortOrder))
    errors.sortOrder = "Enter a number.";
  else if (values.sortOrder < 0 || values.sortOrder > 999)
    errors.sortOrder = "Must be between 0 and 999.";

  return errors;
}

function toFormValues(
  category: Category | null | undefined,
  defaultParentId: string | null,
): CategoryFormValues {
  if (!category) return { ...emptyCategoryForm, parentId: defaultParentId };
  return {
    name: category.name,
    slug: category.slug,
    parentId: category.parentId,
    description: category.description ?? "",
    imageUrl: category.imageUrl ?? "",
    sortOrder: category.sortOrder,
    status: category.status,
  };
}

type CategoryFormProps = {
  category?: Category | null;
  categories: Category[];
  defaultParentId: string | null;
  onCancel: () => void;
  onSubmit: (values: CategoryFormValues) => Promise<void> | void;
};

function CategoryForm({
  category,
  categories,
  defaultParentId,
  onCancel,
  onSubmit,
}: CategoryFormProps) {
  const isEdit = Boolean(category);
  const [values, setValues] = React.useState<CategoryFormValues>(() =>
    toFormValues(category, defaultParentId),
  );
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [slugTouched, setSlugTouched] = React.useState(isEdit);
  const [submitting, setSubmitting] = React.useState(false);

  /**
   * Valid parents: every category except the one being edited and all of its
   * descendants — otherwise the tree would contain a cycle.
   */
  const parentItems = React.useMemo(() => {
    const blocked = category
      ? new Set([category.id, ...getDescendantIds(categories, category.id)])
      : new Set<string>();

    const options = categories
      .filter((c) => !blocked.has(c.id))
      .map((c) => ({
        value: c.id,
        label: getPathLabel(categories, c.id),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ value: NO_PARENT, label: "None (top level)" }, ...options];
  }, [categories, category]);

  const set =
    <K extends keyof CategoryFormValues>(key: K) =>
    (value: CategoryFormValues[K]) => {
      setValues((v) => ({ ...v, [key]: value }));
      setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
    };

  function handleNameChange(name: string) {
    setValues((v) => ({
      ...v,
      name,
      slug: slugTouched ? v.slug : slugify(name),
    }));
    setErrors((e) =>
      e.name || e.slug ? { ...e, name: undefined, slug: undefined } : e,
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const otherSlugs = categories
      .filter((c) => c.id !== category?.id)
      .map((c) => c.slug);
    const nextErrors = validate(values, otherSlugs);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        ...values,
        name: values.name.trim(),
        slug: values.slug.trim(),
        description: values.description.trim(),
        imageUrl: values.imageUrl.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit category" : "Add category"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update the category details below."
            : "Create a new category. Choose a parent to nest it under an existing one."}
        </DialogDescription>
      </DialogHeader>

      <FieldGroup className="py-4">
        <Field data-invalid={Boolean(errors.name) || undefined}>
          <FieldLabel htmlFor="category-name">
            Name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="category-name"
            value={values.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Floor Tiles"
            aria-invalid={Boolean(errors.name) || undefined}
            autoFocus
          />
          <FieldError>{errors.name}</FieldError>
        </Field>

        <Field data-invalid={Boolean(errors.slug) || undefined}>
          <FieldLabel htmlFor="category-slug">
            Slug <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="category-slug"
            value={values.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug")(e.target.value);
            }}
            placeholder="floor-tiles"
            className="font-mono"
            aria-invalid={Boolean(errors.slug) || undefined}
          />
          <FieldDescription>
            Used in URLs. Auto-generated from the name.
          </FieldDescription>
          <FieldError>{errors.slug}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="category-parent">Parent category</FieldLabel>
          <Select
            value={values.parentId ?? NO_PARENT}
            onValueChange={(v) =>
              set("parentId")(v === NO_PARENT || v == null ? null : String(v))
            }
            items={parentItems}
          >
            <SelectTrigger id="category-parent" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {parentItems.map((it) => (
                <SelectItem key={it.value} value={it.value}>
                  {it.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            {isEdit
              ? "A category cannot be moved under itself or its own subcategories."
              : "Leave as “None” to create a top-level category."}
          </FieldDescription>
        </Field>

        <div className="grid gap-6 sm:grid-cols-[9rem_1fr]">
          <Field data-invalid={Boolean(errors.imageUrl) || undefined}>
            <FieldLabel htmlFor="category-image">Image</FieldLabel>
            <ImageUpload
              id="category-image"
              value={values.imageUrl}
              onChange={(url) => set("imageUrl")(url)}
              onError={(message) =>
                setErrors((e) => ({ ...e, imageUrl: message ?? undefined }))
              }
              disabled={submitting}
            />
            <FieldError>{errors.imageUrl}</FieldError>
          </Field>

          <Field data-invalid={Boolean(errors.sortOrder) || undefined}>
            <FieldLabel htmlFor="category-sort">Sort order</FieldLabel>
            <Input
              id="category-sort"
              type="number"
              min={0}
              max={999}
              value={Number.isFinite(values.sortOrder) ? values.sortOrder : ""}
              onChange={(e) => set("sortOrder")(e.target.valueAsNumber)}
              aria-invalid={Boolean(errors.sortOrder) || undefined}
            />
            <FieldDescription>Lower numbers appear first.</FieldDescription>
            <FieldError>{errors.sortOrder}</FieldError>
          </Field>
        </div>

        <Field data-invalid={Boolean(errors.description) || undefined}>
          <FieldLabel htmlFor="category-description">Description</FieldLabel>
          <Textarea
            id="category-description"
            value={values.description}
            onChange={(e) => set("description")(e.target.value)}
            placeholder="Short description of the category"
            rows={3}
            aria-invalid={Boolean(errors.description) || undefined}
          />
          <FieldDescription className="text-right tabular-nums">
            {values.description.length}/300
          </FieldDescription>
          <FieldError>{errors.description}</FieldError>
        </Field>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="category-status">Active</FieldLabel>
            <FieldDescription>
              Inactive categories are hidden from the storefront.
            </FieldDescription>
          </FieldContent>
          <Switch
            id="category-status"
            checked={values.status === "active"}
            onCheckedChange={(checked) =>
              set("status")(checked ? "active" : "inactive")
            }
          />
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          {isEdit ? "Save changes" : "Create category"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export type CategoryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog is in edit mode. */
  category?: Category | null;
  /** All categories — used for the parent picker and slug uniqueness. */
  categories: Category[];
  /** Pre-selected parent when adding a subcategory from a row action. */
  defaultParentId?: string | null;
  onSubmit: (values: CategoryFormValues) => Promise<void> | void;
};

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  categories,
  defaultParentId = null,
  onSubmit,
}: CategoryFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* key forces a fresh form per category / per parent */}
        <CategoryForm
          key={category?.id ?? `new-${defaultParentId ?? "root"}`}
          category={category}
          categories={categories}
          defaultParentId={defaultParentId}
          onCancel={() => onOpenChange(false)}
          onSubmit={async (values) => {
            await onSubmit(values);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
