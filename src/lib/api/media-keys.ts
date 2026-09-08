/**
 * Pure helpers for reasoning about media object keys.
 *
 * Deliberately separate from `media.ts`, which performs the upload and
 * therefore reaches the session and `next/headers`. Client components need
 * `objectKeyFromUrl` to prefill their forms, and importing it from `media.ts`
 * dragged the whole server-only chain into the browser bundle. Nothing in
 * this file may import anything that touches a request.
 */

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

/**
 * Recover the object key from a stored image URL.
 *
 * This exists because of an asymmetry in the API: entity responses expose only
 * the image URL, while entity *requests* accept only the object key. Since the
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
