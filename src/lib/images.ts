/**
 * Preparing picked images for upload, in the browser.
 *
 * Every image on this panel reaches the API through a Server Action, and a
 * Server Action's request body is capped — 1MB by default, and even raised it
 * stays under what a phone camera produces. Exceeding it does not fail
 * gracefully: Next.js answers 413 and the dialog dies with "Body exceeded 1 MB
 * limit", which tells the person choosing a cover photo nothing they can act
 * on.
 *
 * The API itself is not the constraint. Its media endpoint accepts somewhere
 * between 10MB and 20MB (measured; over that it answers 413 "Maximum upload
 * size exceeded"). The ceiling is the hop in front of it, so pictures are
 * shrunk here, where the file is still cheap to touch. Almost nothing is lost:
 * the API re-encodes every upload anyway, and these images are shown at card
 * and thumbnail sizes.
 *
 * Browser-only: `createImageBitmap` and `<canvas>`. Import from client
 * components.
 */

/**
 * Largest a single prepared file may be.
 *
 * Two of these can appear in one category submission (an icon and a cover), so
 * the figure is half the batch budget rather than all of it. Compression below
 * aims an order of magnitude under it, so in practice this only catches images
 * that genuinely cannot be shrunk.
 */
export const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

/**
 * Largest one submission's images may come to in total.
 *
 * Kept comfortably under `serverActions.bodySizeLimit` in `next.config.ts`,
 * which in turn stays under the 4.5MB request ceiling most serverless hosts
 * impose and cannot be configured away.
 */
export const MAX_BATCH_BYTES = 3 * 1024 * 1024;

/** What compression aims for. Well under the cap, so the cap rarely bites. */
const TARGET_BYTES = 800_000;

/**
 * Progressively harder attempts, stopping at the first that hits the target.
 *
 * Resolution goes first because 1600px is already more than any card or
 * thumbnail here shows; quality is only sacrificed once size alone was not
 * enough.
 */
const ATTEMPTS = [
  { maxEdge: 1600, quality: 0.85 },
  { maxEdge: 1600, quality: 0.7 },
  { maxEdge: 1200, quality: 0.7 },
  { maxEdge: 900, quality: 0.6 },
] as const;

/** Files already this small are forwarded untouched — re-encoding one only
 * risks making it worse. */
const PASSTHROUGH_BYTES = 400_000;

/** A human-readable size, for messages about a file being too large. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${Math.round(kilobytes)} KB`;

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

/**
 * Shrink `file` enough to survive the upload, or return it unchanged.
 *
 * Never throws and never returns something larger than it was given, so a
 * caller can use the result unconditionally.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  // SVG is vector: there is no resolution to reduce, and rasterising it would
  // throw away the reason it was chosen.
  if (file.type === "image/svg+xml") return file;

  if (file.size <= PASSTHROUGH_BYTES) return file;

  try {
    return await compress(file);
  } catch {
    // A file the browser cannot decode is left alone. The API rejects what it
    // cannot read, with a more specific message than anything guessable here.
    return file;
  }
}

async function compress(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);

  try {
    // A photograph saved as PNG is the case that used to defeat this: keeping
    // the format meant a 5MB picture came back at 2.4MB and was rejected. JPEG
    // is what the API stores such an image as anyway — it returns a `.jpg` URL
    // for any PNG without transparency — so converting here matches where the
    // file ends up, and takes the same picture to a few hundred KB.
    //
    // Transparency is the one thing JPEG cannot carry, and category icons rely
    // on it, so that case stays PNG and accepts the larger result.
    const type = hasTransparency(bitmap) ? "image/png" : "image/jpeg";

    // PNG ignores the quality argument, so two attempts at one resolution
    // would produce byte-identical output. Only the distinct sizes are worth
    // encoding.
    const attempts =
      type === "image/png"
        ? ATTEMPTS.filter(
            (attempt, index, all) =>
              all.findIndex((other) => other.maxEdge === attempt.maxEdge) === index,
          )
        : ATTEMPTS;

    let best: File | null = null;

    for (const attempt of attempts) {
      const encoded = await render(bitmap, attempt.maxEdge, type, attempt.quality);
      if (!encoded) break;

      if (!best || encoded.size < best.size) best = encoded;
      if (encoded.size <= TARGET_BYTES) break;
    }

    // Re-encoding is not guaranteed to help — a small flat PNG can come back
    // bigger. Keep whichever is smaller.
    if (!best || best.size >= file.size) return file;

    return new File([best], renameFor(file.name, type), {
      type,
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}

/** Draw the bitmap at `maxEdge` or under, and encode it. */
async function render(
  bitmap: ImageBitmap,
  maxEdge: number,
  type: string,
  quality: number,
): Promise<File | null> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );

  return blob ? new File([blob], "image", { type }) : null;
}

/**
 * Whether any pixel is less than fully opaque.
 *
 * Sampled from a small copy rather than the full image: this only decides
 * between two output formats, and scanning forty megapixels to do it would
 * freeze the dialog. Downscaling cannot invent opacity, so a source with
 * transparent pixels still shows them here.
 */
function hasTransparency(bitmap: ImageBitmap): boolean {
  const scale = Math.min(1, 128 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  // Unknown is treated as "has transparency": keeping a PNG wastes bytes,
  // flattening one that needed its alpha ruins the image.
  if (!context) return true;

  context.drawImage(bitmap, 0, 0, width, height);

  const { data } = context.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }

  return false;
}

/** Swap the extension when the format changed, so the name stays honest. */
function renameFor(name: string, type: string): string {
  const extension = type === "image/png" ? "png" : "jpg";
  const stem = name.replace(/\.[^./\\]+$/, "") || "image";

  return `${stem}.${extension}`;
}
