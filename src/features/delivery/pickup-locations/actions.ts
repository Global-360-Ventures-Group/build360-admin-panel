"use server";

import { revalidatePath } from "next/cache";

import { hasPermission, requireUser } from "@/lib/auth/dal";

import {
  deliveryFormError,
  deliveryMutationError,
  type DeliveryActionResult,
} from "../action-result";
import { DELIVERY_CONFIG_MANAGE } from "../shared";
import {
  createPickupLocation,
  setPickupLocationActive,
  updatePickupLocation,
} from "./api";
import {
  PICKUP_LOCATION_LIMITS,
  emptyPickupLocationForm,
  type PickupLocationFormValues,
} from "./types";

const LOCATIONS_PATH = "/delivery/pickup-locations";

/** The calendar picks a location for every Click & Collect slot. */
const CALENDAR_PATH = "/delivery/calendar";

type LocationFieldErrors = Partial<
  Record<keyof PickupLocationFormValues, string>
>;

export type PickupLocationFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: LocationFieldErrors;
  /** Echoed back so a rejected submission does not lose what was typed. */
  values?: PickupLocationFormValues;
};

/** Create a pickup location, or update it when the form carries an `id`. */
export async function savePickupLocationAction(
  _state: PickupLocationFormState | undefined,
  formData: FormData,
): Promise<PickupLocationFormState> {
  const user = await requireUser();

  const id = String(formData.get("id") ?? "").trim();
  const isEdit = id.length > 0;

  const values: PickupLocationFormValues = {
    name: String(formData.get("name") ?? "").trim(),
    addressLine: String(formData.get("addressLine") ?? "").trim(),
    division: String(formData.get("division") ?? "").trim(),
    district: String(formData.get("district") ?? "").trim(),
    upazila: String(formData.get("upazila") ?? "").trim(),
    contactPhone: String(formData.get("contactPhone") ?? "").trim(),
    latitude: String(formData.get("latitude") ?? "").trim(),
    longitude: String(formData.get("longitude") ?? "").trim(),
    displayOrder: String(formData.get("displayOrder") ?? "").trim(),
  };

  if (!hasPermission(user, DELIVERY_CONFIG_MANAGE)) {
    return {
      status: "error",
      message: `You do not have the ${DELIVERY_CONFIG_MANAGE} permission.`,
      values,
    };
  }

  const fieldErrors = validateLocation(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
  }

  const input = {
    name: values.name,
    // Optional at the API. Sending "" would store an empty string rather than
    // leaving the field unset.
    addressLine: values.addressLine || undefined,
    division: values.division || undefined,
    district: values.district || undefined,
    upazila: values.upazila || undefined,
    contactPhone: values.contactPhone || undefined,
    latitude: values.latitude === "" ? undefined : Number(values.latitude),
    longitude: values.longitude === "" ? undefined : Number(values.longitude),
    displayOrder:
      values.displayOrder === "" ? undefined : Number(values.displayOrder),
  };

  try {
    const saved = isEdit
      ? await updatePickupLocation(id, input)
      : await createPickupLocation(input);

    if (!saved) {
      return {
        status: "error",
        message: "The location was saved but the API returned no record.",
        values,
      };
    }

    revalidatePath(LOCATIONS_PATH);
    revalidatePath(CALENDAR_PATH);

    return {
      status: "success",
      message: isEdit ? `Updated ${saved.name}.` : `Created ${saved.name}.`,
      values: emptyPickupLocationForm,
    };
  } catch (error) {
    return {
      status: "error",
      values,
      ...deliveryFormError(
        error,
        [
          "name",
          "addressLine",
          "division",
          "district",
          "upazila",
          "contactPhone",
          "latitude",
          "longitude",
          "displayOrder",
        ] as const,
        "a pickup location",
      ),
    };
  }
}

/**
 * Activate or deactivate a pickup location.
 *
 * Deactivating takes it out of the pickers. Calendar slots that already name
 * it keep naming it — there is no endpoint that would clean those up, so
 * closing a branch means walking the calendar afterwards.
 */
export async function setPickupLocationActiveAction(
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
    const location = await setPickupLocationActive(id, active);
    if (!location) return { ok: false, message: "The API returned no record." };

    revalidatePath(LOCATIONS_PATH);
    revalidatePath(CALENDAR_PATH);

    return {
      ok: true,
      message: active
        ? `Activated ${location.name}.`
        : `Deactivated ${location.name}.`,
    };
  } catch (error) {
    return deliveryMutationError(error, "a pickup location");
  }
}

/** Local mirror of the API's documented field constraints. */
function validateLocation(
  values: PickupLocationFormValues,
): LocationFieldErrors {
  const errors: LocationFieldErrors = {};

  if (!values.name) errors.name = "Name is required.";
  else if (values.name.length > PICKUP_LOCATION_LIMITS.name)
    errors.name = `Name must be ${PICKUP_LOCATION_LIMITS.name} characters or less.`;

  const lengths = [
    ["addressLine", "Address"],
    ["division", "Division"],
    ["district", "District"],
    ["upazila", "Upazila"],
    ["contactPhone", "Contact phone"],
  ] as const;

  for (const [field, label] of lengths) {
    const limit = PICKUP_LOCATION_LIMITS[field];
    if (values[field].length > limit)
      errors[field] = `${label} must be ${limit} characters or less.`;
  }

  // Both coordinates are optional, but half a coordinate points nowhere. The
  // API takes them independently; a map link needs the pair.
  if (values.latitude !== "" && values.longitude === "")
    errors.longitude = "Give both coordinates, or neither.";
  if (values.longitude !== "" && values.latitude === "")
    errors.latitude = "Give both coordinates, or neither.";

  if (values.latitude !== "") {
    const latitude = Number(values.latitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)
      errors.latitude = "Latitude must be between -90 and 90.";
  }

  if (values.longitude !== "") {
    const longitude = Number(values.longitude);
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)
      errors.longitude = "Longitude must be between -180 and 180.";
  }

  if (values.displayOrder !== "") {
    const order = Number(values.displayOrder);
    if (!Number.isInteger(order) || order < 0)
      errors.displayOrder = "Display order must be a whole number, 0 or more.";
  }

  return errors;
}
