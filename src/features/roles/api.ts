/**
 * The four `/admin/roles` endpoints and the one `/admin/permissions` read.
 *
 * Both are guarded by `USER_MANAGEMENT` — the same grant that opens the staff
 * screen — and both are among the operations whose OpenAPI entry omits
 * `security` despite the live API answering 401 without a token.
 *
 * Note what is missing: there is no `DELETE /admin/roles/{id}` and no
 * activate/deactivate pair. A role is permanent once created.
 */

import { authedRequestData } from "@/lib/api/authed";

import {
  sortPermissions,
  sortRoles,
  type Permission,
  type Role,
} from "./types";

/** Raw `RoleResponse`, exactly as loose as the spec declares it. */
type RoleResponse = {
  id?: string;
  name?: string;
  description?: string;
  permissions?: PermissionResponse[];
};

/** Raw `PermissionResponse`. */
type PermissionResponse = {
  id?: string;
  code?: string;
  description?: string;
};

/** What create and update accept — the same body for both. */
export type RoleInput = {
  name: string;
  description?: string;
  /** `minItems: 1`; a role with no permissions is not a thing the API stores. */
  permissionIds: string[];
};

/**
 * `GET /admin/roles` — every role of the tenant, with its permissions.
 *
 * Not paginated: the endpoint returns a plain array, so there is nothing to
 * walk and no page size to clamp. That also means the whole set is in hand at
 * once, which is why the roles screen filters in the browser rather than
 * through the URL the way the paged catalogue screens do.
 */
export async function listRoles(): Promise<Role[]> {
  const roles = await authedRequestData<RoleResponse[]>("/admin/roles");

  return sortRoles(
    roles.flatMap((raw) => {
      const role = toRole(raw);
      return role ? [role] : [];
    }),
  );
}

/**
 * `GET /admin/roles/{id}`.
 *
 * The list already returns each role's permissions, so the edit dialog does
 * not need this — unlike the staff form, whose list rows are too thin. It is
 * here because the endpoint exists and a future detail view will want it.
 */
export async function getRole(id: string): Promise<Role | null> {
  return toRole(await authedRequestData<RoleResponse>(`/admin/roles/${id}`));
}

/** `POST /admin/roles`. The name must be unique across the tenant. */
export function createRole(input: RoleInput): Promise<Role | null> {
  return authedRequestData<RoleResponse>("/admin/roles", {
    method: "POST",
    body: input,
  }).then(toRole);
}

/**
 * `PUT /admin/roles/{id}` — replaces name, description and permissions.
 *
 * A replace, not a patch: the permissions sent are the permissions the role
 * ends up with. The API refuses this outright for SUPER_ADMIN.
 */
export function updateRole(id: string, input: RoleInput): Promise<Role | null> {
  return authedRequestData<RoleResponse>(`/admin/roles/${id}`, {
    method: "PUT",
    body: input,
  }).then(toRole);
}

/**
 * `GET /admin/permissions` — the full catalogue, ordered by code.
 *
 * Read-only by design: permissions are defined in the backend's own code, so
 * this is the list a role is assembled from and the only place their ids can
 * be learned. `CreateRoleRequest.permissionIds` takes ids, not codes.
 */
export async function listPermissions(): Promise<Permission[]> {
  const permissions =
    await authedRequestData<PermissionResponse[]>("/admin/permissions");

  return sortPermissions(
    permissions.flatMap((raw) => {
      const permission = toPermission(raw);
      return permission ? [permission] : [];
    }),
  );
}

/** Narrow a role, or null when it lacks the id every action needs. */
function toRole(raw: RoleResponse): Role | null {
  if (!raw.id) return null;

  return {
    id: raw.id,
    name: raw.name ?? "",
    description: raw.description ?? "",
    permissions: (raw.permissions ?? []).flatMap((permission) => {
      const narrowed = toPermission(permission);
      return narrowed ? [narrowed] : [];
    }),
  };
}

/** Narrow a permission, or null when it lacks the id the form submits. */
function toPermission(raw: PermissionResponse): Permission | null {
  if (!raw.id) return null;

  return {
    id: raw.id,
    code: raw.code ?? "",
    description: raw.description ?? "",
  };
}
