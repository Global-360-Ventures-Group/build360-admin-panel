/**
 * The six `/admin/users` endpoints, plus the `/admin/roles` read the staff
 * screen needs for its role picker and role filter.
 *
 * All of them are guarded by `USER_MANAGEMENT`. The OpenAPI document does not
 * say so — it omits `security` on every operation of this tag — but the live
 * API answers 401 without a bearer token and 403 without the permission, so
 * treat the spec's silence as a documentation bug rather than as public
 * access.
 *
 * Response fields are optional in the spec, so `toStaffDetail` and friends
 * narrow each record once here and the rest of the feature works with
 * complete objects.
 */

import { authedRequestData } from "@/lib/api/authed";
import { fetchAllPages } from "@/lib/api/paging";

import {
  STAFF_PAGE_SIZE_DEFAULT,
  STAFF_PAGE_SIZE_MAX,
  type Role,
  type StaffDetail,
  type StaffListItem,
  type StaffPage,
} from "./types";

/** Raw `StaffListItemResponse`, exactly as loose as the spec declares it. */
type StaffListItemResponse = {
  id?: string;
  fullName?: string;
  email?: string;
  username?: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  roles?: string[];
  active?: boolean;
  lastLoginAt?: string;
};

/** Raw `StaffDetailResponse`. */
type StaffDetailResponse = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  active?: boolean;
  lastLoginAt?: string;
  roles?: { id?: string; name?: string }[];
};

/** Raw `RoleResponse`. */
type RoleResponse = {
  id?: string;
  name?: string;
  description?: string;
  permissions?: { id?: string; code?: string; description?: string }[];
};

type PageResponse<T> = {
  content?: T[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
};

export type StaffListQuery = {
  page?: number;
  size?: number;
  /** Matches name and email. */
  search?: string;
  roleId?: string;
  /** Leave undefined to get active and deactivated accounts alike. */
  active?: boolean;
};

/**
 * What `POST /admin/users` accepts.
 *
 * `roleIds` is `minItems: 1`: the API has no concept of a staff account with
 * no role, so there is no empty-array case to handle.
 */
export type CreateStaffInput = {
  firstName: string;
  lastName?: string;
  email?: string;
  username?: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  password: string;
  active?: boolean;
  roleIds: string[];
};

/**
 * What `PUT /admin/users/{id}` accepts.
 *
 * Narrower than create, and not by omission here: `UpdateStaffRequest` has no
 * `email`, `username` or `password` at all. Those three cannot be changed
 * through this API once the account exists.
 *
 * It is also a replace rather than a patch — every field the body leaves out
 * is cleared — so callers send the whole record back, including the values
 * they did not touch.
 */
export type UpdateStaffInput = {
  firstName: string;
  lastName?: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  active?: boolean;
  roleIds: string[];
};

/**
 * `GET /admin/users` — one page of staff.
 *
 * `size` is clamped to the API's maximum of 100; asking for more is a 400
 * rather than a truncated page, so it is clamped here instead of trusting the
 * caller.
 */
export async function listStaff(query: StaffListQuery = {}): Promise<StaffPage> {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(0, query.page ?? 0)));
  params.set(
    "size",
    String(
      Math.min(
        STAFF_PAGE_SIZE_MAX,
        Math.max(1, query.size ?? STAFF_PAGE_SIZE_DEFAULT),
      ),
    ),
  );
  if (query.search) params.set("search", query.search);
  if (query.roleId) params.set("roleId", query.roleId);
  if (query.active !== undefined) params.set("active", String(query.active));

  const page = await authedRequestData<PageResponse<StaffListItemResponse>>(
    `/admin/users?${params}`,
  );

  const content = (page.content ?? []).flatMap((raw) => {
    const staff = toStaffListItem(raw);
    return staff ? [staff] : [];
  });

  return {
    content,
    page: page.page ?? 0,
    size: page.size ?? STAFF_PAGE_SIZE_DEFAULT,
    totalElements: page.totalElements ?? content.length,
    totalPages: page.totalPages ?? 1,
    first: page.first ?? true,
    last: page.last ?? true,
  };
}

/**
 * Every staff member matching the query, rather than one page.
 *
 * Only the sorted path needs this: `GET /admin/users` has no ordering
 * parameter, so sorting one page would order the twenty rows the API happened
 * to return and label the result "Name A–Z".
 */
export async function listAllStaff(
  query: Omit<StaffListQuery, "page" | "size"> = {},
): Promise<{ staff: StaffListItem[]; total: number; truncated: boolean }> {
  const { items, total, truncated } = await fetchAllPages(
    (page) => listStaff({ ...query, page, size: STAFF_PAGE_SIZE_MAX }),
    (staff) => staff.id,
  );

  return { staff: items, total, truncated };
}

/** `GET /admin/users/{id}` — the shape the edit form needs. */
export async function getStaff(id: string): Promise<StaffDetail | null> {
  return toStaffDetail(
    await authedRequestData<StaffDetailResponse>(`/admin/users/${id}`),
  );
}

/** `POST /admin/users`. */
export function createStaff(input: CreateStaffInput): Promise<StaffDetail | null> {
  return authedRequestData<StaffDetailResponse>("/admin/users", {
    method: "POST",
    body: input,
  }).then(toStaffDetail);
}

/** `PUT /admin/users/{id}`. */
export function updateStaff(
  id: string,
  input: UpdateStaffInput,
): Promise<StaffDetail | null> {
  return authedRequestData<StaffDetailResponse>(`/admin/users/${id}`, {
    method: "PUT",
    body: input,
  }).then(toStaffDetail);
}

/**
 * `POST /admin/users/{id}/activate` or `/deactivate`.
 *
 * Deactivation is the only removal this API offers — there is no DELETE for a
 * staff account — and it is reversible. The API refuses two cases of its own
 * accord: your own account, and the last remaining SUPER_ADMIN.
 */
export function setStaffActive(
  id: string,
  active: boolean,
): Promise<StaffDetail | null> {
  return authedRequestData<StaffDetailResponse>(
    `/admin/users/${id}/${active ? "activate" : "deactivate"}`,
    { method: "POST" },
  ).then(toStaffDetail);
}

/**
 * `GET /admin/roles` — every role of the tenant, with its permissions.
 *
 * Not paginated: the endpoint returns a plain array, so there is nothing to
 * walk here.
 */
export async function listRoles(): Promise<Role[]> {
  const roles = await authedRequestData<RoleResponse[]>("/admin/roles");

  return roles
    .flatMap((raw) => {
      const role = toRole(raw);
      return role ? [role] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Narrow a list row, or null when it lacks the id every action needs. */
function toStaffListItem(raw: StaffListItemResponse): StaffListItem | null {
  if (!raw.id) return null;

  return {
    id: raw.id,
    fullName: raw.fullName ?? "",
    email: raw.email ?? "",
    username: raw.username ?? "",
    phone: raw.phone ?? "",
    department: raw.department ?? "",
    jobTitle: raw.jobTitle ?? "",
    roles: (raw.roles ?? []).filter(Boolean),
    // Absent reads as deactivated rather than active: showing an account as
    // usable when the API did not say so is the more dangerous guess.
    active: raw.active ?? false,
    lastLoginAt: raw.lastLoginAt ?? "",
  };
}

/** Narrow a detail record, or null when it lacks an id. */
function toStaffDetail(raw: StaffDetailResponse): StaffDetail | null {
  if (!raw.id) return null;

  return {
    id: raw.id,
    firstName: raw.firstName ?? "",
    lastName: raw.lastName ?? "",
    email: raw.email ?? "",
    username: raw.username ?? "",
    phone: raw.phone ?? "",
    department: raw.department ?? "",
    jobTitle: raw.jobTitle ?? "",
    active: raw.active ?? false,
    lastLoginAt: raw.lastLoginAt ?? "",
    roles: (raw.roles ?? []).flatMap((role) =>
      role.id ? [{ id: role.id, name: role.name ?? "" }] : [],
    ),
  };
}

/** Narrow a role, or null when it lacks the id the form submits. */
function toRole(raw: RoleResponse): Role | null {
  if (!raw.id) return null;

  return {
    id: raw.id,
    name: raw.name ?? "",
    description: raw.description ?? "",
    permissions: (raw.permissions ?? []).flatMap((permission) =>
      permission.id
        ? [
            {
              id: permission.id,
              code: permission.code ?? "",
              description: permission.description ?? "",
            },
          ]
        : [],
    ),
  };
}
