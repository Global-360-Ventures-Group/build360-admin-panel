import type { Metadata } from "next";
import { forbidden } from "next/navigation";

import { listPermissions, listRoles } from "@/features/roles/api";
import { RolesView } from "@/features/roles/roles-view";
import { listStaff } from "@/features/staff/api";
import { hasPermission, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Roles · Build360 Admin",
};

/**
 * One permission covers this whole screen — the same one the staff screen
 * uses. Backoffice Roles and Backoffice Permissions are both guarded by
 * `USER_MANAGEMENT`, so there is nothing finer to pass down to the view.
 */
const ROLES_PERMISSION = "USER_MANAGEMENT";

export default async function RolesPage() {
  const user = await requireUser();

  if (!hasPermission(user, ROLES_PERMISSION)) forbidden();

  const [roles, permissions] = await Promise.all([
    listRoles(),
    listPermissions(),
  ]);

  return (
    <RolesView
      roles={roles}
      permissions={permissions}
      usage={await countHolders(roles.map((role) => role.id))}
    />
  );
}

/**
 * How many staff hold each role.
 *
 * There is no count on `RoleResponse` and no endpoint that reports one, so
 * this asks `GET /admin/users?roleId=…` for a single row per role and keeps
 * its `totalElements`. That is one request per role, which is affordable only
 * because the role list is short and unpaginated — if roles ever run to the
 * hundreds this needs a real endpoint rather than a bigger fan-out.
 *
 * It is worth the requests: roles cannot be deleted, so "is anything using
 * this?" is the question you actually have in front of a list of them, and
 * editing one silently changes what its holders can do.
 */
async function countHolders(roleIds: string[]): Promise<Record<string, number>> {
  const counts = await Promise.all(
    roleIds.map(async (roleId) => {
      const page = await listStaff({ roleId, size: 1 });

      return [roleId, page.totalElements] as const;
    }),
  );

  return Object.fromEntries(counts);
}
