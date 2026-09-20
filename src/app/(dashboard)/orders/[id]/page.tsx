import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrderDetailView } from "@/features/orders/order-detail-view";
import { findSampleOrder } from "@/features/orders/sample-data";
import { listSampleRefundsForOrder } from "@/features/refunds/sample-data";
import { requireUser } from "@/lib/auth/dal";

export async function generateMetadata({
  params,
}: PageProps<"/orders/[id]">): Promise<Metadata> {
  const { id } = await params;
  const order = findSampleOrder(id);

  return {
    title: order
      ? `Order ${order.orderNo} · Build360 Admin`
      : "Order · Build360 Admin",
  };
}

/**
 * One order.
 *
 * Reads the fixture rather than `GET /admin/orders/{id}`, which does not
 * exist — see the note on `OrdersPage` for why this route is signed-in but not
 * permission-gated.
 *
 * The refund requests are joined here rather than inside either fixture: the
 * refunds fixture reads the orders one, so the reverse would be a cycle.
 */
export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  await requireUser();

  const { id } = await params;
  const order = findSampleOrder(id);

  if (!order) notFound();

  return (
    <OrderDetailView
      order={order}
      refunds={listSampleRefundsForOrder(order.id)}
    />
  );
}
