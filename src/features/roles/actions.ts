"use server";

import { revalidatePath } from "next/cache";

import { ApiError, ApiUnreachableError } from "@/lib/api/errors";
import { hasPermission, requireUser } from "@/lib/auth/dal";

import { createRole, updateRole } from "./api";
import { emptyRoleForm, ROLE_LIMITS, type RoleFormValues } from "./types";

const ROLES_PATH = "/roles";

/**
 * The staff screen renders every role's name and permission count in its
 * picker, so a role edit has to invalidate that page too — otherwise the
 * assignment list keeps describing a role that has changed underneath it.
 */
const STAFF_PATH = "/staff";

/** The one permission guarding both Backoffice Roles and Permissions. */
const ROLES_PERMISSION = "USER_MANAGEMENT";

type RoleFieldErrors = Partial<Record<keyof RoleFormValues, string>>;

export type RoleFormState = {
  status: "idle" | "success" | "error";
  /** Error to show above the form, or the success confirmation. */
  message?: string;
  fieldErrors?: RoleFieldErrors;
  /** Echoed back so a rejected submission does not lose what was typed. */
  values?: RoleFormValues;
};

/**
 * Create a role, or update it when the form carries an `id`.
 *
 * SUPER_ADMIN is not special-cased here. The UI hides its edit action, and
 * the API refuses the write outright — adding a third check keyed on the
 * submitted *name* would only misfire, since a rename is exactly what the
 * body carries.
 */
export async function saveRoleAction(
  _state: RoleFormState | undefined,
  formData: FormData,
): Promise<RoleFormState> {
  const user = await requireUser();

  const id = String(formData.get("id") ?? "").trim();
  const isEdit = id.length > 0;

  const values: RoleFormValues = {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    permissionIds: formData.getAll("permissionIds").map(String).filter(Boolean),
  };

  if (!hasPermission(user, ROLES_PERMISSION)) {
    return {
      status: "error",
      message: `You do not have the ${ROLES_PERMISSION} permission.`,
      values,
    };
  }

  const fieldErrors = validateRole(values);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
  }

  const input = {
    name: values.name,
    // Optional at the API. Sending "" would store an empty string rather than
    // leaving the field unset.
    description: values.description || undefined,
    permissionIds: values.permissionIds,
  };

  try {
    const saved = isEdit ? await updateRole(id, input) : await createRole(input);

    if (!saved) {
      return {
        status: "error",
        message: "The role was saved but the API returned no record.",
        values,
      };
    }

    revalidatePath(ROLES_PATH);
    revalidatePath(STAFF_PATH);

    return {
      status: "success",
      message: isEdit ? `Updated ${saved.name}.` : `Created ${saved.name}.`,
      values: emptyRoleForm,
    };
  } catch (error) {
    return roleFormError(error, values);
  }
}

/** Local mirror of the API's documented field constraints. */
function validateRole(values: RoleFormValues): RoleFieldErrors {
  const errors: RoleFieldErrors = {};

  if (!values.name) errors.name = "Role name is required.";
  else if (values.name.length > ROLE_LIMITS.name)
    errors.name = `Name must be ${ROLE_LIMITS.name} characters or less.`;

  if (values.description.length > ROLE_LIMITS.description)
    errors.description = `Description must be ${ROLE_LIMITS.description} characters or less.`;

  // `minItems: 1` in both request schemas. A role that grants nothing is not
  // a role the API will store.
  if (values.permissionIds.length === 0)
    errors.permissionIds = "Select at least one permission.";

  return errors;
}

function roleFormError(error: unknown, values: RoleFormValues): RoleFormState {
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
          description: fieldErrors.description,
          permissionIds: fieldErrors.permissionIds,
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

  console.error("Unexpected error saving a role.", error);

  return { status: "error", message: "Something went wrong. Please try again.", values };
}
