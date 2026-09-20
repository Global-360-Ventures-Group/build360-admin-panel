import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CreditCard,
  MapPin,
  Phone,
  Printer,
  TicketPercent,
  Timer,
  Undo2,
  User,
} from "lucide-react";

import { SampleDataNotice } from "@/components/sample-data-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  customerTypeLabels,
  isTradeAccount,
} from "@/features/customers/types";
import { RefundStatusBadge } from "@/features/refunds/refund-badges";
import {
  refundKindLabels,
  type RefundRequest,
} from "@/features/refunds/types";
import { toneFill, toneSurface, toneText } from "@/lib/tone";
import {
  cn,
  formatCurrency,
  formatDateTime,
  getInitials,
} from "@/lib/utils";

import {
  DeliveryMethodBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
  deliveryMethodIcons,
  orderStatusIcons,
} from "./order-badges";
import {
  ORDER_PIPELINE,
  formatDeliveryDate,
  nextStatus,
  orderStatusLabels,
  orderStatusTone,
  paymentMethodLabels,
  pipelineIndex,
  unitCount,
  type Order,
  type OrderEvent,
  type OrderStatus,
} from "./types";

/**
 * One order, in full.
 *
 * Server-rendered end to end — nothing here has state, because nothing here
 * can change anything. The API exposes no admin transition (`confirm-cod` and
 * `cancel` are both scoped to the *owner* of the order), so the two action
 * buttons are present and disabled: the design shows where they go without
 * pretending they work.
 *
 * The reading order is money first, then logistics, then history. A support
 * call almost always opens with "what did they pay and when does it arrive" —
 * the timeline is the thing you scroll to, not the thing you land on.
 */
export function OrderDetailView({
  order,
  refunds,
}: {
  order: Order;
  /**
   * Requests raised against this order, newest first. Joined by the route,
   * because the refunds fixture reads the orders one and not the reverse.
   */
  refunds: RefundRequest[];
}) {
  const advanceTo = nextStatus(order.orderStatus);
  const isPickup = order.deliveryMethodCode === "CLICK_AND_COLLECT";
  const MethodIcon = deliveryMethodIcons[order.deliveryMethodCode];

  return (
    <>
      <div>
        <Button
          variant="link"
          size="sm"
          className="h-auto px-0 text-muted-foreground hover:text-primary"
          render={<Link href="/orders" />}
        >
          <ArrowLeft data-icon="inline-start" /> All orders
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight tabular-nums">
              {order.orderNo}
            </h1>
            <OrderStatusBadge status={order.orderStatus} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed {formatDateTime(order.createdAt)} ·{" "}
            <span className="tabular-nums">{order.items.length}</span>{" "}
            {order.items.length === 1 ? "line" : "lines"} ·{" "}
            <span className="tabular-nums">{unitCount(order)}</span> units ·{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatCurrency(order.totalAmount)}
            </span>
          </p>
        </div>

        {/*
          Present and disabled, not omitted: an order screen without an
          "advance" button is not the design, and a button that silently does
          nothing is worse than one that says why it cannot.
        */}
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="outline"
            disabled
            title="Invoices arrive with the admin order API"
          >
            <Printer /> Print invoice
          </Button>
          {/* Dropped once an order is settled: there is no next step to
              offer, so the button would only be clutter. */}
          {advanceTo ? (
            <Button disabled title="No admin endpoint moves an order along yet">
              Advance to {orderStatusLabels[advanceTo]}
            </Button>
          ) : null}
        </div>
      </div>

      <SampleDataNotice detail="This order comes from a fixture, not the API. The buttons above are disabled because no admin endpoint can move an order along yet." />

      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <Card className="min-w-0 py-0">
            <CardHeader className="border-b py-4">
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent [&>th]:h-9 [&>th]:text-xs [&>th]:font-medium [&>th]:text-muted-foreground">
                    <TableHead className="pl-4">Product</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="pr-4 text-right">Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="pl-4">
                        <span className="block max-w-[22rem] truncate font-medium">
                          {item.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Sold per {item.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      {/* The unit lives under the product name, not here:
                          pluralising it would turn "cft" into "cfts". */}
                      <TableCell className="text-right tabular-nums">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="pr-4 text-right font-medium whitespace-nowrap tabular-nums">
                        {formatCurrency(item.lineTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals sit inside the card rather than in a footer so they
                  read as the last rows of the table they add up. */}
              <div className="border-t p-4">
                <dl className="ml-auto grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
                  <Money label="Subtotal" value={order.subtotal} />
                  {order.discount > 0 ? (
                    <Money
                      label={
                        order.voucherCode
                          ? `Discount · ${order.voucherCode}`
                          : "Discount"
                      }
                      value={-order.discount}
                      tone="success"
                    />
                  ) : null}
                  {order.tax > 0 ? <Money label="VAT" value={order.tax} /> : null}
                  <Money
                    label={isPickup ? "Pickup" : "Delivery charge"}
                    value={order.deliveryCharge}
                    zeroLabel={isPickup ? "Free" : undefined}
                  />

                  <Separator className="col-span-2 my-1" />

                  <dt className="font-medium">Total</dt>
                  <dd className="text-right text-base font-semibold tabular-nums">
                    {formatCurrency(order.totalAmount)}
                  </dd>
                </dl>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MethodIcon className="size-4 text-muted-foreground" />
                {isPickup ? "Pickup" : "Delivery"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Detail label="Method">
                <DeliveryMethodBadge code={order.deliveryMethodCode} />
              </Detail>
              <Detail label={isPickup ? "Collection window" : "Booked slot"}>
                <span className="flex items-start gap-1.5">
                  <CalendarClock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span>
                    {formatDeliveryDate(order.deliveryDate)}
                    <span className="block text-xs text-muted-foreground">
                      {order.deliverySlotLabel}
                    </span>
                  </span>
                </span>
              </Detail>

              {isPickup && order.pickupLocationName ? (
                <Detail label="Pickup point" className="sm:col-span-2">
                  <span className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    {order.pickupLocationName}
                  </span>
                </Detail>
              ) : null}

              <Detail
                label={isPickup ? "Billing address" : "Ship to"}
                className="sm:col-span-2"
              >
                <span className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <span>
                    {order.address.addressLine1}
                    <span className="block text-muted-foreground">
                      {order.address.upazila}, {order.address.district}{" "}
                      {order.address.postalCode} · {order.address.division}
                    </span>
                  </span>
                </span>
              </Detail>
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {/* Above the timeline, not below it: a live refund claim changes
              what you do with the order, so it must not be scrolled past. */}
          {refunds.length > 0 ? (
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Undo2 className="size-4 text-muted-foreground" />
                  Refund requests
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {refunds.map((request) => (
                  <Link
                    key={request.id}
                    href={`/refunds/${request.id}`}
                    className="flex min-w-0 items-center gap-2 rounded-lg p-2 ring-1 ring-foreground/10 transition-colors hover:bg-muted/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium tabular-nums">
                        {request.refNo}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {refundKindLabels[request.kind]} ·{" "}
                        {formatCurrency(request.requestedAmount)}
                      </p>
                    </div>
                    <RefundStatusBadge status={request.status} />
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline order={order} />
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {getInitials(order.address.contactName)}
                </span>
                <div className="min-w-0">
                  {/* The name links to the account, not to this order's
                      address snapshot — the two drift apart by design. */}
                  <Link
                    href={`/users/${order.customerId}`}
                    className="block truncate font-medium hover:underline"
                  >
                    {order.address.contactName}
                  </Link>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {isTradeAccount(order.customerType) ? (
                      <Building2 className="size-3" />
                    ) : (
                      <User className="size-3" />
                    )}
                    {customerTypeLabels[order.customerType]} ·{" "}
                    <span className="tabular-nums">
                      {order.customerLifetimeOrders}
                    </span>{" "}
                    orders
                  </p>
                </div>
              </div>
              <a
                href={`tel:${order.address.phone.replace(/\D/g, "")}`}
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="tabular-nums">{order.address.phone}</span>
              </a>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm">
                  <CreditCard className="size-3.5 shrink-0 text-muted-foreground" />
                  {paymentMethodLabels[order.paymentMethod]}
                </span>
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>

              {order.voucherCode ? (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <TicketPercent className="size-3.5 shrink-0 text-muted-foreground" />
                    Voucher
                  </span>
                  <Badge variant="outline" className="font-mono">
                    {order.voucherCode}
                  </Badge>
                </div>
              ) : null}

              {order.expiresAt ? (
                <p className="flex items-start gap-2 rounded-md bg-warning/10 p-2.5 text-xs text-warning">
                  <Timer className="mt-px size-3.5 shrink-0" />
                  <span>
                    Unpaid. The reservation releases on{" "}
                    {formatDateTime(order.expiresAt)}, and the delivery slot
                    goes back into the calendar.
                  </span>
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

/**
 * The five pipeline steps, plus the off-ramp when there was one.
 *
 * Steps a cancelled order never reached are drawn as skipped rather than
 * dropped — "it stopped here" is the useful fact, and a three-node timeline
 * would hide that it stopped at all.
 */
function Timeline({ order }: { order: Order }) {
  const events = new Map<OrderStatus, OrderEvent>(
    order.timeline.map((event) => [event.status, event]),
  );

  const derailed =
    order.orderStatus === "CANCELLED" || order.orderStatus === "RETURNED";
  const terminal = derailed
    ? (order.timeline[order.timeline.length - 1] ?? null)
    : null;

  const current = pipelineIndex(order.orderStatus);

  return (
    <ol className="flex flex-col">
      {ORDER_PIPELINE.map((status, index) => {
        const event = events.get(status) ?? null;
        const isCurrent = !derailed && index === current;
        const last = index === ORDER_PIPELINE.length - 1 && !terminal;

        return (
          <Step
            key={status}
            status={status}
            at={event?.at ?? null}
            reached={event !== null}
            current={isCurrent}
            last={last}
            // A cancelled order's remaining steps are not "waiting", they are
            // never happening.
            skipped={derailed && event === null}
          />
        );
      })}

      {terminal ? (
        <Step
          status={terminal.status}
          at={terminal.at}
          note={terminal.note}
          reached
          current
          last
        />
      ) : null}
    </ol>
  );
}

function Step({
  status,
  at,
  note,
  reached,
  current,
  last,
  skipped,
}: {
  status: OrderStatus;
  at: string | null;
  note?: string;
  reached: boolean;
  current: boolean;
  last: boolean;
  skipped?: boolean;
}) {
  const tone = orderStatusTone[status];
  const Icon = orderStatusIcons[status];

  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full ring-1 ring-inset [&>svg]:size-3.5",
            reached
              ? toneSurface[tone]
              : "bg-muted/50 text-muted-foreground/60 ring-foreground/10",
          )}
        >
          <Icon />
        </span>
        {last ? null : (
          <span
            className={cn(
              "w-px flex-1",
              reached ? toneFill[tone] : "bg-border",
              // A skipped leg is drawn faint: the line still has to reach the
              // next node, but nothing travelled along it.
              skipped && "opacity-40",
            )}
          />
        )}
      </div>

      <div className={cn("min-w-0 pb-4", last && "pb-0")}>
        <p
          className={cn(
            "text-sm leading-7",
            reached ? "font-medium" : "text-muted-foreground",
            current && toneText[tone],
          )}
        >
          {orderStatusLabels[status]}
        </p>
        {at ? (
          <p className="text-xs text-muted-foreground">{formatDateTime(at)}</p>
        ) : (
          <p className="text-xs text-muted-foreground/70">
            {skipped ? "Never reached" : "Not yet"}
          </p>
        )}
        {note ? (
          <p className="mt-1 text-xs text-muted-foreground">{note}</p>
        ) : null}
      </div>
    </li>
  );
}

/** A label above its value; the shape every field on this page uses. */
function Detail({
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
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

/** One row of the totals block. Negative values print with a minus sign. */
function Money({
  label,
  value,
  tone,
  zeroLabel,
}: {
  label: string;
  value: number;
  tone?: "success";
  zeroLabel?: string;
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-right tabular-nums",
          tone === "success" && "text-success",
        )}
      >
        {value === 0 && zeroLabel
          ? zeroLabel
          : value < 0
            ? `−${formatCurrency(-value)}`
            : formatCurrency(value)}
      </dd>
    </>
  );
}
