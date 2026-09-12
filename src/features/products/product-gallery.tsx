"use client";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  MAX_BATCH_BYTES,
  MAX_IMAGE_BYTES,
  formatBytes,
  prepareImageForUpload,
} from "@/lib/images";
import { cn } from "@/lib/utils";

import {
  addProductImagesAction,
  deleteProductImageAction,
  reorderProductImagesAction,
} from "./actions";
import type { ProductImage } from "./types";

/** Exactly what the media endpoint accepts: "Allowed: PNG, JPEG, SVG." */
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

/**
 * A product's image gallery.
 *
 * Only reachable once the product exists: `POST /admin/products` takes an
 * inline `images` array, but `PUT` does not, so after creation the gallery is
 * managed solely through `/admin/products/{id}/images`. That is why this sits
 * beside the form rather than inside it, and why creating a product is a
 * two-step flow — save, then add images.
 *
 * Reordering and setting the primary both go through the same endpoint, which
 * demands the **complete** gallery with exactly one primary and rejects
 * anything else without changing state. So every mutation here is computed
 * from the full list, never a delta.
 */
export function ProductGallery({
  productId,
  images,
  canEdit,
}: {
  productId: string;
  images: ProductImage[];
  canEdit: boolean;
}) {
  const [pending, setPending] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Server order is authoritative; this only guards against a missing sort.
  const ordered = React.useMemo(
    () => [...images].sort((a, b) => a.displayOrder - b.displayOrder),
    [images],
  );

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const rejected = files.filter((file) => !ACCEPTED_TYPES.includes(file.type));
    if (rejected.length > 0) {
      // The upload is all-or-nothing at the API, so stop before sending
      // rather than have the whole batch rejected server-side.
      toast.error("Only PNG, JPEG and SVG files can be uploaded", {
        description: rejected.map((file) => file.name).join(", "),
      });
      return;
    }

    setUploading(true);
    try {
      // Shrunk before anything is measured: the whole batch travels in one
      // Server Action request, and originals off a phone blow its body limit
      // several times over.
      const prepared = await Promise.all(files.map(prepareImageForUpload));

      const tooLarge = prepared.filter((file) => file.size > MAX_IMAGE_BYTES);
      if (tooLarge.length > 0) {
        toast.error(`Each image must be under ${formatBytes(MAX_IMAGE_BYTES)}`, {
          description: tooLarge
            .map((file) => `${file.name} (${formatBytes(file.size)})`)
            .join(", "),
        });
        return;
      }

      const total = prepared.reduce((sum, file) => sum + file.size, 0);
      if (total > MAX_BATCH_BYTES) {
        toast.error(`That is ${formatBytes(total)} of images at once`, {
          description: `One upload can carry ${formatBytes(
            MAX_BATCH_BYTES,
          )}. Add them in smaller batches.`,
        });
        return;
      }

      const body = new FormData();
      for (const file of prepared) body.append("files", file);

      const result = await addProductImagesAction(productId, body);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    } finally {
      setUploading(false);
    }
  }

  /** Send the whole gallery with a new order and primary. */
  async function apply(
    next: ProductImage[],
    marker: string,
    successMessage?: string,
  ) {
    setPending(marker);
    try {
      const result = await reorderProductImagesAction(
        productId,
        next.map((image, index) => ({
          imageId: image.id,
          // Rebuilt from position rather than reusing stored values, so the
          // order is always a clean 1..n with no gaps or duplicates.
          displayOrder: index + 1,
          primary: image.primary,
        })),
      );

      if (result.ok) toast.success(successMessage ?? result.message);
      else toast.error(result.message);
    } finally {
      setPending(null);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;

    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];

    void apply(next, ordered[index].id, "Order updated.");
  }

  function makePrimary(imageId: string) {
    const next = ordered.map((image) => ({
      ...image,
      primary: image.id === imageId,
    }));

    void apply(next, imageId, "Primary image updated.");
  }

  async function remove(image: ProductImage) {
    setPending(image.id);
    try {
      const result = await deleteProductImageAction(productId, image.id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Images</CardTitle>
          <p className="text-sm text-muted-foreground">
            The primary image represents the product in listings.
          </p>
        </div>
        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || pending !== null}
          >
            {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            {uploading ? "Uploading..." : "Add images"}
          </Button>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={handleFiles}
        />
      </CardHeader>

      <CardContent>
        {ordered.length === 0 ? (
          <Empty className="py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ImagePlus />
              </EmptyMedia>
              <EmptyTitle>No images yet</EmptyTitle>
              <EmptyDescription>
                Add at least one image — the first becomes the primary
                automatically.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.map((image, index) => (
              <li
                key={image.id}
                className={cn(
                  "group relative overflow-hidden rounded-lg border",
                  image.primary && "ring-2 ring-primary",
                )}
              >
                <div className="flex aspect-4/3 items-center justify-center bg-muted">
                  {/* Bucket images are already sized for display. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.imageUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                </div>

                {image.primary ? (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                    <Star className="size-3 fill-current" /> Primary
                  </span>
                ) : null}

                {pending === image.id ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-background/60">
                    <Loader2 className="size-5 animate-spin" />
                  </span>
                ) : null}

                {canEdit ? (
                  <div className="flex items-center justify-between gap-1 border-t bg-card p-1.5">
                    <div className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => move(index, -1)}
                        disabled={index === 0 || pending !== null}
                        aria-label="Move earlier"
                      >
                        <ArrowLeft />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => move(index, 1)}
                        disabled={index === ordered.length - 1 || pending !== null}
                        aria-label="Move later"
                      >
                        <ArrowRight />
                      </Button>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {!image.primary ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => makePrimary(image.id)}
                          disabled={pending !== null}
                        >
                          <Star /> Primary
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={() => void remove(image)}
                        disabled={pending !== null}
                        aria-label="Remove image"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
