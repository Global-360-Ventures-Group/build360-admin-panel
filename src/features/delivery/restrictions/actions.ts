"use server";

import { revalidatePath } from "next/cache";

import { hasPermission, requireUser } from "@/lib/auth/dal";

import {
  deliveryFormError,
  deliveryMutationError,
  type DeliveryActionResult,
} from "../action-result";
import { DELIVERY_CALENDAR_MANAGE, isIsoDate } from "../shared";
import { createRestriction, deleteRestriction } from "./api";
import {
  RESTRICTION_LIMITS,
  emptyRestrictionForm,
  parseRestrictionType,
  type RestrictionFormValues,
} from "./types";

const RESTRICTIONS_PATH = "/delivery/restrictions";

/** A block changes what the calendar can hold, so that page goes stale too. */
const CALENDAR_PATH = "/delivery/calendar";

type RestrictionFieldErrors = Partial<
  Record<keyof RestrictionFormValues, string>
>;

export type RestrictionFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: RestrictionFieldErrors;
  /** Echoed back so a rejected submission does not lose what was typed. */
  values?: RestrictionFormValues;
};

/**
 * Create a restriction.
 *
 * There is no update action because there is no `PUT` — changing a block means
 * deleting it and creating another.
 */
export async function createRestrictionAction(
  _state: RestrictionFormState | undefined,
  formData: FormData,
): Promise<RestrictionFormState> {
  const user = await requireUser();

  const values: RestrictionFormValues = {
    name: String(formData.get("name") ?? "").trim(),
    restrictionType: parseRestrictionType(
      String(formData.get("restrictionType") ?? ""),
    ),
    startDate: String(formData.get("startDate") ?? "").trim(),
    endDate: String(formData.get("endDate") ?? "").trim(),
    deliveryMethodId: String(formData.get("deliveryMethodId") ?? "").trim(),
    remarks: String(formData.get("remarks") ?? "").trim(),
    slotIds: formData.getAll("slotIds").map(String).filter(Boolean),
  };

  if (!hasPermission(user, DELIVERY_CALENDAR_MANAGE)) {
    return {
      status: "error",
      message: `You do not have the ${DELIVERY_CALENDAR_MANAGE} permission.`,
      values,
    };
  }

  const fieldErrors = validateRestriction(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
  }

  try {
    const saved = await createRestriction({
      name: values.name,
      restrictionType: values.restrictionType,
      startDate: values.startDate,
      endDate: values.endDate,
      // Both of these mean "everything" when omitted, so an empty selection is
      // sent as nothing at all rather than as an empty value.
      deliveryMethodId: values.deliveryMethodId || undefined,
      remarks: values.remarks || undefined,
      slotIds: values.slotIds.length > 0 ? values.slotIds : undefined,
    });

    if (!saved) {
      return {
        status: "error",
        message: "The restriction was saved but the API returned no record.",
        values,
      };
    }

    revalidatePath(RESTRICTIONS_PATH);
    revalidatePath(CALENDAR_PATH);

    return {
      status: "success",
      message: `Created ${saved.name}.`,
      values: emptyRestrictionForm,
    };
  } catch (error) {
    return {
      status: "error",
      values,
      ...deliveryFormError(
        error,
        [
          "name",
          "restrictionType",
          "startDate",
          "endDate",
          "deliveryMethodId",
          "remarks",
          "slotIds",
        ] as const,
        "a delivery restriction",
      ),
    };
  }
}

/**
 * Delete a restriction, un-blocking whatever it covered.
 *
 * A real delete — the only one in this API. Nothing brings it back, so the
 * caller confirms first.
 */
export async function deleteRestrictionAction(
  id: string,
): Promise<DeliveryActionResult> {
  const user = await requireUser();

  if (!hasPermission(user, DELIVERY_CALENDAR_MANAGE)) {
    return {
      ok: false,
      message: `You do not have the ${DELIVERY_CALENDAR_MANAGE} permission.`,
    };
  }

  try {
    await deleteRestriction(id);

    revalidatePath(RESTRICTIONS_PATH);
    revalidatePath(CALENDAR_PATH);

    return { ok: true, message: "Restriction removed." };
  } catch (error) {
    return deliveryMutationError(error, "a delivery restriction");
  }
}

/** Local mirror of the API's documented field constraints. */
function validateRestriction(
  values: RestrictionFormValues,
): RestrictionFieldErrors {
  const errors: RestrictionFieldErrors = {};

  if (!values.name) errors.name = "Name is required.";
  else if (values.name.length > RESTRICTION_LIMITS.name)
    errors.name = `Name must be ${RESTRICTION_LIMITS.name} characters or less.`;

  if (!values.startDate) errors.startDate = "Start date is required.";
  else if (!isIsoDate(values.startDate))
    errors.startDate = "Use a real date.";

  if (!values.endDate) errors.endDate = "End date is required.";
  else if (!isIsoDate(values.endDate)) errors.endDate = "Use a real date.";

  // Both ends are inclusive, so a single-day block has the same date twice.
  // Only the other way round is wrong.
  if (
    values.startDate &&
    values.endDate &&
    isIsoDate(values.startDate) &&
    isIsoDate(values.endDate) &&
    values.endDate < values.startDate
  )
    errors.endDate = "End date cannot be before the start date.";

  if (values.remarks.length > RESTRICTION_LIMITS.remarks)
    errors.remarks = `Remarks must be ${RESTRICTION_LIMITS.remarks} characters or less.`;

  return errors;
}
