"use server";

import { revalidatePath } from "next/cache";

import { hasPermission, requireUser } from "@/lib/auth/dal";

import { deliveryFormError, deliveryMutationError } from "../action-result";
import { DELIVERY_CALENDAR_MANAGE, daysBetween, isIsoDate } from "../shared";
import {
  bulkCreateCalendar,
  createCalendarSlot,
  createDeliveryDay,
  listCalendarSlots,
  updateCalendarSlot,
  updateDeliveryDay,
  type BulkSlotSpec,
} from "./api";
import {
  BULK_MAX_DAYS,
  DELIVERY_DAY_LIMITS,
  parseCalendarSlotStatus,
  parseDeliveryDayStatus,
  type BulkCalendarResult,
  type CalendarSlot,
  type CalendarSlotFormValues,
  type DeliveryDayFormValues,
} from "./types";

const CALENDAR_PATH = "/delivery/calendar";

type DayFieldErrors = Partial<Record<keyof DeliveryDayFormValues, string>>;
type SlotFieldErrors = Partial<Record<keyof CalendarSlotFormValues, string>>;

export type DeliveryDayFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: DayFieldErrors;
  values?: DeliveryDayFormValues;
};

export type CalendarSlotFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: SlotFieldErrors;
  values?: CalendarSlotFormValues;
};

export type LoadCalendarSlotsResult =
  | { ok: true; slots: CalendarSlot[] }
  | { ok: false; message: string };

export type BulkCalendarActionResult =
  | { ok: true; result: BulkCalendarResult }
  | { ok: false; message: string };

/**
 * One day's bookable slots.
 *
 * Fetched when a day is expanded rather than for every day in the range: the
 * API has no endpoint that returns slots for a range, so listing two weeks
 * eagerly would be fourteen requests to render a screen where most rows are
 * never opened.
 */
export async function loadCalendarSlotsAction(
  dayId: string,
): Promise<LoadCalendarSlotsResult> {
  await requireUser();

  try {
    return { ok: true, slots: await listCalendarSlots(dayId) };
  } catch (error) {
    return {
      ok: false,
      message: deliveryMutationError(error, "a delivery day's slots").message,
    };
  }
}

/** Open a date, or update an existing day when the form carries an `id`. */
export async function saveDeliveryDayAction(
  _state: DeliveryDayFormState | undefined,
  formData: FormData,
): Promise<DeliveryDayFormState> {
  const user = await requireUser();

  const id = String(formData.get("id") ?? "").trim();
  const isEdit = id.length > 0;

  const values: DeliveryDayFormValues = {
    deliveryDate: String(formData.get("deliveryDate") ?? "").trim(),
    status: parseDeliveryDayStatus(String(formData.get("status") ?? "")),
    remarks: String(formData.get("remarks") ?? "").trim(),
  };

  if (!hasPermission(user, DELIVERY_CALENDAR_MANAGE)) {
    return {
      status: "error",
      message: `You do not have the ${DELIVERY_CALENDAR_MANAGE} permission.`,
      values,
    };
  }

  const fieldErrors: DayFieldErrors = {};

  if (!isEdit && !isIsoDate(values.deliveryDate))
    fieldErrors.deliveryDate = "Pick a date.";

  if (values.remarks.length > DELIVERY_DAY_LIMITS.remarks)
    fieldErrors.remarks = `Remarks must be ${DELIVERY_DAY_LIMITS.remarks} characters or less.`;

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
  }

  try {
    const saved = isEdit
      ? await updateDeliveryDay(id, {
          status: values.status,
          remarks: values.remarks || undefined,
        })
      : await createDeliveryDay({
          deliveryDate: values.deliveryDate,
          status: values.status,
          remarks: values.remarks || undefined,
        });

    if (!saved) {
      return {
        status: "error",
        message: "The day was saved but the API returned no record.",
        values,
      };
    }

    revalidatePath(CALENDAR_PATH);

    return {
      status: "success",
      message: isEdit
        ? `Updated ${saved.deliveryDate}.`
        : `Opened ${saved.deliveryDate}.`,
    };
  } catch (error) {
    return {
      status: "error",
      values,
      ...deliveryFormError(
        error,
        ["deliveryDate", "status", "remarks"] as const,
        "a delivery day",
      ),
    };
  }
}

/**
 * Add a bookable slot to a day, or update one when the form carries a slot id.
 *
 * The two bodies are not the same shape: create names the method, window and
 * pickup location; update can only change capacity, price, best-value and
 * status. Which method a bookable slot belongs to is fixed once it exists.
 */
export async function saveCalendarSlotAction(
  _state: CalendarSlotFormState | undefined,
  formData: FormData,
): Promise<CalendarSlotFormState> {
  const user = await requireUser();

  const slotId = String(formData.get("slotId") ?? "").trim();
  const dayId = String(formData.get("dayId") ?? "").trim();
  const isEdit = slotId.length > 0;
  const requiresPickup = formData.get("requiresPickup") === "true";

  const values: CalendarSlotFormValues = {
    deliverySlotId: String(formData.get("deliverySlotId") ?? "").trim(),
    deliveryMethodId: String(formData.get("deliveryMethodId") ?? "").trim(),
    pickupLocationId: String(formData.get("pickupLocationId") ?? "").trim(),
    capacity: String(formData.get("capacity") ?? "").trim(),
    price: String(formData.get("price") ?? "").trim(),
    bestValue: formData.get("bestValue") === "true",
    status: parseCalendarSlotStatus(String(formData.get("status") ?? "")),
  };

  if (!hasPermission(user, DELIVERY_CALENDAR_MANAGE)) {
    return {
      status: "error",
      message: `You do not have the ${DELIVERY_CALENDAR_MANAGE} permission.`,
      values,
    };
  }

  const fieldErrors = validateCalendarSlot(values, { isEdit, requiresPickup });
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
  }

  try {
    const saved = isEdit
      ? await updateCalendarSlot(slotId, {
          capacity: Number(values.capacity),
          price: Number(values.price),
          bestValue: values.bestValue,
          status: values.status,
        })
      : await createCalendarSlot(dayId, {
          deliverySlotId: values.deliverySlotId,
          deliveryMethodId: values.deliveryMethodId,
          pickupLocationId: requiresPickup
            ? values.pickupLocationId
            : undefined,
          capacity: Number(values.capacity),
          price: Number(values.price),
          bestValue: values.bestValue,
        });

    if (!saved) {
      return {
        status: "error",
        message: "The slot was saved but the API returned no record.",
        values,
      };
    }

    revalidatePath(CALENDAR_PATH);

    return {
      status: "success",
      message: isEdit ? "Slot updated." : "Slot added.",
    };
  } catch (error) {
    return {
      status: "error",
      values,
      ...deliveryFormError(
        error,
        [
          "deliverySlotId",
          "deliveryMethodId",
          "pickupLocationId",
          "capacity",
          "price",
          "status",
        ] as const,
        "a bookable slot",
      ),
    };
  }
}

/**
 * Build days and slots across a date range for one method.
 *
 * Returns the API's own counts rather than a bare success: it skips dates a
 * restriction covers and slots that already exist, and saying "done" over the
 * top of that would be a lie about what is now bookable.
 */
export async function bulkCreateCalendarAction(input: {
  fromDate: string;
  toDate: string;
  deliveryMethodId: string;
  slots: BulkSlotSpec[];
}): Promise<BulkCalendarActionResult> {
  const user = await requireUser();

  if (!hasPermission(user, DELIVERY_CALENDAR_MANAGE)) {
    return {
      ok: false,
      message: `You do not have the ${DELIVERY_CALENDAR_MANAGE} permission.`,
    };
  }

  if (!isIsoDate(input.fromDate) || !isIsoDate(input.toDate)) {
    return { ok: false, message: "Pick a start and an end date." };
  }

  const span = daysBetween(input.fromDate, input.toDate);
  if (span === null || span < 0) {
    return { ok: false, message: "The end date is before the start date." };
  }
  if (span + 1 > BULK_MAX_DAYS) {
    return {
      ok: false,
      message: `That is ${span + 1} days. Build at most ${BULK_MAX_DAYS} at a time — nothing in this API deletes a day once it exists.`,
    };
  }

  if (!input.deliveryMethodId) {
    return { ok: false, message: "Pick a delivery method." };
  }
  if (input.slots.length === 0) {
    return { ok: false, message: "Add at least one time slot." };
  }

  try {
    return { ok: true, result: await bulkCreateCalendar(input) };
  } catch (error) {
    return {
      ok: false,
      message: deliveryMutationError(error, "the calendar bulk build").message,
    };
  }
}

/** Local mirror of the API's documented field constraints. */
function validateCalendarSlot(
  values: CalendarSlotFormValues,
  { isEdit, requiresPickup }: { isEdit: boolean; requiresPickup: boolean },
): SlotFieldErrors {
  const errors: SlotFieldErrors = {};

  const capacity = Number(values.capacity);
  if (values.capacity === "") errors.capacity = "Capacity is required.";
  else if (!Number.isInteger(capacity) || capacity < 0)
    errors.capacity = "Capacity must be a whole number, 0 or more.";

  const price = Number(values.price);
  if (values.price === "") errors.price = "Price is required.";
  else if (!Number.isFinite(price) || price < 0)
    errors.price = "Price must be 0 or more.";

  // Create names the method, window and location; update cannot change any of
  // them, so it is not judged on them either.
  if (isEdit) return errors;

  if (!values.deliverySlotId) errors.deliverySlotId = "Pick a time slot.";
  if (!values.deliveryMethodId)
    errors.deliveryMethodId = "Pick a delivery method.";

  // Stated in the endpoint's prose rather than its schema: Click & Collect
  // needs somewhere to collect from.
  if (requiresPickup && !values.pickupLocationId)
    errors.pickupLocationId =
      "Click & Collect slots need a pickup location.";

  return errors;
}

