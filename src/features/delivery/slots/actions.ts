"use server";

import { revalidatePath } from "next/cache";

import { hasPermission, requireUser } from "@/lib/auth/dal";

import {
  deliveryFormError,
  deliveryMutationError,
  type DeliveryActionResult,
} from "../action-result";
import { DELIVERY_CONFIG_MANAGE, fromTimeInput, toTimeInput } from "../shared";
import { createDeliverySlot, setDeliverySlotActive, updateDeliverySlot } from "./api";
import {
  DELIVERY_SLOT_LIMITS,
  emptyDeliverySlotForm,
  parseDayPart,
  type DeliverySlotFormValues,
} from "./types";

const SLOTS_PATH = "/delivery/slots";

/** The calendar and the restrictions screens both pick from this list. */
const CALENDAR_PATH = "/delivery/calendar";
const RESTRICTIONS_PATH = "/delivery/restrictions";

type SlotFieldErrors = Partial<Record<keyof DeliverySlotFormValues, string>>;

export type DeliverySlotFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: SlotFieldErrors;
  /** Echoed back so a rejected submission does not lose what was typed. */
  values?: DeliverySlotFormValues;
};

/** Create a time slot, or update it when the form carries an `id`. */
export async function saveDeliverySlotAction(
  _state: DeliverySlotFormState | undefined,
  formData: FormData,
): Promise<DeliverySlotFormState> {
  const user = await requireUser();

  const id = String(formData.get("id") ?? "").trim();
  const isEdit = id.length > 0;

  const values: DeliverySlotFormValues = {
    name: String(formData.get("name") ?? "").trim(),
    startTime: toTimeInput(String(formData.get("startTime") ?? "")),
    endTime: toTimeInput(String(formData.get("endTime") ?? "")),
    dayPart: parseDayPart(String(formData.get("dayPart") ?? "")),
    displayOrder: String(formData.get("displayOrder") ?? "").trim(),
  };

  if (!hasPermission(user, DELIVERY_CONFIG_MANAGE)) {
    return {
      status: "error",
      message: `You do not have the ${DELIVERY_CONFIG_MANAGE} permission.`,
      values,
    };
  }

  const fieldErrors = validateSlot(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
  }

  const input = {
    name: values.name,
    startTime: fromTimeInput(values.startTime),
    endTime: fromTimeInput(values.endTime),
    dayPart: values.dayPart || undefined,
    displayOrder:
      values.displayOrder === "" ? undefined : Number(values.displayOrder),
  };

  try {
    const saved = isEdit
      ? await updateDeliverySlot(id, input)
      : await createDeliverySlot(input);

    if (!saved) {
      return {
        status: "error",
        message: "The slot was saved but the API returned no record.",
        values,
      };
    }

    revalidatePath(SLOTS_PATH);
    revalidatePath(CALENDAR_PATH);
    revalidatePath(RESTRICTIONS_PATH);

    return {
      status: "success",
      message: isEdit ? `Updated ${saved.name}.` : `Created ${saved.name}.`,
      values: emptyDeliverySlotForm,
    };
  } catch (error) {
    return {
      status: "error",
      values,
      ...deliveryFormError(
        error,
        ["name", "startTime", "endTime", "dayPart", "displayOrder"] as const,
        "a delivery slot",
      ),
    };
  }
}

/**
 * Activate or deactivate a time slot.
 *
 * Deactivating stops the slot being offered for *new* calendar days. It does
 * not remove it from days already built on it — those are edited on the
 * calendar screen, slot by slot.
 */
export async function setDeliverySlotActiveAction(
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
    const slot = await setDeliverySlotActive(id, active);
    if (!slot) return { ok: false, message: "The API returned no record." };

    revalidatePath(SLOTS_PATH);
    revalidatePath(CALENDAR_PATH);
    revalidatePath(RESTRICTIONS_PATH);

    return {
      ok: true,
      message: active ? `Activated ${slot.name}.` : `Deactivated ${slot.name}.`,
    };
  } catch (error) {
    return deliveryMutationError(error, "a delivery slot");
  }
}

/** Local mirror of the API's documented field constraints. */
function validateSlot(values: DeliverySlotFormValues): SlotFieldErrors {
  const errors: SlotFieldErrors = {};

  if (!values.name) errors.name = "Name is required.";
  else if (values.name.length > DELIVERY_SLOT_LIMITS.name)
    errors.name = `Name must be ${DELIVERY_SLOT_LIMITS.name} characters or less.`;

  if (!values.startTime) errors.startTime = "Start time is required.";
  if (!values.endTime) errors.endTime = "End time is required.";

  // Not a rule the spec states, but a window that ends before it starts is not
  // a window. The API may well accept it and then never match a booking.
  if (values.startTime && values.endTime && values.endTime <= values.startTime)
    errors.endTime = "End time must be after the start time.";

  if (values.displayOrder !== "") {
    const order = Number(values.displayOrder);
    if (!Number.isInteger(order) || order < 0)
      errors.displayOrder = "Display order must be a whole number, 0 or more.";
  }

  return errors;
}
