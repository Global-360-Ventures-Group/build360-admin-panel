import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  MessageSquareQuote,
  Phone,
  Receipt,
  ThumbsDown,
  ThumbsUp,
  User,
  Wallet,
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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isTradeAccount } from "@/features/customers/types";
import { OrderStatusBadge, PaymentStatusBadge } from "@/features/orders/order-badges";
import {
  formatDeliveryDate,
  paymentMethodLabels,
  type Order,
} from "@/features/orders/types";
import { SAMPLE_TODAY } from "@/lib/fixtures";
import { toneFill, toneSurface, toneText } from "@/lib/tone";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";

import {
  RefundKindMark,
  RefundReasonMark,
  RefundStatusBadge,
  refundStatusIcons,
} from "./refund-badges";
import {
  REFUND_PIPELINE,
  REFUND_SLA_DAYS,
  daysOpen,
  isPartial,
  nextStatus,
  pipelineIndex,
  refundDestinationLabels,
  refundKindLabels,
  refundStatusLabels,
  refundStatusTone,
  unitCount,
  type RefundEvent,
  type RefundRequest,
  type RefundStatus,
} from "./types";

/**
 * One refund request, with everything needed to decide it.
 *
 * Server-rendered end to end — there is nothing to submit, because the API
 * has no refund resource to submit to. Approve and Reject are present and
 * disabled: the design shows where the decision goes without pretending it
 * lands anywhere.
 *
 * The reading order is what-they-asked-for, then what-it-is-against, then
 * history. A refund is decided by comparing the claim with the order, so the
 * order sits beside the claim rather than a click away — the link is there
 * for the full picture, not for the basic facts.
 */
export function RefundDetailView({
  request,
  order,
}: {
  request: RefundRequest;
  /** The order it is against, for the context card. */
  order: Order;
}) {
  const age = daysOpen(request, SAMPLE_TODAY);
  const overdue = age !== null && age > REFUND_SLA_DAYS;
  const advanceTo = nextStatus(request.status);
  const partial = isPartial(request);

  return (
    <>
      <div>
        <Button
          variant="link"
          size="sm"
          className="h-auto px-0 text-muted-foreground hover:text-primary"
          render={<Link href="/refunds" />}
        >
          <ArrowLeft data-icon="inline-start" /> All requests
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight tabular-nums">
              {request.refNo}
            </h1>
            <RefundStatusBadge status={request.status} />
            {age !== null ? (
              <Badge
                variant="secondary"
                className={cn(
                  "ring-1 ring-inset",
                  overdue
                    ? toneSurface.danger
                    : "bg-muted text-muted-foreground ring-foreground/10",
                )}
              >
                {age === 0
                  ? "Raised today"
                  : `${age} day${age === 1 ? "" : "s"} open`}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {refundKindLabels[request.kind]} raised{" "}
            {formatDateTime(request.requestedAt)} ·{" "}
            <span className="tabular-nums">{unitCount(request)}</span> units ·{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatCurrency(request.requestedAmount)}
            </span>{" "}
            asked for
          </p>
        </div>

        {/*
          The two buttons this whole screen exists to serve, both disabled.
          Keeping them is the point: an approval screen with no approve button
          does not show what is missing.
        */}
        <div className="flex shrink-0 flex-wrap gap-2">
          {advanceTo ? (
            <>
              <Button
                variant="outline"
                disabled
                title="The API has no refund resource to reject against"
              >
                <ThumbsDown /> Reject
              </Button>
              <Button
                disabled
                title="The API has no refund resource to approve against"
              >
                <ThumbsUp />
                {advanceTo === "REFUNDED"
                  ? "Mark refunded"
                  : `Move to ${refundStatusLabels[advanceTo]}`}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <SampleDataNotice detail="This request comes from a fixture. The API has no refund resource — POST /orders/{id}/cancel refuses a paid order with a 409 and stops there — so the decision buttons above are disabled." />

      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquareQuote className="size-4 text-muted-foreground" />
                What the customer said
              </CardTitle>
              <CardAction>
                <RefundReasonMark reason={request.reason} className="text-sm" />
              </CardAction>
            </CardHeader>
            <CardContent>
              {/* A quotation, and marked up as one — this is the only text on
                  the screen the business did not write. */}
              <blockquote className="border-l-2 border-border pl-3 text-sm">
                {request.reasonNote}
              </blockquote>
            </CardContent>
          </Card>

          <Card className="min-w-0 py-0">
            <CardHeader className="border-b py-4">
              <CardTitle>
                Coming back{" "}
                {partial ? (
                  <span className="font-normal text-muted-foreground">
                    · part of the order
                  </span>
                ) : (
                  <span className="font-normal text-muted-foreground">
                    · the whole order
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent [&>th]:h-9 [&>th]:text-xs [&>th]:font-medium [&>th]:text-muted-foreground">
                    <TableHead className="pl-4">Product</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Qty back</TableHead>
                    <TableHead className="pr-4 text-right">Line value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {request.lines.map((line) => (
                    <TableRow key={line.productId}>
                      <TableCell className="pl-4">
                        <span className="block max-w-[22rem] truncate font-medium">
                          {line.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Sold per {line.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">
                        {formatCurrency(line.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">
                        {line.quantity}
                        {line.quantity < line.orderedQuantity ? (
                          <span className="text-muted-foreground">
                            {" "}
                            / {line.orderedQuantity}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="pr-4 text-right font-medium whitespace-nowrap tabular-nums">
                        {formatCurrency(line.lineTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="border-t p-4">
                <dl className="ml-auto grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
                  <Money
                    label="Line value"
                    value={request.lines.reduce(
                      (total, line) => total + line.lineTotal,
                      0,
                    )}
                  />
                  {request.deliveryIncluded && request.orderDeliveryCharge > 0 ? (
                    <Money
                      label="Delivery charge"
                      value={request.orderDeliveryCharge}
                    />
                  ) : null}
                  {request.deliveryIncluded ? (
                    <Money
                      label="Voucher and rounding"
                      value={
                        request.requestedAmount -
                        request.lines.reduce(
                          (total, line) => total + line.lineTotal,
                          0,
                        ) -
                        request.orderDeliveryCharge
                      }
                    />
                  ) : null}

                  <dt className="font-medium">Asked for</dt>
                  <dd className="text-right font-medium tabular-nums">
                    {formatCurrency(request.requestedAmount)}
                  </dd>

                  {request.restockingFee > 0 ? (
                    <Money
                      label="Restocking fee"
                      value={-request.restockingFee}
                      tone="danger"
                    />
                  ) : null}

                  <Separator className="col-span-2 my-1" />

                  <dt className="font-medium">
                    {request.approvedAmount === null
                      ? "Approved"
                      : request.status === "REJECTED"
                        ? "Refused"
                        : "Approved"}
                  </dt>
                  <dd
                    className={cn(
                      "text-right text-base font-semibold tabular-nums",
                      request.approvedAmount === null &&
                        "text-sm font-normal text-muted-foreground",
                    )}
                  >
                    {request.approvedAmount === null
                      ? "Not decided yet"
                      : formatCurrency(request.approvedAmount)}
                  </dd>
                </dl>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="size-4 text-muted-foreground" />
                The order it is against
              </CardTitle>
              <CardAction>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto px-0 text-muted-foreground hover:text-primary"
                  render={<Link href={`/orders/${order.id}`} />}
                >
                  Open {order.orderNo}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Order status">
                <OrderStatusBadge status={order.orderStatus} />
              </Detail>
              <Detail label="Payment">
                <PaymentStatusBadge status={order.paymentStatus} />
                <span className="mt-1 block text-xs text-muted-foreground">
                  {paymentMethodLabels[order.paymentMethod]}
                </span>
              </Detail>
              <Detail label="Order total">
                <span className="tabular-nums">
                  {formatCurrency(order.totalAmount)}
                </span>
              </Detail>
              <Detail label="Delivery booked">
                <span className="whitespace-nowrap">
                  {formatDeliveryDate(order.deliveryDate)}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {order.deliverySlotLabel}
                </span>
              </Detail>
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline request={request} />
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="min-w-0">
                <Link
                  href={`/users/${request.customerId}`}
                  className="block truncate font-medium hover:underline"
                >
                  {request.customerName}
                </Link>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {isTradeAccount(order.customerType) ? (
                    <Building2 className="size-3" />
                  ) : (
                    <User className="size-3" />
                  )}
                  <span className="tabular-nums">
                    {order.customerLifetimeOrders}
                  </span>{" "}
                  orders lifetime
                </p>
              </div>
              <a
                href={`tel:${request.customerPhone.replace(/\D/g, "")}`}
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="tabular-nums">{request.customerPhone}</span>
              </a>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="size-4 text-muted-foreground" />
                Payout
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Goes back to</span>
                <span className="text-right">
                  {refundDestinationLabels[request.destination]}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Request type</span>
                <RefundKindMark kind={request.kind} />
              </div>
              {request.resolvedAt ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Closed</span>
                  <span className="text-right whitespace-nowrap">
                    {formatDateTime(request.resolvedAt)}
                  </span>
                </div>
              ) : null}
              {request.decisionNote ? (
                <p className="rounded-md bg-muted/60 p-2.5 text-xs text-muted-foreground">
                  {request.decisionNote}
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
 * The four pipeline steps, plus the off-ramp when there was one.
 *
 * Steps a rejected request never reached are drawn as skipped rather than
 * dropped — "it stopped here" is the useful fact.
 */
function Timeline({ request }: { request: RefundRequest }) {
  const events = new Map<RefundStatus, RefundEvent>(
    request.timeline.map((event) => [event.status, event]),
  );

  const rejected = request.status === "REJECTED";
  const terminal = rejected
    ? (request.timeline[request.timeline.length - 1] ?? null)
    : null;

  const current = pipelineIndex(request.status);

  return (
    <ol className="flex flex-col">
      {REFUND_PIPELINE.map((status, index) => {
        const event = events.get(status) ?? null;
        const last = index === REFUND_PIPELINE.length - 1 && !terminal;

        return (
          <Step
            key={status}
            status={status}
            event={event}
            current={!rejected && index === current}
            last={last}
            skipped={rejected && event === null}
          />
        );
      })}

      {terminal ? (
        <Step status={terminal.status} event={terminal} current last />
      ) : null}
    </ol>
  );
}

function Step({
  status,
  event,
  current,
  last,
  skipped,
}: {
  status: RefundStatus;
  event: RefundEvent | null;
  current: boolean;
  last: boolean;
  skipped?: boolean;
}) {
  const tone = refundStatusTone[status];
  const Icon = refundStatusIcons[status];
  const reached = event !== null;

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
          {refundStatusLabels[status]}
        </p>
        {event ? (
          <p className="text-xs text-muted-foreground">
            {formatDateTime(event.at)}
            {event.by ? ` · ${event.by}` : " · customer"}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/70">
            {skipped ? "Never reached" : "Not yet"}
          </p>
        )}
        {event?.note ? (
          <p className="mt-1 text-xs text-muted-foreground">{event.note}</p>
        ) : null}
      </div>
    </li>
  );
}

/** A label above its value; the shape the order card uses. */
function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

/**
 * One row of the amounts block.
 *
 * Negative values print with a minus sign; a zero row is dropped entirely,
 * which is how "voucher and rounding" disappears on an order that had none.
 */
function Money({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "danger";
}) {
  if (value === 0) return null;

  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-right tabular-nums",
          tone === "danger" && "text-destructive",
        )}
      >
        {value < 0 ? `−${formatCurrency(-value)}` : formatCurrency(value)}
      </dd>
    </>
  );
}
