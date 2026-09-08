"use server";

import { revalidatePath } from "next/cache";

import { ApiError, ApiUnreachableError } from "@/lib/api/errors";
import { hasPermission, requireUser } from "@/lib/auth/dal";

import {
  addProductImages,
  archiveProduct,
  createProduct,
  deleteProductImage,
  reorderProductImages,
  restoreProduct,
  updateProduct,
  uploadProductImages,
  type ProductInputBase,
} from "./api";
import {
  PRODUCT_LIMITS,
  PRODUCT_SLUG_PATTERN,
  PRODUCT_STATUSES,
  type ProductFormValues,
  type ProductStatus,
} from "./types";

const PRODUCTS_PATH = "/products";

type ProductFieldErrors = Partial<Record<keyof ProductFormValues, string>>;

export type ProductFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: ProductFieldErrors;
  values?: ProductFormValues;
  /** Set on a successful create, so the caller can navigate to the editor. */
  createdId?: string;
};

export type ProductActionResult = {
  ok: boolean;
  message: string;
};

/**
 * Create a product, or update it when the form carries an `id`.
 *
 * The create/update asymmetry is handled here rather than pushed onto callers:
 * `status` is only sent on update (a new product is always ACTIVE), and
 * `images` are only sent on create — afterwards the gallery has its own
 * endpoints.
 */
export async function saveProductAction(
  _state: ProductFormState | undefined,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await requireUser();

  const id = String(formData.get("id") ?? "").trim();
  const isEdit = id.length > 0;

  const values = readForm(formData);

  const permission = isEdit ? "PRODUCT_UPDATE" : "PRODUCT_CREATE";
  if (!hasPermission(user, permission)) {
    return {
      status: "error",
      message: `You do not have the ${permission} permission.`,
      values,
    };
  }

  const fieldErrors = validateProduct(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
  }

  const shared: ProductInputBase = {
    brandId: values.brandId,
    categoryId: values.categoryId,
    name: values.name,
    price: Number(values.price),
    unit: values.unit,
    minimumOrderQuantity: Number(values.minimumOrderQuantity),
    // Optional at the API. Sending "" would store an empty string rather than
    // leaving the field unset; sending 0 would claim a real value of zero.
    sku: values.sku || undefined,
    slug: values.slug || undefined,
    shortDescription: values.shortDescription || undefined,
    description: values.description || undefined,
    specification: values.specification || undefined,
    manufacturer: values.manufacturer || undefined,
    refundReturnPolicy: values.refundReturnPolicy || undefined,
    costPrice: optionalNumber(values.costPrice),
    discountPrice: optionalNumber(values.discountPrice),
    weight: optionalNumber(values.weight),
    featured: values.featured,
  };

  try {
    if (isEdit) {
      const saved = await updateProduct(id, { ...shared, status: values.status });
      if (!saved) return noRecord(values);

      revalidatePath(PRODUCTS_PATH);
      revalidatePath(`${PRODUCTS_PATH}/${id}/edit`);

      return { status: "success", message: `Updated ${saved.name}.`, values };
    }

    const created = await createProduct(shared);
    if (!created) return noRecord(values);

    revalidatePath(PRODUCTS_PATH);

    return {
      status: "success",
      message: `Created ${created.name}.`,
      createdId: created.id,
      values,
    };
  } catch (error) {
    return productFormError(error, values);
  }
}

/** Archive a product, setting it INACTIVE. Reversible. */
export async function archiveProductAction(
  id: string,
): Promise<ProductActionResult> {
  const user = await requireUser();

  if (!hasPermission(user, "PRODUCT_ARCHIVE")) {
    return { ok: false, message: "You do not have the PRODUCT_ARCHIVE permission." };
  }

  return runProductMutation(
    () => archiveProduct(id),
    (product) => `Archived ${product.name}.`,
  );
}

/**
 * Restore an archived product to ACTIVE.
 *
 * Unlike brands and categories, the API documents which permission guards this
 * one — PRODUCT_UPDATE, not PRODUCT_ARCHIVE — so it can be checked here rather
 * than left to the API.
 */
export async function restoreProductAction(
  id: string,
): Promise<ProductActionResult> {
  const user = await requireUser();

  if (!hasPermission(user, "PRODUCT_UPDATE")) {
    return { ok: false, message: "You do not have the PRODUCT_UPDATE permission." };
  }

  return runProductMutation(
    () => restoreProduct(id),
    (product) => `Restored ${product.name}.`,
  );
}

/**
 * Change a product's status directly.
 *
 * Status rides on the update body, so every other editable field has to be
 * resent — `PUT` replaces them. The caller therefore passes the product's
 * current values along with the new status.
 */
export async function setProductStatusAction(
  id: string,
  status: ProductStatus,
  current: ProductInputBase,
): Promise<ProductActionResult> {
  const user = await requireUser();

  if (!hasPermission(user, "PRODUCT_UPDATE")) {
    return { ok: false, message: "You do not have the PRODUCT_UPDATE permission." };
  }

  if (!PRODUCT_STATUSES.includes(status)) {
    return { ok: false, message: `Unknown status ${status}.` };
  }

  return runProductMutation(
    () => updateProduct(id, { ...current, status }),
    (product) => `${product.name} is now ${status.toLowerCase().replace(/_/g, " ")}.`,
  );
}

/**
 * Upload files and append them to a product's gallery.
 *
 * Two calls, in order: the media endpoint stores the files and returns keys,
 * then the gallery endpoint attaches them. Uploading is all-or-nothing, so a
 * rejected file means nothing was stored.
 */
export async function addProductImagesAction(
  productId: string,
  formData: FormData,
): Promise<ProductActionResult> {
  const user = await requireUser();

  if (!hasPermission(user, "PRODUCT_UPDATE")) {
    return { ok: false, message: "You do not have the PRODUCT_UPDATE permission." };
  }
  if (!hasPermission(user, "MEDIA_UPLOAD")) {
    return { ok: false, message: "You do not have the MEDIA_UPLOAD permission." };
  }

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return { ok: false, message: "Choose at least one image." };
  }

  try {
    const uploaded = await uploadProductImages(files);
    if (uploaded.length === 0) {
      return { ok: false, message: "The upload returned no object keys." };
    }

    await addProductImages(
      productId,
      uploaded.map((image) => ({ objectKey: image.objectKey })),
    );

    revalidatePath(`${PRODUCTS_PATH}/${productId}/edit`);
    revalidatePath(PRODUCTS_PATH);

    return {
      ok: true,
      message: `Added ${uploaded.length} image${uploaded.length === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    return failure(error, "Something went wrong while adding images.");
  }
}

/**
 * Apply a new gallery order and primary.
 *
 * The API requires the complete gallery with exactly one primary, and rejects
 * anything else without changing state, so `images` must be the whole set.
 */
export async function reorderProductImagesAction(
  productId: string,
  images: { imageId: string; displayOrder: number; primary: boolean }[],
): Promise<ProductActionResult> {
  const user = await requireUser();

  if (!hasPermission(user, "PRODUCT_UPDATE")) {
    return { ok: false, message: "You do not have the PRODUCT_UPDATE permission." };
  }

  if (images.length === 0) {
    return { ok: false, message: "There are no images to reorder." };
  }
  if (images.filter((image) => image.primary).length !== 1) {
    // Caught here so the user gets a clear message rather than the API's.
    return { ok: false, message: "Exactly one image must be primary." };
  }

  try {
    await reorderProductImages(productId, images);

    revalidatePath(`${PRODUCTS_PATH}/${productId}/edit`);
    revalidatePath(PRODUCTS_PATH);

    return { ok: true, message: "Gallery updated." };
  } catch (error) {
    return failure(error, "Something went wrong while reordering.");
  }
}

/** Detach one image from a product's gallery. */
export async function deleteProductImageAction(
  productId: string,
  imageId: string,
): Promise<ProductActionResult> {
  const user = await requireUser();

  if (!hasPermission(user, "PRODUCT_UPDATE")) {
    return { ok: false, message: "You do not have the PRODUCT_UPDATE permission." };
  }

  try {
    await deleteProductImage(productId, imageId);

    revalidatePath(`${PRODUCTS_PATH}/${productId}/edit`);
    revalidatePath(PRODUCTS_PATH);

    return { ok: true, message: "Image removed." };
  } catch (error) {
    return failure(error, "Something went wrong while removing the image.");
  }
}

function readForm(formData: FormData): ProductFormValues {
  const text = (field: string) => String(formData.get(field) ?? "").trim();
  const rawStatus = text("status");

  return {
    name: text("name"),
    slug: text("slug"),
    sku: text("sku"),
    brandId: text("brandId"),
    categoryId: text("categoryId"),
    unit: text("unit"),
    shortDescription: text("shortDescription"),
    description: text("description"),
    specification: text("specification"),
    manufacturer: text("manufacturer"),
    refundReturnPolicy: text("refundReturnPolicy"),
    price: text("price"),
    costPrice: text("costPrice"),
    discountPrice: text("discountPrice"),
    minimumOrderQuantity: text("minimumOrderQuantity"),
    weight: text("weight"),
    featured: formData.get("featured") === "on" || formData.get("featured") === "true",
    status: PRODUCT_STATUSES.includes(rawStatus as ProductStatus)
      ? (rawStatus as ProductStatus)
      : "ACTIVE",
  };
}

/** Blank means "not recorded"; 0 would be a claim about the real value. */
function optionalNumber(value: string): number | undefined {
  if (value === "") return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function runProductMutation(
  mutate: () => Promise<{ name: string } | null>,
  describe: (product: { name: string }) => string,
): Promise<ProductActionResult> {
  try {
    const product = await mutate();
    if (!product) return { ok: false, message: "The API returned no record." };

    revalidatePath(PRODUCTS_PATH);

    return { ok: true, message: describe(product) };
  } catch (error) {
    return failure(error, "Something went wrong. Please try again.");
  }
}

function failure(error: unknown, fallback: string): ProductActionResult {
  if (error instanceof ApiUnreachableError) {
    return { ok: false, message: "Could not reach the Build360 API." };
  }
  if (error instanceof ApiError) {
    return {
      ok: false,
      message: error.isForbidden ? "You are not allowed to do that." : error.message,
    };
  }

  console.error(fallback, error);

  return { ok: false, message: fallback };
}

function noRecord(values: ProductFormValues): ProductFormState {
  return {
    status: "error",
    message: "The product was saved but the API returned no record.",
    values,
  };
}

/** Local mirror of the API's documented field constraints. */
function validateProduct(values: ProductFormValues): ProductFieldErrors {
  const errors: ProductFieldErrors = {};

  if (!values.name) errors.name = "Product name is required.";
  else if (values.name.length > PRODUCT_LIMITS.name)
    errors.name = `Name must be ${PRODUCT_LIMITS.name} characters or less.`;

  if (!values.brandId) errors.brandId = "Pick a brand.";
  if (!values.categoryId) errors.categoryId = "Pick a category.";
  if (!values.unit) errors.unit = "Unit is required.";
  else if (values.unit.length > PRODUCT_LIMITS.unit)
    errors.unit = `Unit must be ${PRODUCT_LIMITS.unit} characters or less.`;

  const price = Number(values.price);
  if (values.price === "") errors.price = "Price is required.";
  else if (!Number.isFinite(price) || price < 0)
    errors.price = "Price must be a number, 0 or more.";

  const moq = Number(values.minimumOrderQuantity);
  if (values.minimumOrderQuantity === "")
    errors.minimumOrderQuantity = "Minimum order quantity is required.";
  else if (!Number.isFinite(moq) || moq <= 0)
    errors.minimumOrderQuantity = "Minimum order quantity must be more than 0.";

  // Optional at the API, which generates one when omitted.
  if (values.slug) {
    if (!PRODUCT_SLUG_PATTERN.test(values.slug))
      errors.slug = "Use lowercase letters, numbers and single hyphens only.";
    else if (values.slug.length > PRODUCT_LIMITS.slug)
      errors.slug = `Slug must be ${PRODUCT_LIMITS.slug} characters or less.`;
  }

  if (values.sku.length > PRODUCT_LIMITS.sku)
    errors.sku = `SKU must be ${PRODUCT_LIMITS.sku} characters or less.`;

  for (const field of [
    "shortDescription",
    "description",
    "specification",
    "manufacturer",
    "refundReturnPolicy",
  ] as const) {
    if (values[field].length > PRODUCT_LIMITS[field]) {
      errors[field] = `Must be ${PRODUCT_LIMITS[field]} characters or less.`;
    }
  }

  for (const field of ["costPrice", "discountPrice", "weight"] as const) {
    if (values[field] === "") continue;

    const parsed = Number(values[field]);
    if (!Number.isFinite(parsed) || parsed < 0) {
      errors[field] = "Must be a number, 0 or more.";
    }
  }

  // A promotional price at or above the normal one is not a discount, and the
  // storefront would render a nonsensical "0% off".
  if (!errors.discountPrice && values.discountPrice !== "" && values.price !== "") {
    if (Number(values.discountPrice) >= price) {
      errors.discountPrice = "Discount price must be below the regular price.";
    }
  }

  return errors;
}

function productFormError(
  error: unknown,
  values: ProductFormValues,
): ProductFormState {
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
      const fieldErrors: ProductFieldErrors = {};
      for (const [field, message] of Object.entries(apiFieldErrors)) {
        if (field in values) fieldErrors[field as keyof ProductFormValues] = message;
      }

      return { status: "error", fieldErrors, values };
    }

    // A duplicate slug or SKU is documented as a 409 rather than a validation
    // failure, so it arrives with no field attached. Guessing which one
    // collided would be wrong, so the message goes above the form.
    if (error.status === 409) {
      return {
        status: "error",
        message: `${error.message} A product with this slug or SKU already exists.`,
        values,
      };
    }

    return {
      status: "error",
      message: error.isForbidden ? "You are not allowed to do that." : error.message,
      values,
    };
  }

  console.error("Unexpected error saving a product.", error);

  return { status: "error", message: "Something went wrong. Please try again.", values };
}
