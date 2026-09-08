"use server";

import { revalidatePath } from "next/cache";

import { ApiError, ApiUnreachableError } from "@/lib/api/errors";
import { hasPermission, requireUser } from "@/lib/auth/dal";

import {
  archiveCategory,
  createCategory,
  restoreCategory,
  updateCategory,
  uploadCategoryIcon,
  uploadCategoryImage,
} from "./api";
import {
  CATEGORY_LIMITS,
  CATEGORY_SLUG_PATTERN,
  emptyCategoryForm,
  type CategoryFormValues,
} from "./types";

const CATEGORIES_PATH = "/categories";

type CategoryFieldErrors = Partial<
  Record<keyof CategoryFormValues | "icon" | "image", string>
>;

export type CategoryFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: CategoryFieldErrors;
  values?: CategoryFormValues;
};

export type CategoryActionResult = {
  ok: boolean;
  message: string;
};

/**
 * One image slot as it arrives from the form.
 *
 * Each slot carries three possibilities, and all three have to be
 * distinguishable: a new file to upload, an untouched image whose key must be
 * resubmitted, or an explicit removal. Update is a full replace, so "leave it
 * alone" is an action, not the absence of one.
 */
type ImageSlot = {
  file: File | null;
  existingKey: string;
  remove: boolean;
};

function readImageSlot(formData: FormData, field: string): ImageSlot {
  const file = formData.get(`${field}File`);

  return {
    file: file instanceof File && file.size > 0 ? file : null,
    existingKey: String(formData.get(`existing${capitalise(field)}ObjectKey`) ?? "").trim(),
    remove: formData.get(`remove${capitalise(field)}`) === "true",
  };
}

function capitalise(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Create a category, or update it when the form carries an `id`.
 *
 * Note what update cannot do: `CategoryUpdateRequest` has no `parentId`, so an
 * existing category's parent is fixed. The form disables that control when
 * editing and this action ignores any `parentId` it is sent for an edit,
 * rather than appearing to accept a move that the API would silently drop.
 */
export async function saveCategoryAction(
  _state: CategoryFormState | undefined,
  formData: FormData,
): Promise<CategoryFormState> {
  const user = await requireUser();

  const id = String(formData.get("id") ?? "").trim();
  const isEdit = id.length > 0;

  const rawParentId = String(formData.get("parentId") ?? "").trim();
  const rawSortOrder = String(formData.get("sortOrder") ?? "").trim();

  const values: CategoryFormValues = {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    shortLabel: String(formData.get("shortLabel") ?? "").trim(),
    parentId: rawParentId || null,
    sortOrder: rawSortOrder,
  };

  const permission = isEdit ? "CATEGORY_UPDATE" : "CATEGORY_CREATE";
  if (!hasPermission(user, permission)) {
    return {
      status: "error",
      message: `You do not have the ${permission} permission.`,
      values,
    };
  }

  const icon = readImageSlot(formData, "icon");
  const image = readImageSlot(formData, "image");
  const uploadsRequested = Boolean(icon.file || image.file);

  // Only required when a file is actually attached, so somebody who may edit
  // categories but not upload media can still rename one.
  if (uploadsRequested && !hasPermission(user, "MEDIA_UPLOAD")) {
    return {
      status: "error",
      message: "You do not have the MEDIA_UPLOAD permission.",
      values,
    };
  }

  const fieldErrors = validateCategory(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
  }

  try {
    // Uploaded here rather than when the files were picked, because the API
    // cannot delete media: uploading on selection left an unreachable object
    // in the bucket every time a dialog was cancelled.
    const iconKey = await resolveImageKey(icon, uploadCategoryIcon);
    if ("error" in iconKey) {
      return { status: "error", fieldErrors: { icon: iconKey.error }, values };
    }

    const imageKey = await resolveImageKey(image, uploadCategoryImage);
    if ("error" in imageKey) {
      return { status: "error", fieldErrors: { image: imageKey.error }, values };
    }

    const sortOrder = values.sortOrder === "" ? undefined : Number(values.sortOrder);

    const shared = {
      name: values.name,
      // Optional at the API. Sending "" would store an empty string rather
      // than leaving the field unset.
      slug: values.slug || undefined,
      shortLabel: values.shortLabel || undefined,
      iconObjectKey: iconKey.key,
      imageObjectKey: imageKey.key,
      sortOrder,
    };

    const saved = isEdit
      ? await updateCategory(id, shared)
      : await createCategory({
          ...shared,
          parentId: values.parentId ?? undefined,
        });

    if (!saved) {
      return {
        status: "error",
        message: "The category was saved but the API returned no record.",
        values,
      };
    }

    revalidatePath(CATEGORIES_PATH);

    return {
      status: "success",
      message: isEdit ? `Updated ${saved.name}.` : `Created ${saved.name}.`,
      values: emptyCategoryForm,
    };
  } catch (error) {
    return categoryFormError(error, values);
  }
}

/**
 * Work out the object key to send for one image slot, uploading if needed.
 *
 * @returns `{ key }` with the key to submit (undefined clears the image), or
 *   `{ error }` with a message for that slot's field
 */
async function resolveImageKey(
  slot: ImageSlot,
  upload: (file: File) => Promise<{ objectKey: string } | null>,
): Promise<{ key: string | undefined } | { error: string }> {
  if (!slot.file) {
    return { key: slot.remove ? undefined : slot.existingKey || undefined };
  }

  try {
    const uploaded = await upload(slot.file);
    if (!uploaded) return { error: "The upload returned no object key." };

    return { key: uploaded.objectKey };
  } catch (error) {
    // A dead API is a whole-form problem, not this field's.
    if (error instanceof ApiUnreachableError) throw error;

    // The media endpoint's wording is specific and worth showing verbatim
    // ("Unsupported image type. Allowed: PNG, JPEG, SVG.").
    return {
      error: error instanceof ApiError ? error.message : "The image could not be uploaded.",
    };
  }
}

/** Archive a category, setting it INACTIVE. Reversible. */
export async function archiveCategoryAction(
  id: string,
): Promise<CategoryActionResult> {
  const user = await requireUser();

  if (!hasPermission(user, "CATEGORY_ARCHIVE")) {
    return { ok: false, message: "You do not have the CATEGORY_ARCHIVE permission." };
  }

  return runCategoryMutation(
    () => archiveCategory(id),
    (category) => `Archived ${category.name}.`,
  );
}

/**
 * Restore an archived category.
 *
 * As with brands, there is no CATEGORY_RESTORE permission and the docs do not
 * say which one guards this endpoint, so the API decides rather than this
 * blocking someone who is in fact allowed.
 */
export async function restoreCategoryAction(
  id: string,
): Promise<CategoryActionResult> {
  await requireUser();

  return runCategoryMutation(
    () => restoreCategory(id),
    (category) => `Restored ${category.name}.`,
  );
}

async function runCategoryMutation(
  mutate: () => Promise<{ name: string } | null>,
  describe: (category: { name: string }) => string,
): Promise<CategoryActionResult> {
  try {
    const category = await mutate();
    if (!category) return { ok: false, message: "The API returned no record." };

    revalidatePath(CATEGORIES_PATH);

    return { ok: true, message: describe(category) };
  } catch (error) {
    if (error instanceof ApiUnreachableError) {
      return { ok: false, message: "Could not reach the Build360 API." };
    }
    if (error instanceof ApiError) {
      return {
        ok: false,
        message: error.isForbidden ? "You are not allowed to do that." : error.message,
      };
    }

    console.error("Unexpected error during a category mutation.", error);

    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

/** Local mirror of the API's documented field constraints. */
function validateCategory(values: CategoryFormValues): CategoryFieldErrors {
  const errors: CategoryFieldErrors = {};

  if (!values.name) errors.name = "Category name is required.";
  else if (values.name.length > CATEGORY_LIMITS.name)
    errors.name = `Name must be ${CATEGORY_LIMITS.name} characters or less.`;

  // Optional at the API, which derives one from the name when omitted.
  if (values.slug) {
    if (!CATEGORY_SLUG_PATTERN.test(values.slug))
      errors.slug = "Use lowercase letters, numbers and single hyphens only.";
    else if (values.slug.length > CATEGORY_LIMITS.slug)
      errors.slug = `Slug must be ${CATEGORY_LIMITS.slug} characters or less.`;
  }

  if (values.shortLabel.length > CATEGORY_LIMITS.shortLabel)
    errors.shortLabel = `Short label must be ${CATEGORY_LIMITS.shortLabel} characters or less.`;

  if (values.sortOrder !== "") {
    const parsed = Number(values.sortOrder);
    if (!Number.isInteger(parsed) || parsed < 0)
      errors.sortOrder = "Sort order must be a whole number, 0 or more.";
  }

  return errors;
}

function categoryFormError(
  error: unknown,
  values: CategoryFormValues,
): CategoryFormState {
  if (error instanceof ApiUnreachableError) {
    return {
      status: "error",
      message: "Could not reach the Build360 API. Check that the server is running.",
      values,
    };
  }

  if (error instanceof ApiError) {
    const apiFieldErrors = error.fieldErrorMap();

    if (Object.keys(apiFieldErrors).length > 0) {
      return {
        status: "error",
        fieldErrors: {
          name: apiFieldErrors.name,
          slug: apiFieldErrors.slug,
          shortLabel: apiFieldErrors.shortLabel,
          sortOrder: apiFieldErrors.sortOrder,
          icon: apiFieldErrors.iconObjectKey,
          image: apiFieldErrors.imageObjectKey,
        },
        values,
      };
    }

    return {
      status: "error",
      message: error.isForbidden ? "You are not allowed to do that." : error.message,
      values,
    };
  }

  console.error("Unexpected error saving a category.", error);

  return { status: "error", message: "Something went wrong. Please try again.", values };
}
