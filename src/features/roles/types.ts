/**
 * Role and permission models, mirroring the Backoffice Roles and Backoffice
 * Permissions schemas of the Build360 API.
 *
 * Permissions are **code-defined**: the backend declares them, and the only
 * endpoint is a read. Nothing in this panel creates, renames or removes one —
 * `GET /admin/permissions` is a catalogue to pick from, not a table to manage.
 *
 * Roles are the writable half, with two limits worth knowing before designing
 * around them:
 *
 * - **There is no DELETE.** A role, once created, exists forever; the API has
 *   no delete and no deactivate for one. So the create dialog says as much,
 *   rather than letting someone discover it afterwards.
 * - **SUPER_ADMIN cannot be modified.** The API refuses it, and the only
 *   signal this side has is the name — see `isImmutableRole`.
 */

/** `PermissionResponse` — one entry of the catalogue. */
export type Permission = {
  id: string;
  /** e.g. `PRODUCT_UPDATE`. What `hasPermission` checks against. */
  code: string;
  description: string;
};

/** `RoleResponse` — a role with the permissions it grants. */
export type Role = {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
};

/** What the create/edit form collects. */
export type RoleFormValues = {
  name: string;
  description: string;
  permissionIds: string[];
};

export const emptyRoleForm: RoleFormValues = {
  name: "",
  description: "",
  permissionIds: [],
};

/** Field limits taken from `CreateRoleRequest` / `UpdateRoleRequest`. */
export const ROLE_LIMITS = {
  name: 100,
  description: 500,
} as const;

/**
 * The one role the API refuses to change.
 *
 * Matched by name because that is the only thing the response carries — there
 * is no `system` or `builtIn` flag. If the backend ever adds one, use it
 * instead: a name is a weak key for a rule this important.
 */
export const IMMUTABLE_ROLE_NAME = "SUPER_ADMIN";

export function isImmutableRole(role: Role): boolean {
  return role.name === IMMUTABLE_ROLE_NAME;
}

/** Roles ordered by name, leaving the input untouched. */
export function sortRoles(roles: Role[]): Role[] {
  return [...roles].sort(
    (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  );
}

/** Permissions ordered by code, leaving the input untouched. */
export function sortPermissions(permissions: Permission[]): Permission[] {
  return [...permissions].sort(
    (a, b) => a.code.localeCompare(b.code) || a.id.localeCompare(b.id),
  );
}

/** A set of permissions sharing a code prefix, for the picker. */
export type PermissionGroup = {
  /** The shared prefix, e.g. `PRODUCT`. */
  key: string;
  /** Readable form of the prefix, e.g. "Product". */
  label: string;
  permissions: Permission[];
};

/**
 * Split the catalogue into groups by the first segment of each code.
 *
 * Forty-odd checkboxes in one flat column is a wall nobody reads. The codes
 * already carry their own grouping — `PRODUCT_VIEW`, `PRODUCT_CREATE`,
 * `PRODUCT_UPDATE` — so the prefix is used rather than a hand-kept mapping
 * that would fall behind the day the backend adds a permission.
 *
 * A code with no underscore becomes its own group, which is the honest
 * outcome: it is not related to anything else by the only signal available.
 */
export function groupPermissions(permissions: Permission[]): PermissionGroup[] {
  const groups = new Map<string, Permission[]>();

  for (const permission of sortPermissions(permissions)) {
    const key = permission.code.split("_")[0] || permission.code || "OTHER";
    const bucket = groups.get(key);

    if (bucket) bucket.push(permission);
    else groups.set(key, [permission]);
  }

  return [...groups.entries()]
    .map(([key, items]) => ({ key, label: groupLabel(key), permissions: items }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** `PRODUCT` -> "Product". Left alone if it is not a plain uppercase word. */
function groupLabel(key: string): string {
  return key.charAt(0) + key.slice(1).toLowerCase();
}

/** Does this role grant the permission? Used to pre-tick the picker. */
export function roleHasPermission(role: Role, permissionId: string): boolean {
  return role.permissions.some((permission) => permission.id === permissionId);
}
