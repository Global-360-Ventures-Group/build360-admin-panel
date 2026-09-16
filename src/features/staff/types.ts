/**
 * Staff models, mirroring the Backoffice Staff schemas of the Build360 API.
 *
 * Two record shapes rather than one, because the API returns two:
 *
 * - `StaffListItem` (`StaffListItemResponse`) is what the table renders. It
 *   carries a single `fullName` and role *names* with no ids.
 * - `StaffDetail` (`StaffDetailResponse`) is what every other endpoint
 *   returns, and the only shape with `firstName`/`lastName` apart and role
 *   ids attached.
 *
 * The edit form needs the detail, so opening it fetches one. Splitting
 * `fullName` on a space instead would quietly mangle every three-word name,
 * and deriving role ids from role names would break the moment a role is
 * renamed.
 *
 * Things the API does not offer, so they are absent here on purpose:
 *
 * - No delete. `POST /{id}/deactivate` is as far as it goes, and it is
 *   reversible with `/activate`.
 * - No password change. `password` exists only on `CreateStaffRequest`; there
 *   is no change or reset endpoint anywhere in the spec.
 * - No `email` or `username` on update. Both are create-only.
 * - No `createdAt`. `lastLoginAt` is the only timestamp a staff record has.
 */

import { parseApiDateTime } from "@/lib/utils";

/** `RoleSummary` — a role as it hangs off a staff record. */
export type StaffRole = {
  id: string;
  name: string;
};

/** `PermissionResponse` — one entry of the permission catalogue. */
export type Permission = {
  id: string;
  code: string;
  description: string;
};

/** `RoleResponse` — a role with its grants, from `GET /admin/roles`. */
export type Role = {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
};

/** A row of `GET /admin/users`. */
export type StaffListItem = {
  id: string;
  fullName: string;
  email: string;
  username: string;
  phone: string;
  department: string;
  jobTitle: string;
  /** Role names only — this endpoint does not return their ids. */
  roles: string[];
  active: boolean;
  /** Naive local date-time, or "" when the account has never signed in. */
  lastLoginAt: string;
};

/** The full record, returned by everything except the list endpoint. */
export type StaffDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone: string;
  department: string;
  jobTitle: string;
  active: boolean;
  /** Naive local date-time, or "" when the account has never signed in. */
  lastLoginAt: string;
  roles: StaffRole[];
};

/** One page of staff, mirroring `PageResponseStaffListItemResponse`. */
export type StaffPage = {
  content: StaffListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

/**
 * What the create/edit form collects.
 *
 * `password` is only ever filled on create — the API has no endpoint that
 * changes an existing staff member's password, so the field is left out when
 * editing rather than rendered and quietly ignored.
 */
export type StaffFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone: string;
  department: string;
  jobTitle: string;
  password: string;
  active: boolean;
  roleIds: string[];
};

export const emptyStaffForm: StaffFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  username: "",
  phone: "",
  department: "",
  jobTitle: "",
  password: "",
  active: true,
  roleIds: [],
};

/** Field limits taken from `CreateStaffRequest` / `UpdateStaffRequest`. */
export const STAFF_LIMITS = {
  firstName: 100,
  lastName: 100,
  email: 150,
  username: 32,
  phone: 32,
  department: 50,
  jobTitle: 100,
  password: 100,
} as const;

/** `password` is `minLength: 8` in the create schema. */
export const STAFF_PASSWORD_MIN = 8;

/** Largest `size` the list endpoint accepts; anything more is a 400. */
export const STAFF_PAGE_SIZE_MAX = 100;
export const STAFF_PAGE_SIZE_DEFAULT = 20;

/** Sentinel for a filter that is not applied — "any role", "any status". */
export const ANY = "any";

/** The `active` filter as it travels in the URL and in the select. */
export type StaffActivity = "active" | "inactive" | typeof ANY;

export const staffActivityLabels: Record<StaffActivity, string> = {
  [ANY]: "Active and deactivated",
  active: "Active only",
  inactive: "Deactivated only",
};

export const STAFF_ACTIVITIES: StaffActivity[] = [ANY, "active", "inactive"];

/** Anything else in the URL falls back to showing everyone. */
export function parseStaffActivity(value: string | undefined): StaffActivity {
  return value === "active" || value === "inactive" ? value : ANY;
}

/** The `active` query parameter, or undefined to leave it off entirely. */
export function activityToQuery(activity: StaffActivity): boolean | undefined {
  return activity === ANY ? undefined : activity === "active";
}

// ── sorting ─────────────────────────────────────────────────────────────────
// `GET /admin/users` takes `search`, `roleId`, `active`, `page` and `size` —
// no ordering parameter. So the order is decided here, over every row that
// matches the filters rather than over the page the API happened to return;
// `listAllStaff` is what fetches them.

/** Sentinel for "whatever order the API returned", the default. */
export const NO_SORT = "api";

export type StaffSort =
  | "name-asc"
  | "name-desc"
  | "recent-login"
  | "stale-login";

export const staffSortLabels: Record<StaffSort, string> = {
  "name-asc": "Name A–Z",
  "name-desc": "Name Z–A",
  "recent-login": "Recently signed in",
  "stale-login": "Dormant first",
};

export const STAFF_SORTS: StaffSort[] = [
  "name-asc",
  "name-desc",
  "recent-login",
  "stale-login",
];

const staffComparators: Record<
  StaffSort,
  (a: StaffListItem, b: StaffListItem) => number
> = {
  "name-asc": (a, b) => a.fullName.localeCompare(b.fullName),
  "name-desc": (a, b) => b.fullName.localeCompare(a.fullName),
  // `lastLoginAt` is "" for an account that has never signed in, which `time`
  // reports as 0. That puts those accounts last under "recently signed in"
  // and first under "dormant first" — both right: never having signed in is
  // the most dormant a record gets, not a missing value to be shuffled aside.
  "recent-login": (a, b) => time(b.lastLoginAt) - time(a.lastLoginAt),
  "stale-login": (a, b) => time(a.lastLoginAt) - time(b.lastLoginAt),
};

/** Timestamps as milliseconds, via the naive-local rule in `parseApiDateTime`. */
function time(value: string): number {
  if (!value) return 0;

  const parsed = parseApiDateTime(value).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Order a set of staff, leaving the input untouched.
 *
 * Ties break on id, so equal rows cannot land in a different order on page 1
 * than on page 2 of the same sort — which is how a paginated list shows one
 * row twice and hides another.
 */
export function sortStaff(
  staff: StaffListItem[],
  sort: StaffSort,
): StaffListItem[] {
  const compare = staffComparators[sort];

  return [...staff].sort((a, b) => compare(a, b) || a.id.localeCompare(b.id));
}

/** Anything that is not a sort this app implements falls back to API order. */
export function parseStaffSort(
  value: string | undefined,
): StaffSort | typeof NO_SORT {
  return STAFF_SORTS.includes(value as StaffSort)
    ? (value as StaffSort)
    : NO_SORT;
}

/** Best available label for a row, for the names the API left blank. */
export function staffLabel(staff: StaffListItem): string {
  return staff.fullName || staff.username || staff.email || "Unnamed staff";
}

/** The same for a detail record, which carries no `fullName`. */
export function staffDetailLabel(staff: StaffDetail): string {
  const name = [staff.firstName, staff.lastName].filter(Boolean).join(" ");

  return name || staff.username || staff.email || "Unnamed staff";
}
