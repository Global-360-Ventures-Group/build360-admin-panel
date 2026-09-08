"use server";

import { revalidatePath } from "next/cache";

import { ApiError, ApiUnreachableError } from "@/lib/api/errors";
import { hasPermission, requireUser } from "@/lib/auth/dal";

import {
  archiveBrand,
  createBrand,
  markBrandTop,
  restoreBrand,
  unmarkBrandTop,
  updateBrand,
  uploadBrandLogo,
} from "./api";
import {
  BRAND_LIMITS,
  BRAND_SLUG_PATTERN,
  emptyBrandForm,
  type BrandFormValues,
} from "./types";

const BRANDS_PATH = "/brands";

type BrandFieldErrors = Partial<Record<keyof BrandFormValues, string>>;

export type BrandFormState = {
  status: "idle" | "success" | "error";
  /** Error to show above the form, or the success confirmation. */
  message?: string;
  fieldErrors?: BrandFieldErrors;
  /** Echoed back so a rejected submission does not lose what was typed. */
  values?: BrandFormValues;
};

export type BrandActionResult = {
  ok: boolean;
  message: string;
};

/**
 * Create a brand, or update it when the form carries an `id`.
 *
 * Validation runs twice by design: locally, to give per-field messages without
 * a round-trip, and then again at the API, whose own "Validation failed"
 * response is mapped back onto the same fields. The API is the authority --
 * this is a courtesy layer, not a replacement for it.
 */
export async function saveBrandAction(
  _state: BrandFormState | undefined,
  formData: FormData,
): Promise<BrandFormState> {
  const user = await requireUser();

  const id = String(formData.get("id") ?? "").trim();
  const isEdit = id.length > 0;

  // The key of the logo the brand already has, so an edit that does not touch
  // the image can resubmit it. Update is a full replace: omitting this clears
  // the logo.
  const existingLogoObjectKey = String(
    formData.get("existingLogoObjectKey") ?? "",
  ).trim();
  const removeLogo = formData.get("removeLogo") === "true";
  const logoFile = formData.get("logoFile");
  const hasNewLogo = logoFile instanceof File && logoFile.size > 0;

  const values: BrandFormValues = {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    logoObjectKey: existingLogoObjectKey,
    logoUrl: "",
  };

  const permission = isEdit ? "BRAND_UPDATE" : "BRAND_CREATE";
  if (!hasPermission(user, permission)) {
    return {
      status: "error",
      message: `You do not have the ${permission} permission.`,
      values,
    };
  }

  // Only required when a file is actually being sent, so somebody who may edit
  // brands but not upload media can still rename one.
  if (hasNewLogo && !hasPermission(user, "MEDIA_UPLOAD")) {
    return {
      status: "error",
      message: "You do not have the MEDIA_UPLOAD permission.",
      values,
    };
  }

  const fieldErrors = validateBrand(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
  }

  try {
    // Uploading happens here rather than when the file was picked, because the
    // API has no way to delete media. Uploading on selection meant every
    // cancelled dialog, and every change of mind, left an object in the bucket
    // that nothing could ever remove.
    let logoObjectKey = removeLogo ? undefined : existingLogoObjectKey || undefined;

    if (hasNewLogo) {
      try {
        const uploaded = await uploadBrandLogo(logoFile);
        if (!uploaded) {
          return {
            status: "error",
            fieldErrors: { logoObjectKey: "The upload returned no object key." },
            values,
          };
        }

        logoObjectKey = uploaded.objectKey;
      } catch (error) {
        // Caught separately so the message lands on the logo field. The media
        // endpoint's own wording is specific and worth showing verbatim
        // ("Unsupported image type. Allowed: PNG, JPEG, SVG.").
        if (error instanceof ApiUnreachableError) throw error;

        return {
          status: "error",
          fieldErrors: {
            logoObjectKey:
              error instanceof ApiError
                ? error.message
                : "The logo could not be uploaded.",
          },
          values,
        };
      }
    }

    const input = {
      name: values.name,
      // These are optional at the API. Sending "" would store an empty string
      // rather than leaving the field unset.
      slug: values.slug || undefined,
      description: values.description || undefined,
      logoObjectKey,
    };

    const saved = isEdit ? await updateBrand(id, input) : await createBrand(input);

    if (!saved) {
      return {
        status: "error",
        message: "The brand was saved but the API returned no record.",
        values,
      };
    }

    revalidatePath(BRANDS_PATH);

    return {
      status: "success",
      message: isEdit ? `Updated ${saved.name}.` : `Created ${saved.name}.`,
      values: emptyBrandForm,
    };
  } catch (error) {
    return brandFormError(error, values);
  }
}

/** Archive a brand, setting it INACTIVE. Reversible with `restoreBrandAction`. */
export async function archiveBrandAction(id: string): Promise<BrandActionResult> {
  const user = await requireUser();

  if (!hasPermission(user, "BRAND_ARCHIVE")) {
    return { ok: false, message: "You do not have the BRAND_ARCHIVE permission." };
  }

  return runBrandMutation(
    () => archiveBrand(id),
    (brand) => `Archived ${brand.name}.`,
  );
}

/**
 * Restore an archived brand.
 *
 * There is no BRAND_RESTORE permission in the API's vocabulary and the docs do
 * not say which one guards this endpoint, so rather than guess and block
 * someone who is in fact allowed, the API decides and its 403 is reported
 * back plainly.
 */
export async function restoreBrandAction(id: string): Promise<BrandActionResult> {
  await requireUser();

  return runBrandMutation(
    () => restoreBrand(id),
    (brand) => `Restored ${brand.name}.`,
  );
}

/** Add a brand to, or remove it from, the top-brands list. */
export async function setBrandTopAction(
  id: string,
  isTop: boolean,
): Promise<BrandActionResult> {
  const user = await requireUser();

  if (!hasPermission(user, "BRAND_UPDATE")) {
    return { ok: false, message: "You do not have the BRAND_UPDATE permission." };
  }

  return runBrandMutation(
    () => (isTop ? markBrandTop(id) : unmarkBrandTop(id)),
    (brand) =>
      isTop
        ? `${brand.name} is now a top brand.`
        : `${brand.name} is no longer a top brand.`,
  );
}

/** Shared plumbing for the single-brand mutations. */
async function runBrandMutation(
  mutate: () => Promise<{ name: string } | null>,
  describe: (brand: { name: string }) => string,
): Promise<BrandActionResult> {
  try {
    const brand = await mutate();
    if (!brand) return { ok: false, message: "The API returned no record." };

    revalidatePath(BRANDS_PATH);

    return { ok: true, message: describe(brand) };
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

    console.error("Unexpected error during a brand mutation.", error);

    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

/** Local mirror of the API's documented field constraints. */
function validateBrand(values: BrandFormValues): BrandFieldErrors {
  const errors: BrandFieldErrors = {};

  if (!values.name) errors.name = "Brand name is required.";
  else if (values.name.length > BRAND_LIMITS.name)
    errors.name = `Name must be ${BRAND_LIMITS.name} characters or less.`;

  // Optional at the API, which derives one from the name when it is omitted.
  if (values.slug) {
    if (!BRAND_SLUG_PATTERN.test(values.slug))
      errors.slug = "Use lowercase letters, numbers and single hyphens only.";
    else if (values.slug.length > BRAND_LIMITS.slug)
      errors.slug = `Slug must be ${BRAND_LIMITS.slug} characters or less.`;
  }

  if (values.description.length > BRAND_LIMITS.description)
    errors.description = `Description must be ${BRAND_LIMITS.description} characters or less.`;

  return errors;
}

function brandFormError(error: unknown, values: BrandFormValues): BrandFormState {
  if (error instanceof ApiUnreachableError) {
    return {
      status: "error",
      message: "Could not reach the Build360 API. Check that the server is running.",
      values,
    };
  }

  if (error instanceof ApiError) {
    const fieldErrors = error.fieldErrorMap();

    if (Object.keys(fieldErrors).length > 0) {
      return {
        status: "error",
        fieldErrors: {
          name: fieldErrors.name,
          slug: fieldErrors.slug,
          description: fieldErrors.description,
          logoObjectKey: fieldErrors.logoObjectKey,
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

  console.error("Unexpected error saving a brand.", error);

  return { status: "error", message: "Something went wrong. Please try again.", values };
}
