"use client";

import * as React from "react";
import { Loader2, Search, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { saveRoleAction } from "./actions";
import {
  groupPermissions,
  ROLE_LIMITS,
  type Permission,
  type Role,
} from "./types";

export type RoleFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The role being edited, or null to create one. */
  role: Role | null;
  /** The whole catalogue, from `GET /admin/permissions`. */
  permissions: Permission[];
};

export function RoleFormDialog({
  open,
  onOpenChange,
  role,
  permissions,
}: RoleFormDialogProps) {
  // Remounting on open, and on switching which role is edited, resets the
  // form and the action state together. Without the key the dialog would
  // reopen showing the previous submission's errors.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {open ? (
          <RoleForm
            key={role?.id ?? "new"}
            role={role}
            permissions={permissions}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RoleForm({
  role,
  permissions,
  onDone,
}: {
  role: Role | null;
  permissions: Permission[];
  onDone: () => void;
}) {
  const isEdit = role !== null;

  const [state, formAction, pending] = React.useActionState(
    saveRoleAction,
    undefined,
  );

  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(role?.permissions.map((permission) => permission.id) ?? []),
  );
  const [query, setQuery] = React.useState("");

  // The action reports success once, then the dialog closes.
  const settled = React.useRef(false);
  React.useEffect(() => {
    if (state?.status === "success" && !settled.current) {
      settled.current = true;
      toast.success(state.message ?? "Saved.");
      onDone();
    }
  }, [state, onDone]);

  const fieldErrors = state?.fieldErrors;
  const busy = pending;
  const noPermissions = permissions.length === 0;

  const groups = React.useMemo(
    () => groupPermissions(permissions),
    [permissions],
  );

  // Filtering narrows the rows, never the selection: a permission ticked and
  // then filtered out of view stays ticked, and its hidden input stays in the
  // form. Anything else would make the search box quietly destructive.
  const visibleGroups = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return groups;

    return groups
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter(
          (permission) =>
            permission.code.toLowerCase().includes(needle) ||
            permission.description.toLowerCase().includes(needle) ||
            group.label.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.permissions.length > 0);
  }, [groups, query]);

  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);

      return next;
    });
  }

  function setGroup(ids: string[], checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }

      return next;
    });
  }

  return (
    <form
      action={formAction}
      noValidate
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <input type="hidden" name="id" value={role?.id ?? ""} />
      {/* The picker is controlled, so what gets submitted is carried by hidden
          inputs rather than by the checkboxes themselves. Rendered from the
          selection, not from the visible rows, so a search filter cannot drop
          a permission from the body. */}
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="permissionIds" value={id} />
      ))}

      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit role" : "Add role"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Change what this role grants. Staff holding it are affected immediately."
            : "Name the role and pick what it grants. Roles cannot be deleted once created."}
        </DialogDescription>
      </DialogHeader>

      {state?.status === "error" && state.message ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.message}
        </div>
      ) : null}

      <DialogBody>
        <FieldGroup className="py-1">
          <Field data-invalid={Boolean(fieldErrors?.name) || undefined}>
            <FieldLabel htmlFor="role-name">
              Name <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="role-name"
              name="name"
              defaultValue={state?.values?.name ?? role?.name ?? ""}
              placeholder="e.g. WAREHOUSE_STAFF"
              maxLength={ROLE_LIMITS.name}
              aria-invalid={Boolean(fieldErrors?.name) || undefined}
              disabled={busy}
              autoFocus
            />
            <FieldDescription>
              Must be unique. The existing roles use SCREAMING_SNAKE_CASE.
            </FieldDescription>
            <FieldError>{fieldErrors?.name}</FieldError>
          </Field>

          <Field data-invalid={Boolean(fieldErrors?.description) || undefined}>
            <FieldLabel htmlFor="role-description">Description</FieldLabel>
            <Textarea
              id="role-description"
              name="description"
              defaultValue={
                state?.values?.description ?? role?.description ?? ""
              }
              placeholder="What this role is for, in a line."
              rows={2}
              maxLength={ROLE_LIMITS.description}
              aria-invalid={Boolean(fieldErrors?.description) || undefined}
              disabled={busy}
            />
            <FieldError>{fieldErrors?.description}</FieldError>
          </Field>

          <Field data-invalid={Boolean(fieldErrors?.permissionIds) || undefined}>
            {/* A title rather than a label: the permissions each have their
                own `<label>`, and a group heading pointing at nothing is a
                label the screen reader announces on the wrong control. */}
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <FieldTitle>
                Permissions <span className="text-destructive">*</span>
              </FieldTitle>
              <span className="text-xs tabular-nums text-muted-foreground">
                {selected.size} of {permissions.length} selected
              </span>
            </div>

            {noPermissions ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  The permission catalogue came back empty, so there is nothing
                  to grant. Permissions are defined in the backend — check that
                  it is seeded.
                </span>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter permissions…"
                    className="pr-8 pl-8"
                    aria-label="Filter permissions"
                    disabled={busy}
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                      aria-label="Clear permission filter"
                    >
                      <X className="size-4" />
                    </button>
                  ) : null}
                </div>

                <div className="max-h-72 divide-y overflow-y-auto rounded-md border">
                  {visibleGroups.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">
                      No permission matches “{query}”.
                    </p>
                  ) : (
                    visibleGroups.map((group) => {
                      const ids = group.permissions.map(
                        (permission) => permission.id,
                      );
                      const chosen = ids.filter((id) => selected.has(id)).length;
                      const allChosen = chosen === ids.length;

                      return (
                        <div key={group.key}>
                          <div className="flex items-center justify-between gap-2 bg-muted/50 px-3 py-1.5">
                            <span className="text-xs font-medium tracking-wide uppercase">
                              {group.label}
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {chosen}/{ids.length}
                              </span>
                              {/* A plain text button, not a tri-state
                                  checkbox: the checkbox primitive's indicator
                                  draws a tick and nothing else, so a partial
                                  group would read as either empty or full. */}
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                onClick={() => setGroup(ids, !allChosen)}
                                disabled={busy}
                              >
                                {allChosen ? "Clear" : "Select all"}
                              </Button>
                            </span>
                          </div>
                          {group.permissions.map((permission) => {
                            const inputId = `role-permission-${permission.id}`;

                            return (
                              <div
                                key={permission.id}
                                className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted/50"
                              >
                                <Checkbox
                                  id={inputId}
                                  checked={selected.has(permission.id)}
                                  onCheckedChange={(next) =>
                                    toggle(permission.id, next === true)
                                  }
                                  disabled={busy}
                                  className="mt-0.5"
                                />
                                <label
                                  htmlFor={inputId}
                                  className="min-w-0 flex-1 cursor-pointer select-none"
                                >
                                  <span className="block font-mono text-xs font-medium">
                                    {permission.code}
                                  </span>
                                  {permission.description ? (
                                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                                      {permission.description}
                                    </span>
                                  ) : null}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
            <FieldDescription>
              A staff member gets the union of every permission on every role
              they hold.
            </FieldDescription>
            <FieldError>{fieldErrors?.permissionIds}</FieldError>
          </Field>
        </FieldGroup>
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || noPermissions}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {isEdit ? "Save changes" : "Create role"}
        </Button>
      </DialogFooter>
    </form>
  );
}
