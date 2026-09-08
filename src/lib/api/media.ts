/**
 * `POST /admin/media` — the one way images get into the system.
 *
 * Worth knowing before using this:
 *
 * - The upload and the entity are two separate calls. You upload first, get an
 *   `objectKey` back, then send that key in the entity's create/update body.
 *   Entity bodies take `...ObjectKey`, never a URL or a file.
 * - Uploads are all-or-nothing. One invalid file rejects the entire batch with
 *   a 400 and nothing is written, so a partial success is not a state you have
 *   to handle.
 * - The server re-encodes. A PNG without transparency comes back as `.jpg`, so
 *   never assume the stored extension matches what was picked.
 * - Order is preserved: `data[i]` corresponds to `files[i]`.
 * - There is no delete endpoint. An upload that is never attached to an entity
 *   is an orphan in the bucket forever, so only upload when the user has
 *   actually chosen a file.
 *
 * Requires the `MEDIA_UPLOAD` permission.
 */

import { authedRequestData } from "./authed";
import type { MediaType } from "./media-keys";

// Re-exported so server-side callers have one import for media concerns.
export { objectKeyFromUrl, type MediaType } from "./media-keys";

export type MediaUpload = {
  /** Store this on the entity. */
  objectKey: string;
  /** Publicly readable, no auth. Use it for previews. */
  url: string;
};

type MediaUploadResponse = {
  objectKey?: string;
  url?: string;
};

/**
 * Upload one or more images and get back their stored keys, in request order.
 *
 * @throws {ApiError} 400 if any file is not a readable PNG, JPEG or SVG — in
 *   which case none of them were stored
 */
export async function uploadMedia(
  type: MediaType,
  files: File[],
): Promise<MediaUpload[]> {
  const body = new FormData();
  for (const file of files) body.append("files", file);

  const uploaded = await authedRequestData<MediaUploadResponse[]>(
    `/admin/media?type=${type}`,
    // Images are re-encoded server-side, so allow well beyond the default.
    { method: "POST", body, timeoutMs: 60_000 },
  );

  return uploaded.flatMap((item) =>
    item.objectKey && item.url ? [{ objectKey: item.objectKey, url: item.url }] : [],
  );
}
