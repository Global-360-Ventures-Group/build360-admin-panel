import type { Metadata } from "next";
import { forbidden, redirect } from "next/navigation";

import { listAllStaff, listRoles, listStaff } from "@/features/staff/api";
import { StaffView } from "@/features/staff/staff-view";
import {
  ANY,
  NO_SORT,
  STAFF_PAGE_SIZE_DEFAULT,
  activityToQuery,
  parseStaffActivity,
  parseStaffSort,
  sortStaff,
  type StaffActivity,
  type StaffPage,
  type StaffSort,
} from "@/features/staff/types";
import { hasPermission, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Staff · Build360 Admin",
};

/**
 * One permission covers this whole screen.
 *
 * Unlike the catalogue, which splits VIEW / CREATE / UPDATE / ARCHIVE, every
 * Backoffice Staff and Backoffice Roles endpoint is guarded by
 * `USER_MANAGEMENT` alone — so there is nothing finer to pass down to the
 * view. Reading the list and creating an account are the same grant.
 */
const STAFF_PERMISSION = "USER_MANAGEMENT";

export default async function StaffPage({ searchParams }: PageProps<"/staff">) {
  const user = await requireUser();

  if (!hasPermission(user, STAFF_PERMISSION)) forbidden();

  const params = await searchParams;

  const search = firstValue(params.q)?.trim() ?? "";
  const roleId = firstValue(params.role)?.trim() ?? "";
  const activity = parseStaffActivity(firstValue(params.status));
  const sort = parseStaffSort(firstValue(params.sort));
  // The URL is 1-based for humans; the API is 0-based.
  const page = Math.max(1, Number(firstValue(params.page)) || 1);

  // The page and the role list are independent, so they are fetched together
  // rather than in series. Roles are needed whether or not one is filtered on:
  // the form's assignment list uses the same set.
  const [listing, roles] = await Promise.all([
    loadPage({ page, sort, search, roleId, activity }),
    listRoles(),
  ]);

  const staff = listing.staff;

  // A page number past the end comes back as an empty page, which would render
  // as "No staff yet" against a list that has plenty — and pair it with a
  // footer reading "Showing 0–0 of 12". Send the visitor to the last real page
  // instead. Reachable by editing the URL, or by paging and then narrowing the
  // filters.
  if (
    staff.content.length === 0 &&
    staff.totalElements > 0 &&
    page > staff.totalPages
  ) {
    redirect(
      staffHref({ search, roleId, activity, sort, page: staff.totalPages }),
    );
  }

  return (
    <StaffView
      staff={staff}
      roles={roles}
      filters={{ search, roleId, activity, sort, page }}
      incomplete={listing.incomplete}
      currentUserId={user.id}
    />
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * One page of staff, ordered.
 *
 * Unsorted is the cheap path and the default: one request for one page. A sort
 * cannot be delegated — `GET /admin/users` has no ordering parameter — so
 * choosing one trades that request for a walk of every matching row, which is
 * then ordered and sliced here. Sorting only the fetched page would order
 * twenty arbitrary rows and label it "Name A–Z".
 */
async function loadPage({
  page,
  sort,
  search,
  roleId,
  activity,
}: {
  page: number;
  sort: StaffSort | typeof NO_SORT;
  search: string;
  roleId: string;
  activity: StaffActivity;
}): Promise<{ staff: StaffPage; incomplete: boolean }> {
  const filters = {
    search: search || undefined,
    roleId: roleId || undefined,
    active: activityToQuery(activity),
  };

  if (sort === NO_SORT) {
    return {
      staff: await listStaff({
        ...filters,
        page: page - 1,
        size: STAFF_PAGE_SIZE_DEFAULT,
      }),
      incomplete: false,
    };
  }

  const all = await listAllStaff(filters);
  const ordered = sortStaff(all.staff, sort);

  const size = STAFF_PAGE_SIZE_DEFAULT;
  const totalPages = Math.max(1, Math.ceil(ordered.length / size));
  const start = (page - 1) * size;

  return {
    staff: {
      // Left unclamped on purpose: a page past the end comes back empty, which
      // is what sends the visitor to the last real page above.
      content: ordered.slice(start, start + size),
      page: page - 1,
      size,
      totalElements: ordered.length,
      totalPages,
      first: page <= 1,
      last: page >= totalPages,
    },
    incomplete: all.truncated,
  };
}

/**
 * Build a /staff URL. Mirrors `buildHref` in the view, which needs the same
 * shape on the client where `redirect` is not available.
 */
function staffHref({
  search,
  roleId,
  activity,
  sort,
  page,
}: {
  search: string;
  roleId: string;
  activity: StaffActivity;
  sort: StaffSort | typeof NO_SORT;
  page: number;
}): string {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (roleId) params.set("role", roleId);
  if (activity !== ANY) params.set("status", activity);
  if (sort !== NO_SORT) params.set("sort", sort);
  if (page > 1) params.set("page", String(page));

  const queryString = params.toString();
  return queryString ? `/staff?${queryString}` : "/staff";
}
