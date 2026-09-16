"use client";

import * as React from "react";
import { Loader2, TriangleAlert } from "lucide-react";
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
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

import { loadStaffAction, saveStaffAction } from "./actions";
import {
  STAFF_LIMITS,
  STAFF_PASSWORD_MIN,
  type Role,
  type StaffDetail,
} from "./types";

export type StaffFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The staff member being edited, or null to create one. */
  staffId: string | null;
  /** Every role of the tenant, for the assignment list. */
  roles: Role[];
  /** Used to keep someone from deactivating themselves. */
  currentUserId: string;
};

export function StaffFormDialog({
  open,
  onOpenChange,
  staffId,
  roles,
  currentUserId,
}: StaffFormDialogProps) {
  // Remounting on open, and on switching which staff member is edited, resets
  // the form and the action state together. Without the key the dialog would
  // reopen showing the previous submission's errors.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {open ? (
          staffId ? (
            <StaffFormLoader
              key={staffId}
              staffId={staffId}
              roles={roles}
              currentUserId={currentUserId}
              onDone={() => onOpenChange(false)}
            />
          ) : (
            <StaffForm
              key="new"
              staff={null}
              roles={roles}
              currentUserId={currentUserId}
              onDone={() => onOpenChange(false)}
            />
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Fetch the record the edit form needs, then render the form.
 *
 * The table row cannot fill this form: it carries one joined `fullName` and
 * role names, where the form needs the names apart and the role *ids*. So the
 * detail is fetched when the dialog opens — one request for the row being
 * edited, rather than one per row on every page render.
 */
function StaffFormLoader({
  staffId,
  roles,
  currentUserId,
  onDone,
}: {
  staffId: string;
  roles: Role[];
  currentUserId: string;
  onDone: () => void;
}) {
  const [staff, setStaff] = React.useState<StaffDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    loadStaffAction(staffId).then((result) => {
      if (cancelled) return;

      if (result.ok) setStaff(result.staff);
      else setError(result.message);
    });

    return () => {
      cancelled = true;
    };
  }, [staffId]);

  if (error !== null) {
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Edit staff</DialogTitle>
          <DialogDescription>
            The account could not be loaded.
          </DialogDescription>
        </DialogHeader>
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onDone}>
            Close
          </Button>
        </DialogFooter>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Edit staff</DialogTitle>
          <DialogDescription>Loading the account…</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  return (
    <StaffForm
      staff={staff}
      roles={roles}
      currentUserId={currentUserId}
      onDone={onDone}
    />
  );
}

function StaffForm({
  staff,
  roles,
  currentUserId,
  onDone,
}: {
  staff: StaffDetail | null;
  roles: Role[];
  currentUserId: string;
  onDone: () => void;
}) {
  const isEdit = staff !== null;
  const isSelf = isEdit && staff.id === currentUserId;

  const [state, formAction, pending] = React.useActionState(
    saveStaffAction,
    undefined,
  );

  const [roleIds, setRoleIds] = React.useState<string[]>(
    () => staff?.roles.map((role) => role.id) ?? [],
  );
  const [active, setActive] = React.useState(staff?.active ?? true);

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
  const noRoles = roles.length === 0;

  function toggleRole(id: string, checked: boolean) {
    setRoleIds((current) =>
      checked ? [...new Set([...current, id])] : current.filter((r) => r !== id),
    );
  }

  return (
    <form
      action={formAction}
      noValidate
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <input type="hidden" name="id" value={staff?.id ?? ""} />
      {/* The role checkboxes and the active switch are controlled, so their
          submitted values are carried by hidden inputs rather than by the
          controls themselves. */}
      {roleIds.map((id) => (
        <input key={id} type="hidden" name="roleIds" value={id} />
      ))}
      <input type="hidden" name="active" value={active ? "true" : "false"} />

      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit staff" : "Add staff"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update the profile, roles and access of this account."
            : "Create a backoffice account with an initial password and at least one role."}
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
          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={Boolean(fieldErrors?.firstName) || undefined}>
              <FieldLabel htmlFor="staff-first-name">
                First name <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="staff-first-name"
                name="firstName"
                defaultValue={state?.values?.firstName ?? staff?.firstName ?? ""}
                placeholder="e.g. Rafiq"
                maxLength={STAFF_LIMITS.firstName}
                aria-invalid={Boolean(fieldErrors?.firstName) || undefined}
                disabled={busy}
                autoFocus
              />
              <FieldError>{fieldErrors?.firstName}</FieldError>
            </Field>

            <Field data-invalid={Boolean(fieldErrors?.lastName) || undefined}>
              <FieldLabel htmlFor="staff-last-name">Last name</FieldLabel>
              <Input
                id="staff-last-name"
                name="lastName"
                defaultValue={state?.values?.lastName ?? staff?.lastName ?? ""}
                placeholder="e.g. Hasan"
                maxLength={STAFF_LIMITS.lastName}
                aria-invalid={Boolean(fieldErrors?.lastName) || undefined}
                disabled={busy}
              />
              <FieldError>{fieldErrors?.lastName}</FieldError>
            </Field>
          </div>

          {/*
            Email and username exist only on `CreateStaffRequest`. The update
            body has neither, so on an edit they are shown as the record's
            current values and left out of the submission — rendering them as
            editable inputs would promise a change the API cannot make.
          */}
          {isEdit ? (
            <Field>
              <FieldTitle>Sign-in details</FieldTitle>
              <div className="grid gap-3 rounded-md border bg-muted/40 p-3 text-sm sm:grid-cols-2">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="truncate">{staff.email || "—"}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Username</div>
                  <div className="truncate font-mono">
                    {staff.username || "—"}
                  </div>
                </div>
              </div>
              <FieldDescription>
                Fixed at creation. The API has no endpoint that changes an
                email, a username or a password once the account exists.
              </FieldDescription>
            </Field>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field data-invalid={Boolean(fieldErrors?.email) || undefined}>
                <FieldLabel htmlFor="staff-email">Email</FieldLabel>
                <Input
                  id="staff-email"
                  name="email"
                  type="email"
                  defaultValue={state?.values?.email ?? ""}
                  placeholder="rafiq@build360bd.com"
                  maxLength={STAFF_LIMITS.email}
                  aria-invalid={Boolean(fieldErrors?.email) || undefined}
                  disabled={busy}
                />
                <FieldError>{fieldErrors?.email}</FieldError>
              </Field>

              <Field data-invalid={Boolean(fieldErrors?.username) || undefined}>
                <FieldLabel htmlFor="staff-username">Username</FieldLabel>
                <Input
                  id="staff-username"
                  name="username"
                  defaultValue={state?.values?.username ?? ""}
                  placeholder="rafiq"
                  className="font-mono"
                  maxLength={STAFF_LIMITS.username}
                  aria-invalid={Boolean(fieldErrors?.username) || undefined}
                  disabled={busy}
                />
                <FieldDescription>
                  Either one is the sign-in name, and neither can be changed
                  later — so give at least one.
                </FieldDescription>
                <FieldError>{fieldErrors?.username}</FieldError>
              </Field>
            </div>
          )}

          {isEdit ? null : (
            <Field data-invalid={Boolean(fieldErrors?.password) || undefined}>
              <FieldLabel htmlFor="staff-password">
                Initial password <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="staff-password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder={`At least ${STAFF_PASSWORD_MIN} characters`}
                maxLength={STAFF_LIMITS.password}
                aria-invalid={Boolean(fieldErrors?.password) || undefined}
                disabled={busy}
              />
              <FieldDescription>
                Set once, here. There is no password reset in this API, so pass
                it to the new staff member yourself.
              </FieldDescription>
              <FieldError>{fieldErrors?.password}</FieldError>
            </Field>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={Boolean(fieldErrors?.phone) || undefined}>
              <FieldLabel htmlFor="staff-phone">Phone</FieldLabel>
              <Input
                id="staff-phone"
                name="phone"
                type="tel"
                defaultValue={state?.values?.phone ?? staff?.phone ?? ""}
                placeholder="01700000000"
                maxLength={STAFF_LIMITS.phone}
                aria-invalid={Boolean(fieldErrors?.phone) || undefined}
                disabled={busy}
              />
              <FieldError>{fieldErrors?.phone}</FieldError>
            </Field>

            <Field data-invalid={Boolean(fieldErrors?.department) || undefined}>
              <FieldLabel htmlFor="staff-department">Department</FieldLabel>
              <Input
                id="staff-department"
                name="department"
                defaultValue={
                  state?.values?.department ?? staff?.department ?? ""
                }
                placeholder="e.g. Operations"
                maxLength={STAFF_LIMITS.department}
                aria-invalid={Boolean(fieldErrors?.department) || undefined}
                disabled={busy}
              />
              <FieldError>{fieldErrors?.department}</FieldError>
            </Field>
          </div>

          <Field data-invalid={Boolean(fieldErrors?.jobTitle) || undefined}>
            <FieldLabel htmlFor="staff-job-title">Job title</FieldLabel>
            <Input
              id="staff-job-title"
              name="jobTitle"
              defaultValue={state?.values?.jobTitle ?? staff?.jobTitle ?? ""}
              placeholder="e.g. Warehouse Supervisor"
              maxLength={STAFF_LIMITS.jobTitle}
              aria-invalid={Boolean(fieldErrors?.jobTitle) || undefined}
              disabled={busy}
            />
            <FieldError>{fieldErrors?.jobTitle}</FieldError>
          </Field>

          <Field data-invalid={Boolean(fieldErrors?.roleIds) || undefined}>
            {/* A title rather than a label: each role has its own `<label>`,
                and a group heading pointing at nothing is a label the screen
                reader announces on the wrong control. */}
            <FieldTitle>
              Roles <span className="text-destructive">*</span>
            </FieldTitle>
            {noRoles ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  This tenant has no roles yet, and an account cannot be saved
                  without one. Create a role through the API before adding
                  staff.
                </span>
              </div>
            ) : (
              <div className="max-h-56 divide-y overflow-y-auto rounded-md border">
                {roles.map((role) => {
                  // A separate `<label htmlFor>` rather than a label wrapping
                  // the control: the checkbox primitive renders a button plus
                  // its own hidden input, and wrapping both makes a single
                  // click ambiguous.
                  const inputId = `staff-role-${role.id}`;

                  return (
                    <div
                      key={role.id}
                      className="flex items-start gap-3 p-3 hover:bg-muted/50"
                    >
                      <Checkbox
                        id={inputId}
                        checked={roleIds.includes(role.id)}
                        onCheckedChange={(next) =>
                          toggleRole(role.id, next === true)
                        }
                        disabled={busy}
                        className="mt-0.5"
                      />
                      <label
                        htmlFor={inputId}
                        className="min-w-0 flex-1 cursor-pointer select-none"
                      >
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-sm font-medium">
                            {role.name}
                          </span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {role.permissions.length} permission
                            {role.permissions.length === 1 ? "" : "s"}
                          </span>
                        </span>
                        {role.description ? (
                          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                            {role.description}
                          </span>
                        ) : null}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
            <FieldDescription>
              Permissions come from roles. Assigning more than one grants the
              union of them.
            </FieldDescription>
            <FieldError>{fieldErrors?.roleIds}</FieldError>
          </Field>

          <Field
            orientation="horizontal"
            data-invalid={Boolean(fieldErrors?.active) || undefined}
          >
            <FieldContent>
              <FieldLabel htmlFor="staff-active">Active</FieldLabel>
              <FieldDescription>
                {isSelf
                  ? "You cannot deactivate your own account."
                  : "A deactivated account keeps its roles but cannot sign in."}
              </FieldDescription>
              <FieldError>{fieldErrors?.active}</FieldError>
            </FieldContent>
            <Switch
              id="staff-active"
              checked={active}
              onCheckedChange={setActive}
              disabled={busy || isSelf}
            />
          </Field>
        </FieldGroup>
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || noRoles}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {isEdit ? "Save changes" : "Create staff"}
        </Button>
      </DialogFooter>
    </form>
  );
}
