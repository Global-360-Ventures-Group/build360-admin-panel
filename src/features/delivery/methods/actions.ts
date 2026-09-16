"use server";

import { revalidatePath } from "next/cache";

import { hasPermission, requireUser } from "@/lib/auth/dal";

import {
  deliveryFormError,
  deliveryMutationError,
  type DeliveryActionResult,
} from "../action-result";
import { DELIVERY_CONFIG_MANAGE } from "../shared";
import { setDeliveryMethodActive, updateDeliveryMethod } from "./api";
import { DELIVERY_METHOD_LIMITS, type DeliveryMethodFormValues } from "./types";

const METHODS_PATH = "/delivery";

/**
 * The calendar names methods in its filter and its bulk dialog, so a rename or
 * a deactivation has to invalidate that page too.
 */
const CALENDAR_PATH = "/delivery/calendar";

type MethodFieldErrors = Partial<Record<keyof DeliveryMethodFormValues, string>>;

export type DeliveryMethodFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: MethodFieldErrors;
  /** Echoed back so a rejected submission does not lose what was typed. */
  values?: DeliveryMethodFormValues;
};

/**
 * Update a method's display fields.
 *
 * There is no create and no delete: the three methods are fixed by the
 * backend, and `code` and `requiresPickupLocation` are not on the update body
 * either. This changes how a method reads, nothing about what it is.
 */
export async function saveDeliveryMethodAction(
  _state: DeliveryMethodFormState | undefined,
  formData: FormData,
): Promise<DeliveryMethodFormState> {
  const user = await requireUser();

  const id = String(formData.get("id") ?? "").trim();

  const values: DeliveryMethodFormValues = {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    badge: String(formData.get("badge") ?? "").trim(),
    displayOrder: String(formData.get("displayOrder") ?? "").trim(),
  };

  if (!hasPermission(user, DELIVERY_CONFIG_MANAGE)) {
    return {
      status: "error",
      message: `You do not have the ${DELIVERY_CONFIG_MANAGE} permission.`,
      values,
    };
  }

  if (!id) {
    return {
      status: "error",
      message: "No delivery method was named in the form.",
      values,
    };
  }

  const fieldErrors = validateMethod(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
  }

  try {
    const saved = await updateDeliveryMethod(id, {
      name: values.name || undefined,
      description: values.description || undefined,
      badge: values.badge || undefined,
      displayOrder:
        values.displayOrder === "" ? undefined : Number(values.displayOrder),
    });

    if (!saved) {
      return {
        status: "error",
        message: "The method was saved but the API returned no record.",
        values,
      };
    }

    revalidatePath(METHODS_PATH);
    revalidatePath(CALENDAR_PATH);

    return { status: "success", message: `Updated ${saved.name}.` };
  } catch (error) {
    return {
      status: "error",
      values,
      ...deliveryFormError(
        error,
        ["name", "description", "badge", "displayOrder"] as const,
        "a delivery method",
      ),
    };
  }
}

/**
 * Switch a method on or off for the storefront.
 *
 * Deactivating leaves the calendar alone: the days and bookable slots already
 * created for the method stay, and reappear the moment it is switched back on.
 */
export async function setDeliveryMethodActiveAction(
  id: string,
  active: boolean,
): Promise<DeliveryActionResult> {
  const user = await requireUser();

  if (!hasPermission(user, DELIVERY_CONFIG_MANAGE)) {
    return {
      ok: false,
      message: `You do not have the ${DELIVERY_CONFIG_MANAGE} permission.`,
    };
  }

  try {
    const method = await setDeliveryMethodActive(id, active);
    if (!method) return { ok: false, message: "The API returned no record." };

    revalidatePath(METHODS_PATH);
    revalidatePath(CALENDAR_PATH);

    return {
      ok: true,
      message: active
        ? `${method.name} is available again.`
        : `${method.name} is off the storefront.`,
    };
  } catch (error) {
    return deliveryMutationError(error, "a delivery method");
  }
}

/** Local mirror of the API's documented field constraints. */
function validateMethod(values: DeliveryMethodFormValues): MethodFieldErrors {
  const errors: MethodFieldErrors = {};

  if (!values.name) errors.name = "Name is required.";
  else if (values.name.length > DELIVERY_METHOD_LIMITS.name)
    errors.name = `Name must be ${DELIVERY_METHOD_LIMITS.name} characters or less.`;

  if (values.description.length > DELIVERY_METHOD_LIMITS.description)
    errors.description = `Description must be ${DELIVERY_METHOD_LIMITS.description} characters or less.`;

  if (values.badge.length > DELIVERY_METHOD_LIMITS.badge)
    errors.badge = `Badge must be ${DELIVERY_METHOD_LIMITS.badge} characters or less.`;

  if (values.displayOrder !== "") {
    const order = Number(values.displayOrder);
    if (!Number.isInteger(order) || order < 0)
      errors.displayOrder = "Display order must be a whole number, 0 or more.";
  }

  return errors;
}
