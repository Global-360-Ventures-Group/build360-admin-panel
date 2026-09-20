import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireSampleOrder } from "@/features/orders/sample-data";
import { RefundDetailView } from "@/features/refunds/refund-detail-view";
import { findSampleRefund } from "@/features/refunds/sample-data";
import { requireUser } from "@/lib/auth/dal";

export async function generateMetadata({
  params,
}: PageProps<"/refunds/[id]">): Promise<Metadata> {
  const { id } = await params;
  const request = findSampleRefund(id);

  return {
    title: request
      ? `Refund ${request.refNo} · Build360 Admin`
      : "Refund · Build360 Admin",
  };
}

/**
 * One refund request, with the order it is against.
 *
 * `requireSampleOrder` rather than a null check: every request in the fixture
 * was built from an order, so a missing one is a broken fixture, not a 404.
 */
export default async function RefundPage({
  params,
}: PageProps<"/refunds/[id]">) {
  await requireUser();

  const { id } = await params;
  const request = findSampleRefund(id);

  if (!request) notFound();

  return (
    <RefundDetailView
      request={request}
      order={requireSampleOrder(request.orderId)}
    />
  );
}
