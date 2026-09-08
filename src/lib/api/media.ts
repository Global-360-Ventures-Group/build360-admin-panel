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

/** Required by the API; decides which bucket folder the upload lands in. */
export type MediaType = "PRODUCT" | "BRAND" | "CATEGORY_ICON" | "CATEGORY_IMAGE";

/**
 * The bucket folder each media type is stored under, measured by uploading one
 * file of each type rather than assumed from the enum names.
 *
 * Note `CATEGORY_ICON` and `CATEGORY_IMAGE` **share** the `categories` folder,
 * so an object key alone cannot tell a category's icon from its image. The
 * distinction lives in the entity's own fields, not in the key.
 */
const MEDIA_FOLDERS: Record<MediaType, string> = {
  BRAND: "brands",
  PRODUCT: "products",
  CATEGORY_ICON: "categories",
  CATEGORY_IMAGE: "categories",
};

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

/**
 * Recover the object key from a stored image URL.
 *
 * This exists because of an asymmetry in the API: entity responses expose only
 * `logoUrl`, while entity *requests* accept only `logoObjectKey`. Since the
 * update endpoints are a full replace rather than a patch, an edit form that
 * cannot name the current image would blank it out — so the key has to be
 * reconstructed from the URL to send it back unchanged.
 *
 * Anchoring on the folder segment rather than stripping a configured base URL
 * keeps this working across environments, whose bucket prefixes differ
 * (`/stage/` here).
 *
 * Takes the `MediaType` rather than a folder name so callers cannot guess the
 * folder wrong — the mapping is not one-to-one, see `MEDIA_FOLDERS`.
 *
 * @returns the key (`brands/akij.png`), or undefined if the URL does not sit
 *   under that type's folder
 */
export function objectKeyFromUrl(
  url: string | undefined,
  type: MediaType,
): string | undefined {
  if (!url) return undefined;

  const marker = `/${MEDIA_FOLDERS[type]}/`;
  const index = url.indexOf(marker);
  if (index === -1) return undefined;

  // +1 skips the leading slash, leaving "<folder>/<name>".
  return url.slice(index + 1);
}
