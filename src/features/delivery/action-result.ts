/**
 * The shape every delivery mutation reports back, and the one place that turns
 * a thrown error into it.
 *
 * Deliberately not inside an `actions.ts`: a `"use server"` module publishes
 * every export as a callable server action, and this helper is neither an
 * action nor safe to expose as one. Five features share it, which is also why
 * it is not copied into each of them — that is how the wording drifts apart.
 */

import { ApiError, ApiUnreachableError } from "@/lib/api/errors";

export type DeliveryActionResult = {
  ok: boolean;
  message: string;
};

/**
 * Translate a failed mutation into something worth showing.
 *
 * @param subject what was being changed, for the server log only
 */
export function deliveryMutationError(
  error: unknown,
  subject: string,
): DeliveryActionResult {
  if (error instanceof ApiUnreachableError) {
    return { ok: false, message: "Could not reach the Build360 API." };
  }

  if (error instanceof ApiError) {
    return {
      ok: false,
      message: error.isForbidden
        ? "You are not allowed to do that."
        : error.message,
    };
  }

  console.error(`Unexpected error during a mutation on ${subject}.`, error);

  return { ok: false, message: "Something went wrong. Please try again." };
}

/**
 * Translate a failed form submission into a message and, where the API named
 * fields, the per-field errors.
 *
 * `fields` lists which of the form's keys to pick out of the API's own
 * validation response — anything it reports for a field the form does not have
 * would otherwise vanish silently.
 */
export function deliveryFormError<K extends string>(
  error: unknown,
  fields: readonly K[],
  subject: string,
): { message?: string; fieldErrors?: Partial<Record<K, string>> } {
  if (error instanceof ApiUnreachableError) {
    return {
      message: "Could not reach the Build360 API. Check that the server is running.",
    };
  }

  if (error instanceof ApiError) {
    const reported = error.fieldErrorMap();
    const fieldErrors: Partial<Record<K, string>> = {};

    for (const field of fields) {
      if (reported[field]) fieldErrors[field] = reported[field];
    }

    if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

    return {
      message: error.isForbidden
        ? "You are not allowed to do that."
        : error.message,
    };
  }

  console.error(`Unexpected error saving ${subject}.`, error);

  return { message: "Something went wrong. Please try again." };
}
