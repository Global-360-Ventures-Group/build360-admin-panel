import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  FolderKanban,
  ShoppingCart,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
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

const stats = [
  {
    title: "Total Revenue",
    value: "$45,231",
    change: "+20.1%",
    up: true,
    icon: DollarSign,
  },
  {
    title: "Orders",
    value: "1,254",
    change: "+12.5%",
    up: true,
    icon: ShoppingCart,
  },
  {
    title: "Active Projects",
    value: "38",
    change: "+4",
    up: true,
    icon: FolderKanban,
  },
  { title: "Users", value: "2,350", change: "-1.2%", up: false, icon: Users },
];

type OrderStatus = "Paid" | "Pending" | "Failed";

const orders: {
  id: string;
  customer: string;
  status: OrderStatus;
  amount: string;
}[] = [
  { id: "#ORD-1042", customer: "Rahim Traders", status: "Paid", amount: "$1,250.00" },
  { id: "#ORD-1041", customer: "Karim & Co.", status: "Pending", amount: "$820.00" },
  { id: "#ORD-1040", customer: "Nova Builders", status: "Paid", amount: "$3,400.00" },
  { id: "#ORD-1039", customer: "Delta Homes", status: "Failed", amount: "$560.00" },
  { id: "#ORD-1038", customer: "Skyline Ltd.", status: "Paid", amount: "$2,150.00" },
];

const statusVariant: Record<OrderStatus, "default" | "secondary" | "destructive"> = {
  Paid: "default",
  Pending: "secondary",
  Failed: "destructive",
};

const activity = [
  "New user Hanif registered",
  "Project Tower A marked active",
  "Order #ORD-1042 paid",
  "Report Q3 Sales exported",
];

export default function DashboardPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your business at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>{s.title}</CardDescription>
              <s.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              <p
                className={
                  "mt-1 flex items-center gap-1 text-xs " +
                  (s.up ? "text-success" : "text-destructive")
                }
              >
                {s.up ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                {s.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>
              Latest 5 orders placed on the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.id}</TableCell>
                    <TableCell>{o.customer}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[o.status]}>{o.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{o.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>What happened recently.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activity.map((a, i) => (
              <div key={a} className="flex items-start gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                <div className="text-sm">
                  <p>{a}</p>
                  <p className="text-xs text-muted-foreground">{i + 1}h ago</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
