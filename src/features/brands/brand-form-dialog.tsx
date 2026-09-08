"use client";

import * as React from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils";

import { saveBrandAction } from "./actions";
import { BRAND_LIMITS, type Brand } from "./types";

/** Exactly what the media endpoint accepts: "Allowed: PNG, JPEG, SVG." */
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

export type BrandFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The brand being edited, or null to create one. */
  brand: Brand | null;
};

export function BrandFormDialog({
  open,
  onOpenChange,
  brand,
}: BrandFormDialogProps) {
  // Remounting on open, and on switching which brand is edited, resets the
  // form and the action state together. Without the key the dialog would
  // reopen showing the previous submission's errors.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open ? (
          <BrandForm
            key={brand?.id ?? "new"}
            brand={brand}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function BrandForm({
  brand,
  onDone,
}: {
  brand: Brand | null;
  onDone: () => void;
}) {
  const isEdit = brand !== null;

  const [state, formAction, pending] = React.useActionState(
    saveBrandAction,
    undefined,
  );

  const [name, setName] = React.useState(brand?.name ?? "");
  const [slug, setSlug] = React.useState(brand?.slug ?? "");
  // Once the slug has been touched, stop deriving it from the name.
  const [slugTouched, setSlugTouched] = React.useState(isEdit);

  /**
   * The logo is held locally and only uploaded when the form is submitted.
   *
   * It used to upload the moment a file was picked, which read as
   * responsive but leaked: the API has no endpoint that deletes media, so
   * cancelling the dialog -- or picking a second logo before saving -- left
   * objects in the bucket that nothing could ever remove.
   *
   * `pickedName` mirrors the file input purely so the UI can react; the input
   * itself stays the source of truth so the file rides along in the form's
   * own submission.
   */
  const [pickedName, setPickedName] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = React.useState(false);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Blob URLs are leaked memory until revoked.
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const shownLogo = previewUrl ?? (removeLogo ? null : brand?.logoUrl ?? null);

  // The action reports success once, then the dialog closes.
  const settled = React.useRef(false);
  React.useEffect(() => {
    if (state?.status === "success" && !settled.current) {
      settled.current = true;
      toast.success(state.message ?? "Saved.");
      onDone();
    }
  }, [state, onDone]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setFileError(null);

    if (!file) {
      revokePreview();
      setPickedName(null);
      return;
    }

    // Checked here rather than at save time, so a wrong file is caught the
    // moment it is chosen instead of after filling in the rest of the form.
    // The API is still the authority -- it also rejects images it cannot
    // decode, which nothing client-side can tell in advance.
    if (!ACCEPTED_TYPES.includes(file.type)) {
      event.target.value = "";
      revokePreview();
      setPickedName(null);
      setFileError("Choose a PNG, JPEG or SVG file.");
      return;
    }

    revokePreview();
    setPreviewUrl(URL.createObjectURL(file));
    setPickedName(file.name);
    setRemoveLogo(false);
  }

  function revokePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  function clearLogo() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    revokePreview();
    setPickedName(null);
    setFileError(null);
    // Only meaningful when editing: tells the action to drop the stored logo
    // rather than resubmit its key.
    setRemoveLogo(true);
  }

  const fieldErrors = state?.fieldErrors;
  const logoError = fileError ?? fieldErrors?.logoObjectKey;
  const busy = pending;

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="id" value={brand?.id ?? ""} />
      {/*
        The key of the logo already stored. Update is a full replace at the
        API, so this has to be resubmitted or the logo would be cleared by an
        edit that never touched it.
      */}
      <input
        type="hidden"
        name="existingLogoObjectKey"
        value={brand?.logoObjectKey ?? ""}
      />
      <input type="hidden" name="removeLogo" value={String(removeLogo)} />

      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit brand" : "Add brand"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update the brand details below."
            : "Create a new brand. You can edit these details later."}
        </DialogDescription>
      </DialogHeader>

      {state?.status === "error" && state.message ? (
        <div
          role="alert"
          className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.message}
        </div>
      ) : null}

      <FieldGroup className="py-4">
        <Field data-invalid={Boolean(fieldErrors?.name) || undefined}>
          <FieldLabel htmlFor="brand-name">
            Name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="brand-name"
            name="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="e.g. Berger Paints"
            maxLength={BRAND_LIMITS.name}
            aria-invalid={Boolean(fieldErrors?.name) || undefined}
            disabled={busy}
            autoFocus
          />
          <FieldError>{fieldErrors?.name}</FieldError>
        </Field>

        <Field data-invalid={Boolean(fieldErrors?.slug) || undefined}>
          <FieldLabel htmlFor="brand-slug">Slug</FieldLabel>
          <Input
            id="brand-slug"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="berger-paints"
            className="font-mono"
            maxLength={BRAND_LIMITS.slug}
            aria-invalid={Boolean(fieldErrors?.slug) || undefined}
            disabled={busy}
          />
          <FieldDescription>
            Used in storefront URLs. Leave blank and the API will derive one
            from the name.
          </FieldDescription>
          <FieldError>{fieldErrors?.slug}</FieldError>
        </Field>

        <Field data-invalid={Boolean(logoError) || undefined}>
          <FieldLabel>Logo</FieldLabel>
          <div className="flex items-center gap-3">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
              {shownLogo ? (
                /* A blob: URL from the locally picked file cannot go through
                   next/image, and there is nothing to optimise for a preview
                   that never leaves the browser. */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shownLogo}
                  alt=""
                  className="size-full object-contain"
                />
              ) : (
                <ImagePlus className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                >
                  <ImagePlus />
                  {shownLogo ? "Replace" : "Choose file"}
                </Button>
                {shownLogo ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearLogo}
                    disabled={busy}
                  >
                    <Trash2 /> Remove
                  </Button>
                ) : null}
              </div>
              {pickedName ? (
                <p className="mt-1.5 truncate text-xs text-muted-foreground">
                  {pickedName}
                </p>
              ) : null}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              name="logoFile"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={handleFileChange}
              disabled={busy}
            />
          </div>
          <FieldDescription>
            PNG, JPEG or SVG. Uploaded when you save, so cancelling leaves
            nothing behind.
          </FieldDescription>
          <FieldError>{logoError}</FieldError>
        </Field>

        <Field data-invalid={Boolean(fieldErrors?.description) || undefined}>
          <FieldLabel htmlFor="brand-description">Description</FieldLabel>
          <Textarea
            id="brand-description"
            name="description"
            defaultValue={brand?.description ?? ""}
            placeholder="Short description of the brand."
            rows={3}
            maxLength={BRAND_LIMITS.description}
            aria-invalid={Boolean(fieldErrors?.description) || undefined}
            disabled={busy}
          />
          <FieldError>{fieldErrors?.description}</FieldError>
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {isEdit ? "Save changes" : "Create brand"}
        </Button>
      </DialogFooter>
    </form>
  );
}
