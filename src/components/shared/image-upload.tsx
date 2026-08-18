"use client";

import * as React from "react";
import Image from "next/image";
import { ImageOff, Link2, Loader2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, isValidUrl } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";
const MAX_BYTES = 5 * 1024 * 1024;

/** Accepts both uploaded paths (/uploads/…) and external http(s) URLs. */
export function isValidImageSrc(value: string) {
  return value.startsWith("/uploads/") || isValidUrl(value);
}

type UploadResponse = { url?: string; error?: string };

/**
 * Uploads via XHR rather than fetch so the progress bar reflects real bytes
 * sent instead of a spinner that guesses.
 */
function uploadFile(
  file: File,
  onProgress: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    body.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      let payload: UploadResponse = {};
      try {
        payload = JSON.parse(xhr.responseText) as UploadResponse;
      } catch {
        reject(new Error("The server returned an unreadable response."));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload.url) {
        resolve(payload.url);
      } else {
        reject(new Error(payload.error ?? "Upload failed. Please try again."));
      }
    });

    xhr.addEventListener("error", () =>
      reject(new Error("Network error while uploading.")),
    );
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled.")));

    xhr.send(body);
  });
}

export type ImageUploadProps = {
  value: string;
  onChange: (value: string) => void;
  /** Reported to the parent so it can surface the message in its own error slot. */
  onError?: (message: string | null) => void;
  disabled?: boolean;
  /** Tailwind aspect class for the preview area. */
  aspectClassName?: string;
  /** Element id for the label to point at. */
  id?: string;
  className?: string;
};

export function ImageUpload({
  value,
  onChange,
  onError,
  disabled,
  aspectClassName = "aspect-square",
  id,
  className,
}: ImageUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = React.useState(false);
  const [urlDraft, setUrlDraft] = React.useState("");
  const [previewFailed, setPreviewFailed] = React.useState(false);

  const uploading = progress !== null;

  const report = React.useCallback(
    (message: string | null) => {
      setError(message);
      onError?.(message);
    },
    [onError],
  );

  const handleFiles = React.useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        report("That file is not an image.");
        return;
      }
      if (file.size > MAX_BYTES) {
        report("Image must be 5 MB or smaller.");
        return;
      }

      report(null);
      setProgress(0);
      try {
        const url = await uploadFile(file, setProgress);
        setPreviewFailed(false);
        onChange(url);
      } catch (e) {
        report(e instanceof Error ? e.message : "Upload failed.");
      } finally {
        setProgress(null);
        // Allow re-selecting the same file after a failure.
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onChange, report],
  );

  function applyUrl() {
    const next = urlDraft.trim();
    if (!next) return;
    if (!isValidImageSrc(next)) {
      report("Enter a valid image URL starting with http:// or https://");
      return;
    }
    report(null);
    setPreviewFailed(false);
    onChange(next);
    setUrlDraft("");
    setShowUrlInput(false);
  }

  function clear() {
    report(null);
    setPreviewFailed(false);
    onChange("");
  }

  const hasImage = value !== "" && !previewFailed;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Preview / drop zone */}
      <div
        onDragOver={(e) => {
          if (disabled || uploading) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          if (disabled || uploading) return;
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "group relative w-full overflow-hidden rounded-md border border-dashed bg-muted/40 transition-colors",
          aspectClassName,
          dragging && "border-primary bg-primary/5",
          !hasImage && !disabled && !uploading && "hover:border-primary/60",
        )}
      >
        {hasImage ? (
          <>
            <Image
              src={value}
              alt=""
              fill
              unoptimized
              className="object-cover"
              onError={() => setPreviewFailed(true)}
            />
            {!disabled && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload /> Replace
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={clear}
                  disabled={uploading}
                >
                  <Trash2 /> Remove
                </Button>
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            id={id}
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="flex size-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="size-7 animate-spin" />
                <span className="text-xs tabular-nums">
                  Uploading… {progress}%
                </span>
              </>
            ) : previewFailed ? (
              <>
                <ImageOff className="size-7" />
                <span className="text-xs">
                  Image could not be loaded — click to upload another
                </span>
              </>
            ) : (
              <>
                <Upload className="size-7" />
                <span className="text-sm font-medium text-foreground">
                  Click to upload
                </span>
                <span className="text-xs">
                  or drag and drop · JPG, PNG, WebP, AVIF, GIF · max 5 MB
                </span>
              </>
            )}
          </button>
        )}

        {/* Progress bar over an existing preview */}
        {uploading && hasImage && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {/* URL fallback */}
      {showUrlInput ? (
        <div className="flex gap-2">
          <Input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyUrl();
              }
            }}
            placeholder="https://…/image.jpg"
            type="url"
            inputMode="url"
            disabled={disabled}
            autoFocus
          />
          <Button type="button" variant="outline" onClick={applyUrl} disabled={disabled}>
            Use
          </Button>
        </div>
      ) : (
        !disabled && (
          <button
            type="button"
            onClick={() => setShowUrlInput(true)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            <Link2 className="size-3.5" /> Use an image URL instead
          </button>
        )
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
