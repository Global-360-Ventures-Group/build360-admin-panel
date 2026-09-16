"use server";

import { revalidatePath } from "next/cache";

import { ApiError, ApiUnreachableError } from "@/lib/api/errors";
import { hasPermission, requireUser } from "@/lib/auth/dal";

import {
  createStaff,
  getStaff,
  setStaffActive,
  updateStaff,
  type CreateStaffInput,
  type UpdateStaffInput,
} from "./api";
import {
  emptyStaffForm,
  STAFF_LIMITS,
  STAFF_PASSWORD_MIN,
  staffDetailLabel,
  type StaffDetail,
  type StaffFormValues,
} from "./types";

const STAFF_PATH = "/staff";

/** The one permission guarding every Backoffice Staff endpoint. */
const STAFF_PERMISSION = "USER_MANAGEMENT";

type StaffFieldErrors = Partial<Record<keyof StaffFormValues, string>>;

export type StaffFormState = {
  status: "idle" | "success" | "error";
  /** Error to show above the form, or the success confirmation. */
  message?: string;
  fieldErrors?: StaffFieldErrors;
  /** Echoed back so a rejected submission does not lose what was typed. */
  values?: StaffFormValues;
};

export type StaffActionResult = {
  ok: boolean;
  message: string;
};

export type LoadStaffResult =
  | { ok: true; staff: StaffDetail }
  | { ok: false; message: string };

/**
 * Fetch one staff member's full record.
 *
 * The edit dialog opens from a table row, and a row is not enough to fill the
 * form: `StaffListItemResponse` carries a joined `fullName` and role names,
 * while the form needs `firstName`/`lastName` apart and role *ids*. So the
 * dialog asks for the detail when it opens rather than the page fetching one
 * per row up front, which would be twenty requests to render twenty rows.
 */
export async function loadStaffAction(id: string): Promise<LoadStaffResult> {
  const user = await requireUser();

  if (!hasPermission(user, STAFF_PERMISSION)) {
    return { ok: false, message: `You do not have the ${STAFF_PERMISSION} permission.` };
  }

  try {
    const staff = await getStaff(id);
    if (!staff) return { ok: false, message: "That staff member no longer exists." };

    return { ok: true, staff };
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

    console.error("Unexpected error loading a staff member.", error);

    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

/**
 * Create a staff member, or update one when the form carries an `id`.
 *
 * Validation runs twice by design: locally, to give per-field messages without
 * a round-trip, and then again at the API, whose own "Validation failed"
 * response is mapped back onto the same fields. The API is the authority --
 * this is a courtesy layer, not a replacement for it.
 */
export async function saveStaffAction(
  _state: StaffFormState | undefined,
  formData: FormData,
): Promise<StaffFormState> {
  const user = await requireUser();

  const id = String(formData.get("id") ?? "").trim();
  const isEdit = id.length > 0;

  const values: StaffFormValues = {
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    username: String(formData.get("username") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    department: String(formData.get("department") ?? "").trim(),
    jobTitle: String(formData.get("jobTitle") ?? "").trim(),
    // Never trimmed and never echoed back — see `withoutPassword`.
    password: String(formData.get("password") ?? ""),
    active: formData.get("active") === "true",
    roleIds: formData.getAll("roleIds").map(String).filter(Boolean),
  };

  if (!hasPermission(user, STAFF_PERMISSION)) {
    return {
      status: "error",
      message: `You do not have the ${STAFF_PERMISSION} permission.`,
      values: withoutPassword(values),
    };
  }

  // The API blocks this on the dedicated deactivate endpoint; whether its
  // update path enforces the same rule is undocumented, so the rule is kept
  // here too. Locking yourself out is not recoverable from this panel.
  if (isEdit && id === user.id && !values.active) {
    return {
      status: "error",
      message: "You cannot deactivate your own account.",
      fieldErrors: { active: "Ask another administrator to do this." },
      values: withoutPassword(values),
    };
  }

  const fieldErrors = validateStaff(values, { isEdit });
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values: withoutPassword(values) };
  }

  try {
    const saved = isEdit
      ? await updateStaff(id, toUpdateInput(values))
      : await createStaff(toCreateInput(values));

    if (!saved) {
      return {
        status: "error",
        message: "The staff member was saved but the API returned no record.",
        values: withoutPassword(values),
      };
    }

    revalidatePath(STAFF_PATH);

    return {
      status: "success",
      message: isEdit
        ? `Updated ${staffDetailLabel(saved)}.`
        : `Created ${staffDetailLabel(saved)}.`,
      values: emptyStaffForm,
    };
  } catch (error) {
    return staffFormError(error, withoutPassword(values));
  }
}

/**
 * Activate or deactivate a staff account.
 *
 * The API refuses to deactivate your own account or the last SUPER_ADMIN, and
 * reports why. Only the first of those can be known here, so it is caught
 * early and the other is left to the API's own message.
 */
export async function setStaffActiveAction(
  id: string,
  active: boolean,
): Promise<StaffActionResult> {
  const user = await requireUser();

  if (!hasPermission(user, STAFF_PERMISSION)) {
    return { ok: false, message: `You do not have the ${STAFF_PERMISSION} permission.` };
  }

  if (!active && id === user.id) {
    return { ok: false, message: "You cannot deactivate your own account." };
  }

  try {
    const staff = await setStaffActive(id, active);
    if (!staff) return { ok: false, message: "The API returned no record." };

    revalidatePath(STAFF_PATH);

    return {
      ok: true,
      message: active
        ? `Activated ${staffDetailLabel(staff)}.`
        : `Deactivated ${staffDetailLabel(staff)}.`,
    };
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

    console.error("Unexpected error during a staff mutation.", error);

    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

/**
 * `CreateStaffRequest` from the form.
 *
 * Empty optionals are dropped rather than sent as "". Two of them — `email`
 * and `username` — are the credentials people sign in with, and an account
 * holding an empty string there is a row that can collide with the next one
 * created the same way.
 */
function toCreateInput(values: StaffFormValues): CreateStaffInput {
  return {
    firstName: values.firstName,
    lastName: values.lastName || undefined,
    email: values.email || undefined,
    username: values.username || undefined,
    phone: values.phone || undefined,
    department: values.department || undefined,
    jobTitle: values.jobTitle || undefined,
    password: values.password,
    active: values.active,
    roleIds: values.roleIds,
  };
}

/**
 * `UpdateStaffRequest` from the form.
 *
 * No `email`, `username` or `password`: the update schema has none of them.
 * `active` is always sent explicitly, because the update is a replace and a
 * missing flag is not worth gambling on.
 */
function toUpdateInput(values: StaffFormValues): UpdateStaffInput {
  return {
    firstName: values.firstName,
    lastName: values.lastName || undefined,
    phone: values.phone || undefined,
    department: values.department || undefined,
    jobTitle: values.jobTitle || undefined,
    active: values.active,
    roleIds: values.roleIds,
  };
}

/** Local mirror of the API's documented field constraints. */
function validateStaff(
  values: StaffFormValues,
  { isEdit }: { isEdit: boolean },
): StaffFieldErrors {
  const errors: StaffFieldErrors = {};

  if (!values.firstName) errors.firstName = "First name is required.";
  else if (values.firstName.length > STAFF_LIMITS.firstName)
    errors.firstName = `First name must be ${STAFF_LIMITS.firstName} characters or less.`;

  if (values.lastName.length > STAFF_LIMITS.lastName)
    errors.lastName = `Last name must be ${STAFF_LIMITS.lastName} characters or less.`;

  if (values.phone.length > STAFF_LIMITS.phone)
    errors.phone = `Phone must be ${STAFF_LIMITS.phone} characters or less.`;

  if (values.department.length > STAFF_LIMITS.department)
    errors.department = `Department must be ${STAFF_LIMITS.department} characters or less.`;

  if (values.jobTitle.length > STAFF_LIMITS.jobTitle)
    errors.jobTitle = `Job title must be ${STAFF_LIMITS.jobTitle} characters or less.`;

  // `minItems: 1` in both request schemas. There is no such thing as a staff
  // account with no role.
  if (values.roleIds.length === 0)
    errors.roleIds = "Assign at least one role.";

  // Everything below is create-only: the update schema carries none of these
  // fields, so the edit form does not render them and must not be judged on
  // them either.
  if (isEdit) return errors;

  if (values.email) {
    if (values.email.length > STAFF_LIMITS.email)
      errors.email = `Email must be ${STAFF_LIMITS.email} characters or less.`;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
      errors.email = "Enter a valid email address.";
  }

  if (values.username.length > STAFF_LIMITS.username)
    errors.username = `Username must be ${STAFF_LIMITS.username} characters or less.`;

  // Both are optional at the API, but `POST /auth/user/login` takes one
  // `identifier` that is either of them. An account with neither is an account
  // nobody can ever sign in to, and neither can be added later.
  if (!values.email && !values.username)
    errors.username = "Give an email address or a username — one of them is the sign-in name.";

  if (!values.password) errors.password = "An initial password is required.";
  else if (values.password.length < STAFF_PASSWORD_MIN)
    errors.password = `Password must be at least ${STAFF_PASSWORD_MIN} characters.`;
  else if (values.password.length > STAFF_LIMITS.password)
    errors.password = `Password must be ${STAFF_LIMITS.password} characters or less.`;

  return errors;
}

/**
 * The submitted values minus the password.
 *
 * Every other field is echoed back so a rejected submission keeps what was
 * typed. The password is not: it would travel back down to the browser and
 * sit in the form's state for no gain, since the field is re-entered anyway.
 */
function withoutPassword(values: StaffFormValues): StaffFormValues {
  return { ...values, password: "" };
}

function staffFormError(error: unknown, values: StaffFormValues): StaffFormState {
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
          firstName: fieldErrors.firstName,
          lastName: fieldErrors.lastName,
          email: fieldErrors.email,
          username: fieldErrors.username,
          phone: fieldErrors.phone,
          department: fieldErrors.department,
          jobTitle: fieldErrors.jobTitle,
          password: fieldErrors.password,
          roleIds: fieldErrors.roleIds,
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

  console.error("Unexpected error saving a staff member.", error);

  return { status: "error", message: "Something went wrong. Please try again.", values };
}
