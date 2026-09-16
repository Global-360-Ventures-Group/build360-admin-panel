"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  TriangleAlert,
  UserRoundCheck,
  UserRoundX,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime, getInitials } from "@/lib/utils";

import type { Role } from "@/features/roles/types";

import { setStaffActiveAction, type StaffActionResult } from "./actions";
import { DeactivateStaffDialog } from "./deactivate-staff-dialog";
import { StaffFormDialog } from "./staff-form-dialog";
import {
  ANY,
  NO_SORT,
  STAFF_ACTIVITIES,
  STAFF_SORTS,
  staffActivityLabels,
  staffLabel,
  staffSortLabels,
  type StaffActivity,
  type StaffListItem,
  type StaffPage,
  type StaffSort,
} from "./types";

export type StaffFilters = {
  search: string;
  /** "" means every role — the API's `roleId` parameter is simply left off. */
  roleId: string;
  activity: StaffActivity;
  /** `NO_SORT` leaves the rows in the order the API returned them. */
  sort: StaffSort | typeof NO_SORT;
  /** 1-based, as it appears in the URL. */
  page: number;
};

const sortItems = [
  { label: "Default order", value: NO_SORT },
  ...STAFF_SORTS.map((sort) => ({ label: staffSortLabels[sort], value: sort })),
];

const activityItems = STAFF_ACTIVITIES.map((activity) => ({
  label: staffActivityLabels[activity],
  value: activity,
}));

/** How long to wait after typing before navigating. */
const SEARCH_DEBOUNCE_MS = 350;

/**
 * The backoffice staff table.
 *
 * There is no permission prop here, unlike the catalogue screens: every
 * Backoffice Staff endpoint is guarded by the same `USER_MANAGEMENT`
 * permission, so anyone who can open this page can also use all of it. The
 * page's own `forbidden()` check is the whole gate.
 *
 * Filtering and paging live in the URL and are served by `GET /admin/users`
 * rather than applied to an in-memory array — the API returns one page at a
 * time, so the client never holds the full list. Sorting is the exception:
 * the endpoint has no ordering parameter, so picking a sort makes the route
 * fetch every matching row, order it and slice the page from that.
 */
export function StaffView({
  staff,
  roles,
  filters,
  incomplete,
  currentUserId,
}: {
  staff: StaffPage;
  roles: Role[];
  filters: StaffFilters;
  /** Set when a sort ran over an incomplete set — see `listAllStaff`. */
  incomplete?: boolean;
  currentUserId: string;
}) {
  const router = useRouter();

  const [search, setSearch] = React.useState(filters.search);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [deactivating, setDeactivating] = React.useState<StaffListItem | null>(
    null,
  );

  const hasFilters =
    filters.search !== "" || filters.roleId !== "" || filters.activity !== ANY;

  const roleItems = React.useMemo(
    () => [
      { label: "All roles", value: ANY },
      ...roles.map((role) => ({ label: role.name, value: role.id })),
    ],
    [roles],
  );

  const buildHref = React.useCallback(
    (next: Partial<StaffFilters>) => {
      const merged = { ...filters, ...next };
      const params = new URLSearchParams();
      if (merged.search) params.set("q", merged.search);
      if (merged.roleId) params.set("role", merged.roleId);
      if (merged.activity !== ANY) params.set("status", merged.activity);
      if (merged.sort !== NO_SORT) params.set("sort", merged.sort);
      if (merged.page > 1) params.set("page", String(merged.page));

      const queryString = params.toString();
      return queryString ? `/staff?${queryString}` : "/staff";
    },
    [filters],
  );

  // Debounce typing into a navigation. `replace` keeps every keystroke out of
  // the history stack.
  React.useEffect(() => {
    if (search === filters.search) return;

    const timer = setTimeout(() => {
      router.replace(buildHref({ search, page: 1 }));
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search, filters.search, buildHref, router]);

  /**
   * Run a row mutation and report the outcome.
   *
   * The server action calls `revalidatePath`, so the table re-renders from the
   * API rather than from optimistic local state — which matters here because
   * deactivating can move a row out of the current filter entirely.
   */
  function runAction(
    member: StaffListItem,
    action: () => Promise<StaffActionResult>,
  ) {
    setPendingId(member.id);

    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) toast.success(result.message);
        else toast.error(result.message);
      } finally {
        setPendingId(null);
      }
    });
  }

  const rangeStart = staff.totalElements === 0 ? 0 : staff.page * staff.size + 1;
  const rangeEnd = Math.min(
    staff.page * staff.size + staff.content.length,
    staff.totalElements,
  );

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="text-sm text-muted-foreground">
            Backoffice accounts and the roles they carry.{" "}
            <span className="tabular-nums">
              {staff.totalElements} {hasFilters ? "matching" : "total"}
            </span>
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setFormOpen(true);
          }}
          className="w-full sm:w-auto"
        >
          <Plus /> Add staff
        </Button>
      </div>

      <Card className="min-w-0 py-0">
        <CardHeader className="border-b py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="pr-8 pl-8"
                aria-label="Search staff"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:flex lg:items-center">
              <Select
                value={filters.roleId || ANY}
                onValueChange={(value) =>
                  router.push(
                    buildHref({
                      roleId: value === ANY ? "" : (value ?? ""),
                      page: 1,
                    }),
                  )
                }
                items={roleItems}
              >
                <SelectTrigger
                  className="w-full lg:w-44"
                  aria-label="Filter by role"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {roleItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.activity}
                onValueChange={(value) =>
                  router.push(
                    buildHref({
                      activity: (value as StaffActivity) ?? ANY,
                      page: 1,
                    }),
                  )
                }
                items={activityItems}
              >
                <SelectTrigger
                  className="w-full lg:w-52"
                  aria-label="Filter by status"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activityItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.sort}
                onValueChange={(value) =>
                  router.push(
                    buildHref({
                      sort: (value as StaffSort) ?? NO_SORT,
                      page: 1,
                    }),
                  )
                }
                items={sortItems}
              >
                <SelectTrigger
                  className="w-full lg:w-48"
                  aria-label="Sort staff"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {sortItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters ? (
                <Button
                  variant="ghost"
                  render={
                    <Link
                      href={buildHref({
                        search: "",
                        roleId: "",
                        activity: ANY,
                        page: 1,
                      })}
                    />
                  }
                >
                  <X /> Reset
                </Button>
              ) : null}
            </div>
          </div>

          {incomplete ? (
            <div
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                Sorting needs every matching account, and the API stopped
                returning new rows before the set was complete — this order is
                over the rows that did arrive. Reload, or clear the sort to page
                through the order the API returns.
              </span>
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="p-0">
          {staff.content.length === 0 ? (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>
                  {hasFilters ? "No staff match your filters" : "No staff yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? "Try a different search term, role or status."
                    : "Create the first backoffice account."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {hasFilters ? (
                  <Button
                    variant="outline"
                    render={
                      <Link
                        href={buildHref({
                          search: "",
                          roleId: "",
                          activity: ANY,
                          page: 1,
                        })}
                      />
                    }
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setEditingId(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus /> Add staff
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Staff</TableHead>
                  <TableHead className="hidden md:table-cell">Roles</TableHead>
                  <TableHead className="hidden xl:table-cell">
                    Department
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Last signed in
                  </TableHead>
                  <TableHead className="w-12 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.content.map((member) => {
                  const label = staffLabel(member);
                  const isSelf = member.id === currentUserId;

                  return (
                    <TableRow
                      key={member.id}
                      data-pending={pendingId === member.id}
                    >
                      <TableCell className="pl-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-medium text-muted-foreground">
                            {getInitials(label)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="block max-w-[12rem] truncate font-medium sm:max-w-xs">
                                {label}
                              </span>
                              {isSelf ? (
                                <Badge
                                  variant="outline"
                                  className="shrink-0 px-1.5 py-0 text-[10px]"
                                >
                                  You
                                </Badge>
                              ) : null}
                              {pendingId === member.id ? (
                                <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                              ) : null}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {member.email || (
                                <span className="font-mono">
                                  {member.username || "—"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden max-w-xs md:table-cell">
                        {member.roles.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {member.roles.map((role) => (
                              <Badge key={role} variant="secondary">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="min-w-0">
                          <div className="truncate">
                            {member.department || "—"}
                          </div>
                          {member.jobTitle ? (
                            <div className="truncate text-xs text-muted-foreground">
                              {member.jobTitle}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={member.active ? "default" : "secondary"}
                        >
                          {member.active ? "Active" : "Deactivated"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">
                        {member.lastLoginAt ? (
                          <span title={formatDateTime(member.lastLoginAt)}>
                            {formatDate(member.lastLoginAt)}
                          </span>
                        ) : (
                          "Never"
                        )}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={`Actions for ${label}`}
                              />
                            }
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingId(member.id);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {member.active ? (
                              <DropdownMenuItem
                                variant="destructive"
                                // The API refuses this for your own account.
                                // Disabling it says so before the round-trip.
                                disabled={isSelf}
                                onClick={() => setDeactivating(member)}
                              >
                                <UserRoundX />
                                {isSelf ? "Cannot deactivate yourself" : "Deactivate"}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  runAction(member, () =>
                                    setStaffActiveAction(member.id, true),
                                  )
                                }
                              >
                                <UserRoundCheck /> Activate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {staff.totalElements > 0 ? (
          <CardFooter className="flex flex-col gap-3 border-t py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm tabular-nums text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {staff.totalElements}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={staff.first}
                render={
                  staff.first ? (
                    <span />
                  ) : (
                    <Link href={buildHref({ page: filters.page - 1 })} />
                  )
                }
              >
                <ChevronLeft /> <span className="hidden sm:inline">Previous</span>
              </Button>
              <span className="px-2 text-sm tabular-nums text-muted-foreground">
                {staff.page + 1} / {Math.max(1, staff.totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={staff.last}
                render={
                  staff.last ? (
                    <span />
                  ) : (
                    <Link href={buildHref({ page: filters.page + 1 })} />
                  )
                }
              >
                <span className="hidden sm:inline">Next</span> <ChevronRight />
              </Button>
            </div>
          </CardFooter>
        ) : null}
      </Card>

      <StaffFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        staffId={editingId}
        roles={roles}
        currentUserId={currentUserId}
      />
      <DeactivateStaffDialog
        open={deactivating !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivating(null);
        }}
        staff={deactivating}
        onConfirm={(member) =>
          runAction(member, () => setStaffActiveAction(member.id, false))
        }
      />
    </>
  );
}
