import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CircleCheck,
  CreditCard,
  FlaskConical,
  KeyRound,
  Landmark,
  Lock,
  Monitor,
  Percent,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { paymentMethodLabels } from "@/features/orders/types";
import { displayName, type AuthUser } from "@/lib/api/types";
import { toneSurface } from "@/lib/tone";
import { cn } from "@/lib/utils";

import { SAMPLE_SETTINGS } from "./sample-data";
import { ThemeSwitcher } from "./theme-switcher";
import {
  SETTINGS_LINKS,
  groupPermissions,
  permissionAction,
  type SectionStatus,
} from "./types";

/**
 * Settings.
 *
 * The only screen in this panel that is **partly real**, and it is laid out to
 * say which part. Account, appearance and the links to the wired sections all
 * read or write something that exists; store profile, tax and payments have
 * nowhere in the API to go. Rather than one blanket sample-data bar, each card
 * carries its own badge — a page that is half real and says so is more useful
 * than one that disclaims itself wholesale.
 *
 * The controls in the proposal sections are disabled rather than omitted. A
 * settings page with no fields does not show what is missing; a page whose
 * fields silently do nothing is worse than either.
 */
export function SettingsView({ user }: { user: AuthUser }) {
  const { store, tax, payments } = SAMPLE_SETTINGS;
  const permissionGroups = groupPermissions(user.permissions);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Three of these sections are live. The rest are designs over an API
          that has no settings endpoints — each card says which it is.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Your account</CardTitle>
          <CardDescription>
            Read from <code className="font-mono text-xs">/auth/user/me</code>{" "}
            — these are the roles and permissions actually in force.
          </CardDescription>
          <CardAction>
            <StatusBadge status="live" />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Name">{displayName(user)}</Field>
            <Field label="Username">
              <span className="font-mono text-xs">{user.username}</span>
            </Field>
            <Field label="Email">
              <span className="truncate">{user.email || "—"}</span>
            </Field>
            <Field label="Roles">
              <span className="flex flex-wrap gap-1">
                {user.roles.length === 0 ? (
                  <span className="text-muted-foreground">None</span>
                ) : (
                  user.roles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {role}
                    </Badge>
                  ))
                )}
              </span>
            </Field>
          </dl>

          <Separator />

          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-medium">
                What you can do{" "}
                <span className="font-normal text-muted-foreground tabular-nums">
                  {user.permissions.length} permissions
                </span>
              </h3>
              <Button
                variant="link"
                size="sm"
                className="h-auto px-0 text-muted-foreground hover:text-primary"
                render={<Link href="/roles" />}
              >
                Manage roles <ArrowRight data-icon="inline-end" />
              </Button>
            </div>

            {/* Grouped by subject rather than listed flat: the catalogue is
                code-defined and already carries its grouping in the code. */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {permissionGroups.map((group) => (
                <div
                  key={group.subject}
                  className="min-w-0 rounded-lg p-3 ring-1 ring-foreground/10"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {group.subject}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {group.codes.map((code) => (
                      <Badge
                        key={code}
                        variant="secondary"
                        title={code}
                        className="font-normal"
                      >
                        {permissionAction(code)}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium">
                <KeyRound className="size-4 text-muted-foreground" />
                Password
              </p>
              {/*
                Not a missing button — a missing endpoint, and a real
                operational constraint worth stating plainly.
              */}
              <p className="mt-1 text-sm text-muted-foreground">
                The API has no backoffice password endpoint. Password reset
                exists only for shoppers, and a staff password can only be set
                when the account is created.
              </p>
            </div>
            <Button
              variant="outline"
              disabled
              title="No backoffice password endpoint exists"
              className="shrink-0"
            >
              <Lock /> Change password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="size-4 text-muted-foreground" />
            Appearance
          </CardTitle>
          <CardDescription>
            The theme has a full dark palette — separately validated hues, its
            own lifted brand step — that nothing in the app could reach until
            this control existed.
          </CardDescription>
          <CardAction>
            <StatusBadge status="live" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <ThemeSwitcher />
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Where the real settings live</CardTitle>
          <CardDescription>
            The parts of the panel that already configure something. Greyed out
            where your account lacks the permission the API enforces.
          </CardDescription>
          <CardAction>
            <StatusBadge status="live" />
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SETTINGS_LINKS.map((link) => {
            const allowed = user.permissions.includes(link.permission);

            const body = (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{link.title}</span>
                  {allowed ? (
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {link.description}
                </p>
                <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                  {link.permission}
                </p>
              </>
            );

            return allowed ? (
              <Link
                key={link.href}
                href={link.href}
                className="min-w-0 rounded-lg p-3 text-sm ring-1 ring-foreground/10 transition-colors hover:bg-muted/60"
              >
                {body}
              </Link>
            ) : (
              <div
                key={link.href}
                title={`Needs the ${link.permission} permission`}
                className="min-w-0 rounded-lg p-3 text-sm opacity-60 ring-1 ring-foreground/10"
              >
                {body}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            Store profile
          </CardTitle>
          <CardDescription>
            The business behind the storefront — what an invoice and a support
            footer need.
          </CardDescription>
          <CardAction>
            <StatusBadge status="proposal" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Store name">{store.name}</Field>
            <Field label="Legal name">{store.legalName}</Field>
            <Field label="Trade licence">
              <span className="font-mono text-xs">{store.tradeLicence}</span>
            </Field>
            <Field label="BIN">
              <span className="font-mono text-xs">{store.binNumber}</span>
            </Field>
            <Field label="Support email">{store.supportEmail}</Field>
            <Field label="Support phone">
              <span className="tabular-nums">{store.supportPhone}</span>
            </Field>
            <Field label="Address" className="sm:col-span-2 lg:col-span-3">
              {store.addressLine1}, {store.district} {store.postalCode} ·{" "}
              {store.division}
            </Field>
          </dl>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="size-4 text-muted-foreground" />
              Tax &amp; currency
            </CardTitle>
            <CardDescription>
              Orders already carry a <code className="font-mono text-xs">tax</code>{" "}
              field, but nothing records the rate that produced it.
            </CardDescription>
            <CardAction>
              <StatusBadge status="proposal" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Currency">
                <span className="flex items-center gap-1.5">
                  <Landmark className="size-3.5 text-muted-foreground" />
                  {tax.currency} · ৳
                </span>
              </Field>
              <Field label="VAT rate">
                <span className="tabular-nums">{tax.vatRate}%</span>
              </Field>
              <Field label="Prices quoted">
                {tax.pricesIncludeVat ? "Including VAT" : "Excluding VAT"}
              </Field>
              <Field label="VAT registration">
                <span className="font-mono text-xs">
                  {tax.vatRegistration}
                </span>
              </Field>
            </dl>
            <p className="text-xs text-muted-foreground">
              Currency is hard-coded to taka in{" "}
              <code className="font-mono">formatCurrency</code> today. A real
              setting here would be the thing that changes it.
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-4 text-muted-foreground" />
              Payment methods
            </CardTitle>
            <CardDescription>
              These six are the API&apos;s real enum, and the gateway exists —
              what is missing is anything that says which a shop accepts.
            </CardDescription>
            <CardAction>
              <StatusBadge status="proposal" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {payments.map((payment) => (
              <div
                key={payment.method}
                className="flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {paymentMethodLabels[payment.method]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payment.note}
                  </p>
                </div>
                <Switch
                  checked={payment.enabled}
                  disabled
                  aria-label={`${paymentMethodLabels[payment.method]} accepted`}
                  className="mt-0.5 shrink-0"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

/**
 * Says what is behind a card, in one word.
 *
 * The point of the page: `live` reads or writes something real, `proposal` has
 * nowhere in the API to go. Both carry an icon as well as a colour, because
 * the distinction matters too much to ride on hue alone.
 */
function StatusBadge({ status }: { status: SectionStatus }) {
  const config: Record<
    SectionStatus,
    { label: string; icon: LucideIcon; className: string }
  > = {
    live: {
      label: "Live",
      icon: CircleCheck,
      className: toneSurface.success,
    },
    proposal: {
      label: "Not in the API",
      icon: FlaskConical,
      className: toneSurface.warning,
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <Badge variant="secondary" className={cn("gap-1 ring-1 ring-inset", className)}>
      <Icon />
      {label}
    </Badge>
  );
}

/** A label above its value; the shape every field on this page uses. */
function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 min-w-0 text-sm">{children}</dd>
    </div>
  );
}
