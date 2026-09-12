"use client";

import * as React from "react";
import { ImagePlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { MAX_IMAGE_BYTES, formatBytes, prepareImageForUpload } from "@/lib/images";

/** Exactly what the media endpoint accepts: "Allowed: PNG, JPEG, SVG." */
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

export type ImageSlotFieldProps = {
  /**
   * Form field prefix. `"icon"` submits `iconFile`,
   * `existingIconObjectKey` and `removeIcon`, which is what the server
   * actions read.
   */
  field: string;
  label: string;
  /** Currently stored image, for the initial preview. */
  existingUrl?: string;
  /** Its object key, resubmitted unless the image is replaced or removed. */
  existingObjectKey?: string;
  error?: string;
  description?: string;
  disabled?: boolean;
};

/**
 * One image slot on a form, uploaded when the form is submitted.
 *
 * Deferring the upload is not a style preference. The API has no endpoint that
 * deletes media, so uploading the moment a file was picked left an
 * unreachable object in the bucket every time a dialog was cancelled or a
 * user changed their mind. Here the file stays in the input — which is also
 * what carries it into the form's submission — and the preview comes from a
 * local blob URL.
 *
 * Three states have to be distinguishable downstream, because the update
 * endpoints are a full replace and an omitted key clears the field:
 *
 * - a new file            -> `<field>File` is populated
 * - untouched             -> `existing<Field>ObjectKey` is resubmitted
 * - explicitly removed    -> `remove<Field>` is "true"
 */
export function ImageSlotField({
  field,
  label,
  existingUrl,
  existingObjectKey,
  error,
  description,
  disabled,
}: ImageSlotFieldProps) {
  const [pickedName, setPickedName] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [removed, setRemoved] = React.useState(false);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [preparing, setPreparing] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Blob URLs leak until revoked.
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const capitalised = field.charAt(0).toUpperCase() + field.slice(1);
  const shown = previewUrl ?? (removed ? null : existingUrl ?? null);
  const shownError = fileError ?? error;

  function revokePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    setFileError(null);

    if (!file) {
      revokePreview();
      setPickedName(null);
      return;
    }

    // Checked on selection so a wrong file is caught immediately rather than
    // after the rest of the form is filled in. The API is still the authority:
    // it also rejects images it cannot decode, which nothing here can predict.
    if (!ACCEPTED_TYPES.includes(file.type)) {
      input.value = "";
      revokePreview();
      setPickedName(null);
      setFileError("Choose a PNG, JPEG or SVG file.");
      return;
    }

    setPreparing(true);
    try {
      const prepared = await prepareImageForUpload(file);

      // Beyond what shrinking can fix — in practice a transparent PNG, the one
      // kind that cannot be flattened to JPEG. Said here, plainly, rather than
      // letting the submission come back as a 413 the form cannot explain.
      if (prepared.size > MAX_IMAGE_BYTES) {
        input.value = "";
        revokePreview();
        setPickedName(null);
        setFileError(
          `Still ${formatBytes(prepared.size)} after compressing, over the ` +
            `${formatBytes(MAX_IMAGE_BYTES)} limit. Save it as a JPEG, or use ` +
            `a smaller one.`,
        );
        return;
      }

      // The input is what carries the file into the form's submission, so the
      // shrunk version has to replace what was picked. Assigning a FileList
      // built here is the only way to put a File back into an input.
      if (prepared !== file) {
        const replacement = new DataTransfer();
        replacement.items.add(prepared);
        input.files = replacement.files;
      }

      revokePreview();
      setPreviewUrl(URL.createObjectURL(prepared));
      setPickedName(prepared.name);
      setRemoved(false);
    } finally {
      setPreparing(false);
    }
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    revokePreview();
    setPickedName(null);
    setFileError(null);
    setRemoved(true);
  }

  return (
    <Field data-invalid={Boolean(shownError) || undefined}>
      <FieldLabel>{label}</FieldLabel>

      <input
        type="hidden"
        name={`existing${capitalised}ObjectKey`}
        value={existingObjectKey ?? ""}
      />
      <input type="hidden" name={`remove${capitalised}`} value={String(removed)} />

      <div className="flex items-center gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {shown ? (
            /* A blob: URL from the locally picked file cannot go through
               next/image, and there is nothing to optimise for a preview that
               never leaves the browser. */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" className="size-full object-contain" />
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
              onClick={() => inputRef.current?.click()}
              disabled={disabled || preparing}
            >
              <ImagePlus />
              {shown ? "Replace" : "Choose file"}
            </Button>
            {shown ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clear}
                disabled={disabled || preparing}
              >
                <Trash2 /> Remove
              </Button>
            ) : null}
          </div>
          {preparing ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Preparing image&hellip;
            </p>
          ) : pickedName ? (
            <p className="mt-1.5 truncate text-xs text-muted-foreground">
              {pickedName}
            </p>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          name={`${field}File`}
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
        />
      </div>

      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError>{shownError}</FieldError>
    </Field>
  );
}
