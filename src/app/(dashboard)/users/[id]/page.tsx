import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CustomerDetailView } from "@/features/customers/customer-detail-view";
import { findSampleCustomer } from "@/features/customers/sample-data";
import { listSampleOrdersForCustomer } from "@/features/orders/sample-data";
import { requireUser } from "@/lib/auth/dal";

export async function generateMetadata({
  params,
}: PageProps<"/users/[id]">): Promise<Metadata> {
  const { id } = await params;
  const customer = findSampleCustomer(id);

  return {
    title: customer
      ? `${customer.fullName} · Build360 Admin`
      : "Customer · Build360 Admin",
  };
}

/**
 * One customer, with the orders they placed.
 *
 * This is where the two fixtures are joined. It has to happen here: the
 * customer fixture cannot read the order fixture, because the order fixture
 * reads the customer one, and the cycle would break the build.
 */
export default async function CustomerPage({
  params,
}: PageProps<"/users/[id]">) {
  await requireUser();

  const { id } = await params;
  const customer = findSampleCustomer(id);

  if (!customer) notFound();

  return (
    <CustomerDetailView
      customer={customer}
      orders={listSampleOrdersForCustomer(customer.id)}
    />
  );
}
