import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  Building2,
  CalendarDays,
  Heart,
  HardHat,
  Landmark,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  StickyNote,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

import { SampleDataNotice } from "@/components/sample-data-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatusBadge } from "@/features/orders/order-badges";
import { formatDeliveryDate, type Order } from "@/features/orders/types";
import { toneSurface, toneText, type Tone } from "@/lib/tone";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

import {
  CustomerAvatar,
  CustomerStatusBadge,
  CustomerTypeMark,
  VerifiedMark,
} from "./customer-badges";
import {
  addressLabelNames,
  averageOrderValue,
  isTradeAccount,
  type AddressLabel,
  type Customer,
} from "./types";

const addressIcons: Record<AddressLabel, LucideIcon> = {
  HOME: MapPin,
  OFFICE: Building2,
  CONSTRUCTION_SITE: HardHat,
  WAREHOUSE: Warehouse,
  OTHER: MapPin,
};

/**
 * One customer.
 *
 * Server-rendered end to end — there is nothing to edit, because the API has
 * no admin customer surface at all. The one action worth showing is "block",
 * and it is disabled: the field it would write does not exist on the API's
 * customer.
 *
 * The join with orders happens in the route, not in either fixture — see the
 * note at the top of `./sample-data` for why that direction is fixed.
 */
export function CustomerDetailView({
  customer,
  orders,
}: {
  customer: Customer;
  /** This account's orders *inside the orders fixture*, newest first. */
  orders: Order[];
}) {
  const average = averageOrderValue(customer);
  const fixtureSpend = orders.reduce(
    (total, order) => total + order.totalAmount,
    0,
  );

  return (
    <>
      <div>
        <Button
          variant="link"
          size="sm"
          className="h-auto px-0 text-muted-foreground hover:text-primary"
          render={<Link href="/users" />}
        >
          <ArrowLeft data-icon="inline-start" /> All customers
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <CustomerAvatar name={customer.fullName} className="size-12 text-sm" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">
                {customer.fullName}
              </h1>
              <CustomerStatusBadge status={customer.status} />
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <CustomerTypeMark type={customer.customerType} />
              {customer.businessName ? (
                <>· <span className="truncate">{customer.businessName}</span></>
              ) : null}
              · <VerifiedMark verified={customer.verified} />
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="outline"
            render={<a href={`tel:${customer.phone.replace(/\D/g, "")}`} />}
          >
            <Phone /> Call
          </Button>
          {/* The one action worth designing for, and the one the API has no
              field to write. Disabled rather than hidden so the gap is
              visible. */}
          <Button
            variant="outline"
            disabled
            title="The API's customer has no account-status field to write"
          >
            <Ban />
            {customer.status === "BLOCKED" ? "Unblock" : "Block"}
          </Button>
        </div>
      </div>

      <SampleDataNotice detail="This account comes from a fixture. The API has no admin customer endpoints, and no account-status field — blocking is a design, not a feature." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          title="Lifetime orders"
          value={String(customer.lifetimeOrders)}
          icon={ShoppingBag}
          tone="info"
          note={
            orders.length > 0
              ? `${orders.length} in the last 30 days`
              : "None in the last 30 days"
          }
        />
        <Stat
          title="Lifetime spend"
          value={formatCurrency(customer.lifetimeSpend)}
          icon={Landmark}
          tone="success"
          note={
            fixtureSpend > 0
              ? `${formatCurrency(fixtureSpend)} in the last 30 days`
              : "Nothing in the last 30 days"
          }
        />
        <Stat
          title="Average order"
          value={average === null ? "—" : formatCurrency(average)}
          icon={Landmark}
          tone="violet"
          note={average === null ? "Has never ordered" : "Lifetime average"}
        />
        <Stat
          title="Last order"
          value={
            customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "Never"
          }
          icon={CalendarDays}
          tone={customer.lastOrderAt ? "teal" : "neutral"}
          note={
            customer.lastOrderAt
              ? formatDateTime(customer.lastOrderAt)
              : "Registered but never checked out"
          }
        />
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <Card className="min-w-0 py-0">
            <CardHeader className="border-b py-4">
              <CardTitle>Recent orders</CardTitle>
              <CardAction>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto px-0 text-muted-foreground hover:text-primary"
                  render={<Link href={`/orders?q=${customer.phone}`} />}
                >
                  Open in orders
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              {orders.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No orders in the last thirty days.
                  {customer.lifetimeOrders > 0
                    ? ` This account has ${customer.lifetimeOrders} older orders that the fixture does not carry.`
                    : " This account has never checked out."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent [&>th]:h-9 [&>th]:text-xs [&>th]:font-medium [&>th]:text-muted-foreground">
                      <TableHead className="pl-4">Order</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Delivery
                      </TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="pr-4">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="pl-4">
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-medium tabular-nums hover:underline"
                          >
                            {order.orderNo}
                          </Link>
                          <div className="text-xs whitespace-nowrap text-muted-foreground">
                            {formatDateTime(order.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                          {formatDeliveryDate(order.deliveryDate)}
                          <div className="text-xs">
                            {order.deliverySlotLabel}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">
                          {formatCurrency(order.totalAmount)}
                        </TableCell>
                        <TableCell className="pr-4">
                          <OrderStatusBadge status={order.orderStatus} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>
                Addresses{" "}
                <span className="font-normal text-muted-foreground tabular-nums">
                  {customer.addresses.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {customer.addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground sm:col-span-2">
                  No address on file — which is why this account has never been
                  able to check out.
                </p>
              ) : (
                customer.addresses.map((address) => {
                  const Icon = addressIcons[address.addressLabel];

                  return (
                    <div
                      key={address.id}
                      className="min-w-0 rounded-lg p-3 ring-1 ring-foreground/10"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {addressLabelNames[address.addressLabel]}
                        </span>
                        {address.isDefault ? (
                          <Badge variant="secondary" className="ml-auto">
                            Default
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm">{address.addressLine1}</p>
                      <p className="text-sm text-muted-foreground">
                        {address.upazila}, {address.district}{" "}
                        {address.postalCode} · {address.division}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {address.contactName} ·{" "}
                        <span className="tabular-nums">{address.phone}</span>
                      </p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <a
                href={`tel:${customer.phone.replace(/\D/g, "")}`}
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="tabular-nums">{customer.phone}</span>
              </a>
              <a
                href={`mailto:${customer.email}`}
                className="flex min-w-0 items-center gap-2 text-sm hover:underline"
              >
                <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{customer.email}</span>
              </a>
              <VerifiedMark verified={customer.verified} />
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <Row label="Registered">{formatDate(customer.createdAt)}</Row>
              <Row label="Trade">
                <CustomerTypeMark type={customer.customerType} />
              </Row>
              <Row label="Buys as">
                {isTradeAccount(customer.customerType)
                  ? "Business"
                  : "Individual"}
              </Row>
              <Row label="Wishlist">
                <span className="flex items-center gap-1.5">
                  <Heart className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="tabular-nums">
                    {customer.wishlistCount}
                  </span>{" "}
                  saved
                </span>
              </Row>
            </CardContent>
          </Card>

          {customer.note ? (
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="size-4 text-muted-foreground" />
                  Desk note
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{customer.note}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

/** A label and its value on one line; the shape the side cards use. */
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  );
}

/** One headline number, built like the dashboard's stat cards. */
function Stat({
  title,
  value,
  icon: Icon,
  tone,
  note,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
  note: string;
}) {
  return (
    <Card size="sm" className="min-w-0">
      <CardContent>
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              toneSurface[tone],
            )}
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-muted-foreground">
              {title}
            </p>
            <p className="mt-0.5 truncate text-xl font-semibold tracking-tight">
              {value}
            </p>
          </div>
        </div>
        <p className={cn("mt-3 truncate text-xs", toneText[tone])}>{note}</p>
      </CardContent>
    </Card>
  );
}
