import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CustomersView } from "@/features/customers/customers-view";
import {
  listSampleCustomers,
  sampleCustomerSummary,
  type CustomerFilters,
} from "@/features/customers/sample-data";
import {
  ALL,
  parseCustomerSort,
  parseCustomerStatus,
  parseCustomerType,
  parseVerifiedFilter,
} from "@/features/customers/types";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Customers · Build360 Admin",
};

/**
 * The customer book.
 *
 * **The route is `/users`, not `/customers`** — that is what the sidebar and
 * the dashboard's quick actions already link to, so renaming it would break
 * both. It is worth knowing that the *API* uses the opposite convention:
 * `/admin/users` there is staff, and lives behind this panel's `/staff`.
 *
 * **Not permission-gated, on purpose.** There is no `CUSTOMER_*` code in the
 * permission catalogue, because there are no admin customer endpoints for one
 * to guard; gating on an invented code would lock out every real account,
 * SUPER_ADMIN included. Sign-in is still required.
 */
export default async function CustomersPage({
  searchParams,
}: PageProps<"/users">) {
  await requireUser();

  const params = await searchParams;

  const filters: CustomerFilters = {
    search: firstValue(params.q)?.trim() ?? "",
    status: parseCustomerStatus(firstValue(params.status)),
    type: parseCustomerType(firstValue(params.type)),
    verified: parseVerifiedFilter(firstValue(params.verified)),
    sort: parseCustomerSort(firstValue(params.sort)),
    // The URL is 1-based for humans; the page object is 0-based.
    page: Math.max(1, Number(firstValue(params.page)) || 1),
  };

  const { customers, counts } = listSampleCustomers(filters);

  // A page past the end returns empty, which would render "No customers yet"
  // over a book that has plenty. Send the visitor to the last real page.
  if (
    customers.content.length === 0 &&
    customers.totalElements > 0 &&
    filters.page > customers.totalPages
  ) {
    redirect(customersHref({ ...filters, page: customers.totalPages }));
  }

  return (
    <CustomersView
      customers={customers}
      counts={counts}
      summary={sampleCustomerSummary()}
      filters={filters}
    />
  );
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Mirrors `buildHref` in the view — same query contract, both directions. */
function customersHref(filters: CustomerFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("q", filters.search);
  if (filters.status !== ALL) params.set("status", filters.status);
  if (filters.type !== ALL) params.set("type", filters.type);
  if (filters.verified !== ALL) params.set("verified", filters.verified);
  if (filters.sort !== "recent") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));

  const queryString = params.toString();
  return queryString ? `/users?${queryString}` : "/users";
}
