import Link from "next/link";
import {
  ArrowDownUp,
  ArrowLeft,
  Boxes,
  ClipboardCheck,
  Landmark,
  PackageX,
  Pencil,
  TriangleAlert,
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
import { productStatusLabels } from "@/features/products/types";
import { toneSurface, toneText, type Tone } from "@/lib/tone";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

import { MismatchBadge, StockStatusBadge } from "./inventory-badges";
import {
  availableStock,
  mismatchHints,
  movementKindLabels,
  statusMismatch,
  stockValue,
  type InventoryItem,
  type MovementKind,
} from "./types";

/** Goods-in is green, anything leaving is quiet, a write-off is red. */
const movementTone: Record<MovementKind, Tone> = {
  RECEIPT: "success",
  SALE: "neutral",
  RETURN: "info",
  ADJUSTMENT: "warning",
  DAMAGE: "danger",
  COUNT: "violet",
};

/**
 * One stock line, with the ledger that explains its quantity.
 *
 * Server-rendered end to end — there is nothing to submit, because the API has
 * no stock to write to. The two buttons are disabled, and the more interesting
 * of the pair is "Fix storefront status": that one *could* be wired today, via
 * `PUT /admin/products/{id}` behind `PRODUCT_UPDATE`, because a product's
 * status is the one availability field the backend really has. It stays
 * disabled here because this screen is a design over a fixture, but it is the
 * single cheapest thing to make real.
 */
export function InventoryDetailView({
  item,
  orderIdByNo,
}: {
  item: InventoryItem;
  /**
   * Order number → order id, so a ledger reference becomes a link. Resolved
   * by the route: the inventory fixture must not import the orders one.
   */
  orderIdByNo: Record<string, string>;
}) {
  const available = availableStock(item);
  const mismatch = statusMismatch(item);
  const margin = item.price - item.costPrice;

  return (
    <>
      <div>
        <Button
          variant="link"
          size="sm"
          className="h-auto px-0 text-muted-foreground hover:text-primary"
          render={<Link href="/inventory" />}
        >
          <ArrowLeft data-icon="inline-start" /> All inventory
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {item.name}
            </h1>
            <StockStatusBadge item={item} />
            <MismatchBadge item={item} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono">{item.sku}</span> · {item.brand} ·{" "}
            {item.category} · {item.location}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="outline"
            disabled
            title="Stock counts need a backend that can store a quantity"
          >
            <ClipboardCheck /> Record a count
          </Button>
          <Button
            disabled
            title="Writable through PUT /admin/products/{id}, but this screen is a fixture"
          >
            <Pencil /> Fix storefront status
          </Button>
        </div>
      </div>

      <SampleDataNotice detail="Every quantity below is a fixture — the API stores no stock. The one real field here is the product's own status, which is what the storefront actually reads." />

      {/*
        The mismatch gets its own bar, not just a badge. It is the only thing
        on this screen that is actively costing money right now.
      */}
      {mismatch ? (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-2 rounded-lg p-3 text-sm ring-1 ring-inset",
            mismatch === "OVERSELLING" ? toneSurface.danger : toneSurface.warning,
          )}
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>{mismatchHints[mismatch]}.</p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          title="On hand"
          value={`${item.onHand} ${item.unit}`}
          icon={Warehouse}
          tone="info"
          note={`Counted ${formatDate(item.lastCountedAt)}`}
        />
        <Stat
          title="Reserved"
          value={`${item.reserved} ${item.unit}`}
          icon={Boxes}
          tone={item.reserved > 0 ? "violet" : "neutral"}
          note="Promised to orders not yet shipped"
        />
        <Stat
          title="Free to sell"
          value={`${available} ${item.unit}`}
          icon={available > 0 ? Boxes : PackageX}
          tone={
            available <= 0
              ? "danger"
              : available <= item.reorderPoint
                ? "warning"
                : "success"
          }
          note={`Reorder at ${item.reorderPoint}`}
        />
        <Stat
          title="Stock value"
          value={formatCurrency(stockValue(item))}
          icon={Landmark}
          tone="success"
          note={`${formatCurrency(item.costPrice)} per ${item.unit} at cost`}
        />
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <Card className="min-w-0 py-0">
            <CardHeader className="border-b py-4">
              <CardTitle className="flex items-center gap-2">
                <ArrowDownUp className="size-4 text-muted-foreground" />
                Stock movements
              </CardTitle>
              <CardAction>
                <span className="text-xs text-muted-foreground">
                  Adds up to{" "}
                  <span className="font-medium tabular-nums">
                    {item.onHand}
                  </span>{" "}
                  {item.unit}
                </span>
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent [&>th]:h-9 [&>th]:text-xs [&>th]:font-medium [&>th]:text-muted-foreground">
                    <TableHead className="pl-4">When</TableHead>
                    <TableHead>What</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Reference
                    </TableHead>
                    <TableHead className="pr-4 text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {item.movements.map((movement) => {
                    const orderId = movement.reference
                      ? orderIdByNo[movement.reference]
                      : undefined;

                    return (
                      <TableRow key={movement.id}>
                        <TableCell className="pl-4 whitespace-nowrap">
                          {formatDateTime(movement.at)}
                          <div className="text-xs text-muted-foreground">
                            {movement.by}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "ring-1 ring-inset",
                              toneSurface[movementTone[movement.kind]],
                            )}
                          >
                            {movementKindLabels[movement.kind]}
                          </Badge>
                          {movement.note ? (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {movement.note}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap sm:table-cell">
                          {movement.reference === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : orderId ? (
                            <Link
                              href={`/orders/${orderId}`}
                              className="font-mono text-xs hover:underline"
                            >
                              {movement.reference}
                            </Link>
                          ) : (
                            <span className="font-mono text-xs text-muted-foreground">
                              {movement.reference}
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "pr-4 text-right font-medium whitespace-nowrap tabular-nums",
                            movement.quantity > 0
                              ? toneText.success
                              : toneText.danger,
                          )}
                        >
                          {movement.quantity > 0 ? "+" : "−"}
                          {Math.abs(movement.quantity)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Reordering</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <Row label="Reorder point">
                <span className="tabular-nums">
                  {item.reorderPoint} {item.unit}
                </span>
              </Row>
              <Row label="Reorder quantity">
                <span className="tabular-nums">
                  {item.reorderQuantity === 0
                    ? "Not restocking"
                    : `${item.reorderQuantity} ${item.unit}`}
                </span>
              </Row>
              <Row label="Supplier">{item.supplier}</Row>
              <Row label="Depot">{item.location}</Row>
              <Row label="Last counted">{formatDate(item.lastCountedAt)}</Row>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <Row label="Sells for">
                <span className="tabular-nums">
                  {formatCurrency(item.price)}
                </span>
              </Row>
              <Row label="Costs">
                <span className="tabular-nums">
                  {formatCurrency(item.costPrice)}
                </span>
              </Row>
              <Row label="Margin">
                <span
                  className={cn(
                    "tabular-nums",
                    margin > 0 ? toneText.success : toneText.danger,
                  )}
                >
                  {formatCurrency(margin)} ·{" "}
                  {Math.round((margin / item.price) * 100)}%
                </span>
              </Row>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Storefront</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <Row label="Product status">
                {productStatusLabels[item.productStatus]}
              </Row>
              <p className="text-xs text-muted-foreground">
                This is the only availability field the API has, and the only
                thing the storefront reads. Everything else on this screen is a
                proposal.
              </p>
            </CardContent>
          </Card>
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
