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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload, isValidImageSrc } from "@/components/shared/image-upload";
import { isValidUrl, slugify } from "@/lib/utils";

import { emptyBrandForm, type Brand, type BrandFormValues } from "./types";

type FormErrors = Partial<Record<keyof BrandFormValues, string>>;

function validate(
  values: BrandFormValues,
  existingSlugs: string[],
): FormErrors {
  const errors: FormErrors = {};
  const name = values.name.trim();
  const slug = values.slug.trim();

  if (!name) errors.name = "Brand name is required.";
  else if (name.length < 2) errors.name = "Name must be at least 2 characters.";
  else if (name.length > 60) errors.name = "Name must be 60 characters or less.";

  if (!slug) errors.slug = "Slug is required.";
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    errors.slug = "Use lowercase letters, numbers and hyphens only.";
  else if (existingSlugs.includes(slug))
    errors.slug = "This slug is already in use.";

  if (values.website.trim() && !isValidUrl(values.website.trim()))
    errors.website = "Enter a valid URL starting with http:// or https://";

  if (values.logoUrl.trim() && !isValidImageSrc(values.logoUrl.trim()))
    errors.logoUrl = "Upload a logo or enter a valid image URL.";

  if (values.description.length > 300)
    errors.description = "Description must be 300 characters or less.";

  return errors;
}

function toFormValues(brand?: Brand | null): BrandFormValues {
  if (!brand) return emptyBrandForm;
  return {
    name: brand.name,
    slug: brand.slug,
    website: brand.website ?? "",
    logoUrl: brand.logoUrl ?? "",
    description: brand.description ?? "",
    status: brand.status,
  };
}

type BrandFormProps = {
  brand?: Brand | null;
  takenSlugs: string[];
  onCancel: () => void;
  onSubmit: (values: BrandFormValues) => Promise<void> | void;
};

function BrandForm({ brand, takenSlugs, onCancel, onSubmit }: BrandFormProps) {
  const isEdit = Boolean(brand);
  const [values, setValues] = React.useState<BrandFormValues>(() =>
    toFormValues(brand),
  );
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [slugTouched, setSlugTouched] = React.useState(isEdit);
  const [submitting, setSubmitting] = React.useState(false);

  const set =
    <K extends keyof BrandFormValues>(key: K) =>
    (value: BrandFormValues[K]) => {
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
    const otherSlugs = takenSlugs.filter((s) => s !== brand?.slug);
    const nextErrors = validate(values, otherSlugs);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        ...values,
        name: values.name.trim(),
        slug: values.slug.trim(),
        website: values.website.trim(),
        logoUrl: values.logoUrl.trim(),
        description: values.description.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit brand" : "Add brand"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update the brand details below."
            : "Create a new brand. You can edit these details later."}
        </DialogDescription>
      </DialogHeader>

      <FieldGroup className="py-4">
        <Field data-invalid={Boolean(errors.name) || undefined}>
          <FieldLabel htmlFor="brand-name">
            Name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="brand-name"
            value={values.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Berger Paints"
            aria-invalid={Boolean(errors.name) || undefined}
            autoFocus
          />
          <FieldError>{errors.name}</FieldError>
        </Field>

        <Field data-invalid={Boolean(errors.slug) || undefined}>
          <FieldLabel htmlFor="brand-slug">
            Slug <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="brand-slug"
            value={values.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug")(e.target.value);
            }}
            placeholder="berger-paints"
            className="font-mono"
            aria-invalid={Boolean(errors.slug) || undefined}
          />
          <FieldDescription>
            Used in URLs. Auto-generated from the name.
          </FieldDescription>
          <FieldError>{errors.slug}</FieldError>
        </Field>

        <div className="grid gap-6 sm:grid-cols-[1fr_9rem]">
          <Field data-invalid={Boolean(errors.website) || undefined}>
            <FieldLabel htmlFor="brand-website">Website</FieldLabel>
            <Input
              id="brand-website"
              type="url"
              inputMode="url"
              value={values.website}
              onChange={(e) => set("website")(e.target.value)}
              placeholder="https://example.com"
              aria-invalid={Boolean(errors.website) || undefined}
            />
            <FieldError>{errors.website}</FieldError>
          </Field>

          <Field data-invalid={Boolean(errors.logoUrl) || undefined}>
            <FieldLabel htmlFor="brand-logo">Logo</FieldLabel>
            <ImageUpload
              id="brand-logo"
              value={values.logoUrl}
              onChange={(url) => set("logoUrl")(url)}
              onError={(message) =>
                setErrors((e) => ({ ...e, logoUrl: message ?? undefined }))
              }
              disabled={submitting}
            />
            <FieldError>{errors.logoUrl}</FieldError>
          </Field>
        </div>

        <Field data-invalid={Boolean(errors.description) || undefined}>
          <FieldLabel htmlFor="brand-description">Description</FieldLabel>
          <Textarea
            id="brand-description"
            value={values.description}
            onChange={(e) => set("description")(e.target.value)}
            placeholder="Short description of the brand"
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
            <FieldLabel htmlFor="brand-status">Active</FieldLabel>
            <FieldDescription>
              Inactive brands are hidden from the storefront.
            </FieldDescription>
          </FieldContent>
          <Switch
            id="brand-status"
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
          {isEdit ? "Save changes" : "Create brand"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export type BrandFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog is in edit mode. */
  brand?: Brand | null;
  /** Slugs of all brands (for uniqueness validation). */
  takenSlugs: string[];
  onSubmit: (values: BrandFormValues) => Promise<void> | void;
};

export function BrandFormDialog({
  open,
  onOpenChange,
  brand,
  takenSlugs,
  onSubmit,
}: BrandFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* key forces a fresh form per brand / per open */}
        <BrandForm
          key={brand?.id ?? "new"}
          brand={brand}
          takenSlugs={takenSlugs}
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
