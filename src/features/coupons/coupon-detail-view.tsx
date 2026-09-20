import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  Copy,
  Landmark,
  Pause,
  Pencil,
  Play,
  TicketPercent,
  Users,
} from "lucide-react";

import { SampleDataNotice } from "@/components/sample-data-notice";
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
import type { Order } from "@/features/orders/types";
import { SAMPLE_TODAY } from "@/lib/fixtures";
import { toneSurface, toneText, type Tone } from "@/lib/tone";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

import {
  AudienceMark,
  CouponStatusBadge,
  DiscountMark,
  UsageMeter,
} from "./coupon-badges";
import {
  COUPON_ENDING_SOON_DAYS,
  audienceHints,
  averageDiscount,
  daysUntilEnd,
  discountTypeLabels,
  isLive,
  scopeTypeLabels,
  usagePercent,
  type Coupon,
} from "./types";

/**
 * One coupon.
 *
 * Server-rendered end to end — there is nothing to submit, because the API has
 * no endpoint that creates, edits, pauses or deletes a voucher. Pause, Edit
 * and Duplicate are present and disabled: the design shows where the controls
 * go without pretending they land anywhere.
 *
 * The page answers two questions in order: what does this code *do*, and what
 * has it *cost*. The rule comes first because it is the thing an operator has
 * to check before touching anything, and it is also the only part of this
 * screen the API can really describe.
 */
export function CouponDetailView({
  coupon,
  orders,
}: {
  coupon: Coupon;
  /** Orders in the orders fixture that redeemed this code, newest first. */
  orders: Order[];
}) {
  const days = daysUntilEnd(coupon, SAMPLE_TODAY);
  const endingSoon =
    isLive(coupon.status) && days >= 0 && days <= COUPON_ENDING_SOON_DAYS;
  const average = averageDiscount(coupon);
  const percent = usagePercent(coupon);

  const recentDiscount = orders.reduce(
    (total, order) => total + order.discount,
    0,
  );

  return (
    <>
      <div>
        <Button
          variant="link"
          size="sm"
          className="h-auto px-0 text-muted-foreground hover:text-primary"
          render={<Link href="/coupons" />}
        >
          <ArrowLeft data-icon="inline-start" /> All coupons
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">
              {coupon.code}
            </h1>
            <CouponStatusBadge status={coupon.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {coupon.name} · {discountTypeLabels[coupon.discountType]} ·{" "}
            {scopeTypeLabels[coupon.scopeType]}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="outline"
            disabled
            title="The API has no endpoint that copies a voucher"
          >
            <Copy /> Duplicate
          </Button>
          <Button
            variant="outline"
            disabled
            title="The API has no endpoint that edits a voucher"
          >
            <Pencil /> Edit
          </Button>
          {/* Only offered while there is something to switch. A finished
              campaign has no pause worth showing. */}
          {coupon.status === "ACTIVE" || coupon.status === "PAUSED" ? (
            <Button
              disabled
              title="The API has no endpoint that pauses a voucher"
            >
              {coupon.status === "PAUSED" ? <Play /> : <Pause />}
              {coupon.status === "PAUSED" ? "Resume" : "Pause"}
            </Button>
          ) : null}
        </div>
      </div>

      <SampleDataNotice detail="This campaign is a fixture. The discount rule below is the API's real voucher shape, but nothing in the API lists, creates, edits or pauses one — so the buttons above are disabled." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          title="Redemptions"
          value={coupon.usageCount.toLocaleString("en-US")}
          icon={TicketPercent}
          tone="info"
          note={
            coupon.usageLimit === null
              ? "No redemption limit"
              : `${percent}% of the ${coupon.usageLimit} allowed`
          }
        />
        <Stat
          title="Discount given"
          value={formatCurrency(coupon.discountGiven)}
          icon={Landmark}
          tone="violet"
          note={
            recentDiscount > 0
              ? `${formatCurrency(recentDiscount)} in the last 30 days`
              : "Nothing in the last 30 days"
          }
        />
        <Stat
          title="Average discount"
          value={average === null ? "—" : formatCurrency(average)}
          icon={Landmark}
          tone="success"
          note={average === null ? "Never redeemed" : "Per order that used it"}
        />
        <Stat
          title={days < 0 ? "Ended" : "Ends"}
          value={formatDate(coupon.endDate)}
          icon={CalendarClock}
          tone={endingSoon ? "warning" : days < 0 ? "neutral" : "teal"}
          note={
            days < 0
              ? `${Math.abs(days)} days ago`
              : days === 0
                ? "Today"
                : `In ${days} days`
          }
        />
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>The rule</CardTitle>
              <CardAction>
                <DiscountMark coupon={coupon} className="text-sm" />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                {coupon.description}
              </p>

              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Detail label="Discount">
                  {discountTypeLabels[coupon.discountType]}
                </Detail>
                <Detail label="Applies to">
                  {coupon.scopeLabel}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {scopeTypeLabels[coupon.scopeType]}
                  </span>
                </Detail>
                <Detail label="Minimum order">
                  {coupon.minimumOrderAmount === null ? (
                    <span className="text-muted-foreground">None</span>
                  ) : (
                    <span className="tabular-nums">
                      {formatCurrency(coupon.minimumOrderAmount)}
                    </span>
                  )}
                </Detail>
                <Detail label="Maximum discount">
                  {coupon.maximumDiscountAmount === null ? (
                    <span className="text-muted-foreground">Uncapped</span>
                  ) : (
                    <span className="tabular-nums">
                      {formatCurrency(coupon.maximumDiscountAmount)}
                    </span>
                  )}
                </Detail>
                <Detail label="Per customer">
                  {coupon.perCustomerLimit === null ? (
                    <span className="text-muted-foreground">No limit</span>
                  ) : (
                    <span className="tabular-nums">
                      {coupon.perCustomerLimit}{" "}
                      {coupon.perCustomerLimit === 1 ? "use" : "uses"}
                    </span>
                  )}
                </Detail>
                <Detail label="Runs">
                  <span className="whitespace-nowrap">
                    {formatDate(coupon.startDate)} – {formatDate(coupon.endDate)}
                  </span>
                </Detail>
              </dl>
            </CardContent>
          </Card>

          <Card className="min-w-0 py-0">
            <CardHeader className="border-b py-4">
              <CardTitle>Recent redemptions</CardTitle>
              <CardAction>
                <span className="text-xs text-muted-foreground">
                  From the last 30 days of orders
                </span>
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              {orders.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No orders in the last thirty days used this code.
                  {coupon.usageCount > 0
                    ? ` It has been redeemed ${coupon.usageCount} times over its whole run.`
                    : " It has never been redeemed."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent [&>th]:h-9 [&>th]:text-xs [&>th]:font-medium [&>th]:text-muted-foreground">
                      <TableHead className="pl-4">Order</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Customer
                      </TableHead>
                      <TableHead className="text-right">Order total</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
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
                        <TableCell className="hidden sm:table-cell">
                          <Link
                            href={`/users/${order.customerId}`}
                            className="block max-w-[12rem] truncate hover:underline"
                          >
                            {order.address.contactName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap tabular-nums">
                          {formatCurrency(order.totalAmount)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium whitespace-nowrap tabular-nums",
                            toneText.success,
                          )}
                        >
                          −{formatCurrency(order.discount)}
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
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Budget</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <UsageMeter coupon={coupon} />
              <p className="text-xs text-muted-foreground">
                {coupon.usageLimit === null
                  ? "No redemption cap — this code runs until its end date."
                  : coupon.usageCount >= coupon.usageLimit
                    ? "Cap reached. The code stops working even though its dates still run."
                    : `${coupon.usageLimit - coupon.usageCount} redemptions left before it stops.`}
              </p>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                Audience
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <AudienceMark
                audience={coupon.audience}
                issuedTo={coupon.issuedTo}
              />
              <p className="text-xs text-muted-foreground">
                {audienceHints[coupon.audience]}
                {coupon.audience === "TARGETED" && coupon.issuedTo != null
                  ? ` Issued to ${coupon.issuedTo} accounts.`
                  : ""}
              </p>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Created</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <Row label="By">{coupon.createdBy}</Row>
              <Row label="On">{formatDate(coupon.createdAt)}</Row>
              <Row label="Code">
                <span className="font-mono">{coupon.code}</span>
              </Row>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

/** A label above its value; the shape the rule grid uses. */
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
  icon: React.ComponentType<{ className?: string }>;
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
