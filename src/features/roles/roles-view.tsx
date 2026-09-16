"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, Pencil, Plus, Search, ShieldCheck, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { RoleFormDialog } from "./role-form-dialog";
import {
  groupPermissions,
  isImmutableRole,
  type Permission,
  type Role,
} from "./types";

export type RolesViewProps = {
  roles: Role[];
  /** The whole catalogue, for the form's picker. */
  permissions: Permission[];
  /** How many staff hold each role, keyed by role id. See the page. */
  usage: Record<string, number>;
};

/**
 * The roles table.
 *
 * Filtering happens here rather than in the URL, unlike the catalogue
 * screens: `GET /admin/roles` is not paginated and takes no query parameters,
 * so the component already holds every role and a round-trip would buy
 * nothing. There is no sort control for the same reason the list is short —
 * name order is the only order that helps.
 *
 * No permission prop: Backoffice Roles and Backoffice Permissions are both
 * guarded by `USER_MANAGEMENT`, so anyone who can open this page can use all
 * of it. The page's `forbidden()` check is the whole gate.
 */
export function RolesView({ roles, permissions, usage }: RolesViewProps) {
  const [search, setSearch] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Role | null>(null);

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return roles;

    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(needle) ||
        role.description.toLowerCase().includes(needle) ||
        role.permissions.some((permission) =>
          permission.code.toLowerCase().includes(needle),
        ),
    );
  }, [roles, search]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
          <p className="text-sm text-muted-foreground">
            What each role grants, and who holds it.{" "}
            <span className="tabular-nums">
              {roles.length} {roles.length === 1 ? "role" : "roles"},{" "}
              {permissions.length} permissions available
            </span>
          </p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus /> Add role
        </Button>
      </div>

      <Card className="min-w-0 py-0">
        <CardHeader className="border-b py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by role name, description or permission code…"
              className="pr-8 pl-8"
              aria-label="Search roles"
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
        </CardHeader>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldCheck />
                </EmptyMedia>
                <EmptyTitle>
                  {roles.length === 0
                    ? "No roles yet"
                    : "No roles match your search"}
                </EmptyTitle>
                <EmptyDescription>
                  {roles.length === 0
                    ? "Staff accounts need at least one role, so create one before adding people."
                    : "Try a different name or permission code."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {roles.length === 0 ? (
                  <Button onClick={openCreate}>
                    <Plus /> Add role
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setSearch("")}>
                    Clear search
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Role</TableHead>
                  <TableHead className="hidden lg:table-cell">Grants</TableHead>
                  <TableHead className="text-right">Permissions</TableHead>
                  <TableHead className="text-right">Staff</TableHead>
                  <TableHead className="w-24 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((role) => {
                  const locked = isImmutableRole(role);
                  const holders = usage[role.id] ?? 0;
                  // The group names, not the codes: "Product, Brand, Order"
                  // says what a role reaches at a glance, where forty codes
                  // would say nothing at all.
                  const areas = groupPermissions(role.permissions);

                  return (
                    <TableRow key={role.id}>
                      <TableCell className="pl-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-mono text-sm font-medium">
                              {role.name}
                            </span>
                            {locked ? (
                              <Lock
                                className="size-3.5 shrink-0 text-muted-foreground"
                                aria-label="Locked role"
                              >
                                <title>
                                  The API refuses any change to SUPER_ADMIN.
                                </title>
                              </Lock>
                            ) : null}
                          </div>
                          {role.description ? (
                            <div className="truncate text-xs text-muted-foreground">
                              {role.description}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="hidden max-w-sm lg:table-cell">
                        {areas.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {areas.map((area) => (
                              <Badge key={area.key} variant="secondary">
                                {area.label}
                                <span className="ml-1 tabular-nums opacity-70">
                                  {area.permissions.length}
                                </span>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {role.permissions.length}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {holders === 0 ? (
                          <span className="text-muted-foreground">0</span>
                        ) : (
                          <Link
                            href={`/staff?role=${role.id}`}
                            className="underline-offset-4 hover:underline"
                          >
                            {holders}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        {locked ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled
                            title="SUPER_ADMIN cannot be edited."
                          >
                            <Pencil /> Edit
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditing(role);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil /> Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RoleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        role={editing}
        permissions={permissions}
      />
    </>
  );
}
