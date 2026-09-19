import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Building2,
  ChevronRight,
  ClipboardList,
  Map,
  MapPin,
  Package,
  PackageX,
  ShieldCheck,
  ShoppingCart,
  TicketPercent,
  Undo2,
  UserPlus,
  Users,
  UserX,
  Wallet,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency } from "@/lib/utils";

/**
 * Four semantic tones carry this whole page. `brand` is the red that means
 * "act on this"; the other three are the status colours the theme already
 * reserves — so a tone is picked for what a number *means*, never to
 * decorate. Badge ships no success/warning/info variant, so the pills paint
 * the tokens over `secondary` (the same trick the products table uses).
 */
type Tone = "brand" | "success" | "warning" | "info";

const toneSurface: Record<Tone, string> = {
  brand: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-chart-2/10 text-chart-2",
};

const toneText: Record<Tone, string> = {
  brand: "text-primary",
  success: "text-success",
  warning: "text-warning",
  info: "text-chart-2",
};

const toneDot: Record<Tone, string> = {
  brand: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-chart-2",
};

type Stat = {
  title: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
  note: string;
  noteTone: Tone;
};

const stats: Stat[] = [
  {
    title: "Today's Orders",
    value: "48",
    icon: ShoppingCart,
    tone: "brand",
    note: "On track",
    noteTone: "success",
  },
  {
    title: "Pending Orders",
    value: "12",
    icon: ClipboardList,
    tone: "warning",
    note: "Needs attention",
    noteTone: "warning",
  },
  {
    title: "Today's Revenue",
    value: formatCurrency(342500),
    icon: Wallet,
    tone: "success",
    note: "Updated just now",
    noteTone: "success",
  },
  {
    title: "Active Customers",
    value: "1,824",
    icon: Users,
    tone: "info",
    note: "+12 today",
    noteTone: "success",
  },
  {
    title: "Low-Stock Alerts",
    value: "8",
    icon: PackageX,
    tone: "brand",
    note: "Needs attention",
    noteTone: "brand",
  },
  {
    title: "Pending Refunds",
    value: "5",
    icon: Undo2,
    tone: "warning",
    note: "Needs review",
    noteTone: "warning",
  },
];

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: Tone;
  /** Exactly one action is the filled call to action; the rest stay quiet. */
  featured?: boolean;
};

const quickActions: QuickAction[] = [
  {
    title: "View New Orders",
    description: "Check and process orders",
    href: "/orders",
    icon: ShoppingCart,
    tone: "brand",
    featured: true,
  },
  {
    title: "Review Refund Requests",
    description: "Handle customer requests",
    href: "/refunds",
    icon: Undo2,
    tone: "brand",
  },
  {
    title: "Manage Customers",
    description: "View and edit customer accounts",
    href: "/users",
    icon: Users,
    tone: "info",
  },
  {
    title: "Add Coupon",
    description: "Create a new discount",
    href: "/coupons",
    icon: TicketPercent,
    tone: "brand",
  },
  {
    title: "Update Product Stock",
    description: "Adjust inventory levels",
    href: "/inventory",
    icon: Boxes,
    tone: "success",
  },
  {
    title: "Create Staff Account",
    description: "Add a new team member",
    href: "/staff",
    icon: UserPlus,
    tone: "warning",
  },
];

type PaymentStatus = "Paid" | "Pending" | "Failed";
type DeliveryStatus = "Processing" | "Preparing" | "Dispatched" | "Delivered";

const paymentTone: Record<PaymentStatus, Tone> = {
  Paid: "success",
  Pending: "warning",
  Failed: "brand",
};

const deliveryTone: Record<DeliveryStatus, Tone> = {
  Processing: "warning",
  Preparing: "warning",
  Dispatched: "info",
  Delivered: "success",
};

const recentOrders: {
  id: string;
  customer: string;
  products: string;
  amount: number;
  payment: PaymentStatus;
  delivery: DeliveryStatus;
}[] = [
  {
    id: "#B360-10024",
    customer: "Rahim Traders",
    products: "Cement x 10",
    amount: 12500,
    payment: "Paid",
    delivery: "Processing",
  },
  {
    id: "#B360-10023",
    customer: "Nova Builders",
    products: "Tiles x 5",
    amount: 28750,
    payment: "Paid",
    delivery: "Preparing",
  },
  {
    id: "#B360-10022",
    customer: "Construction Hub Ltd.",
    products: "Steel Rods x 20",
    amount: 125000,
    payment: "Paid",
    delivery: "Dispatched",
  },
  {
    id: "#B360-10021",
    customer: "Karim & Co.",
    products: "Paint x 4",
    amount: 18600,
    payment: "Pending",
    delivery: "Processing",
  },
  {
    id: "#B360-10020",
    customer: "Skyline Ltd.",
    products: "Bricks x 100",
    amount: 31000,
    payment: "Paid",
    delivery: "Delivered",
  },
];

/** `critical` flips the remaining-stock pill from amber to brand red. */
const lowStock: {
  name: string;
  brand: string;
  left: string;
  critical?: boolean;
}[] = [
  {
    name: "OPC Cement (50kg)",
    brand: "Shah Cement",
    left: "6 bags",
    critical: true,
  },
  { name: "Ceramic Floor Tile (60x60)", brand: "RAK", left: "12 boxes" },
  { name: "Steel Rod (12mm)", brand: "BSRM", left: "18 units" },
  {
    name: "Wall Putty (20kg)",
    brand: "Berger",
    left: "5 buckets",
    critical: true,
  },
  {
    name: "Electrical Wire (1.5mm)",
    brand: "BRB Cable",
    left: "9 rolls",
    critical: true,
  },
];

type RequestStatus = "Pending" | "Under Review";

const requestTone: Record<RequestStatus, Tone> = {
  Pending: "warning",
  "Under Review": "info",
};

const refundRequests: {
  id: string;
  customer: string;
  type: "Refund" | "Cancellation";
  amount: number;
  status: RequestStatus;
}[] = [
  {
    id: "#B360-10019",
    customer: "Tanvir Hossain",
    type: "Refund",
    amount: 8750,
    status: "Pending",
  },
  {
    id: "#B360-10018",
    customer: "Dilara Ferdous",
    type: "Cancellation",
    amount: 15200,
    status: "Pending",
  },
  {
    id: "#B360-10017",
    customer: "Metro Constructions",
    type: "Refund",
    amount: 62000,
    status: "Under Review",
  },
  {
    id: "#B360-10016",
    customer: "Sadia Rahman",
    type: "Cancellation",
    amount: 11500,
    status: "Pending",
  },
  {
    id: "#B360-10015",
    customer: "Imran Kabir",
    type: "Refund",
    amount: 27300,
    status: "Under Review",
  },
];

const customerOverview: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone: Tone;
  noteTone: Tone;
}[] = [
  {
    label: "New Customers Today",
    value: "24",
    note: "+8% from yesterday",
    icon: UserPlus,
    tone: "success",
    noteTone: "success",
  },
  {
    label: "Business Accounts",
    value: "186",
    note: "Active accounts",
    icon: Building2,
    tone: "info",
    noteTone: "info",
  },
  {
    label: "Verified Customers",
    value: "1,420",
    note: "77% of total",
    icon: ShieldCheck,
    tone: "brand",
    noteTone: "brand",
  },
  {
    label: "Blocked / Inactive",
    value: "32",
    note: "Requires attention",
    icon: UserX,
    tone: "warning",
    noteTone: "warning",
  },
];

const deliveryAreas = [
  { name: "Dhaka", orders: 12 },
  { name: "Chattogram", orders: 8 },
  { name: "Sylhet", orders: 6 },
  { name: "Khulna", orders: 5 },
  { name: "Rajshahi", orders: 4 },
];

/** Soft status pill. See the note on `Tone` for why it repaints `secondary`. */
function StatusPill({
  tone,
  children,
}: {
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <Badge variant="secondary" className={toneSurface[tone]}>
      {children}
    </Badge>
  );
}

/** Stand-in for the product photo until the order feed carries thumbnails. */
function Thumb() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <Package className="size-4" />
    </span>
  );
}

function ViewAll({ href, label }: { href: string; label: string }) {
  return (
    <Button
      variant="link"
      size="sm"
      className="h-auto px-0 text-muted-foreground hover:text-primary"
      render={<Link href={href} />}
    >
      {label}
      <ArrowRight data-icon="inline-end" />
    </Button>
  );
}

/* Header row shared by every table here: quiet, small, and not hoverable. */
const headRow =
  "hover:bg-transparent [&>th]:h-9 [&>th]:text-xs [&>th]:font-medium [&>th]:text-muted-foreground";

  // try to update admin panel and live it
export default function DashboardPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Welcome back! Here&apos;s what&apos;s happening at Build360 today.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.title} size="sm">
            <CardContent>
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg",
                    toneSurface[stat.tone],
                  )}
                >
                  <stat.icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="mt-0.5 truncate text-xl font-semibold tracking-tight">
                    {stat.value}
                  </p>
                </div>
              </div>
              <p
                className={cn(
                  "mt-3 flex items-center gap-1.5 text-xs font-medium",
                  toneText[stat.noteTone],
                )}
              >
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    toneDot[stat.noteTone],
                  )}
                />
                {stat.note}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-baseline gap-2">
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription className="text-xs">
            Get things done quickly
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className={cn(
                "flex items-center gap-3 rounded-lg p-3 transition-colors",
                action.featured
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "ring-1 ring-foreground/10 hover:bg-muted/60",
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  action.featured
                    ? "bg-primary-foreground/15 text-primary-foreground"
                    : toneSurface[action.tone],
                )}
              >
                <action.icon className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{action.title}</p>
                <p
                  className={cn(
                    "truncate text-xs",
                    action.featured
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground",
                  )}
                >
                  {action.description}
                </p>
              </div>
              {action.featured ? (
                <ChevronRight className="size-4 shrink-0" />
              ) : null}
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="min-w-0 py-0 xl:col-span-3">
          <CardHeader className="border-b py-4">
            <CardTitle>Recent Orders</CardTitle>
            <CardAction>
              <ViewAll href="/orders" label="View all orders" />
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className={headRow}>
                  <TableHead className="pl-4">Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead className="w-16 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="pl-4 font-medium">
                      {order.id}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate">
                      {order.customer}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Thumb />
                        <span className="text-muted-foreground">
                          {order.products}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.amount)}
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={paymentTone[order.payment]}>
                        {order.payment}
                      </StatusPill>
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={deliveryTone[order.delivery]}>
                        {order.delivery}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button size="sm" render={<Link href="/orders" />}>
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="min-w-0 py-0 xl:col-span-2">
          <CardHeader className="border-b py-4">
            <CardTitle>Low Stock Products</CardTitle>
            <CardAction>
              <ViewAll href="/inventory" label="View all inventory" />
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className={headRow}>
                  <TableHead className="pl-4">Product</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead className="w-20 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2">
                        <Thumb />
                        <span className="block max-w-[12rem] truncate font-medium">
                          {item.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.brand}
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={item.critical ? "brand" : "warning"}>
                        {item.left}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button size="sm" render={<Link href="/inventory" />}>
                        Restock
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="min-w-0 py-0 xl:col-span-3">
          <CardHeader className="border-b py-4">
            <CardTitle>Pending Refunds &amp; Cancellations</CardTitle>
            <CardAction>
              <ViewAll href="/refunds" label="View all requests" />
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className={headRow}>
                  <TableHead className="pl-4">Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Request Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refundRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="pl-4 font-medium">
                      {request.id}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate">
                      {request.customer}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {request.type}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(request.amount)}
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={requestTone[request.status]}>
                        {request.status}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button size="sm" render={<Link href="/refunds" />}>
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Customer Overview</CardTitle>
              <CardAction>
                <ViewAll href="/users" label="View all customers" />
              </CardAction>
            </CardHeader>
            <CardContent>
              {/* gap-px over the border colour draws the hairline dividers
                  without four separate border rules. */}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border sm:grid-cols-4">
                {customerOverview.map((item) => (
                  <div
                    key={item.label}
                    className="flex min-w-0 flex-col gap-2 bg-card p-3"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full",
                          toneSurface[item.tone],
                        )}
                      >
                        <item.icon className="size-3.5" />
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {item.label}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-semibold tracking-tight">
                        {item.value}
                      </p>
                      <p
                        className={cn(
                          "truncate text-xs",
                          toneText[item.noteTone],
                        )}
                      >
                        {item.note}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                Today&apos;s Delivery Areas
              </CardTitle>
              <CardAction>
                <ViewAll href="/orders" label="View all deliveries" />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {deliveryAreas.map((area) => (
                <div
                  key={area.name}
                  className="flex min-w-0 flex-1 basis-32 items-center gap-2 rounded-lg px-3 py-2 ring-1 ring-foreground/10"
                >
                  <MapPin className="size-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{area.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {area.orders} orders
                    </p>
                  </div>
                </div>
              ))}
              <Link
                href="/reports"
                className="flex min-w-0 flex-1 basis-32 items-center gap-2 rounded-lg bg-muted px-3 py-2 transition-colors hover:bg-muted/70"
              >
                <Map className="size-4 shrink-0 text-muted-foreground" />
                <p className="truncate text-sm font-medium">View Full Map</p>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
