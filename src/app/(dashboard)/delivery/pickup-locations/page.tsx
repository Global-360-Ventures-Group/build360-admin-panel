import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  listPickupLocations,
} from "@/features/delivery/pickup-locations/api";
import { PickupLocationsView } from "@/features/delivery/pickup-locations/pickup-locations-view";
import { PICKUP_LOCATION_PAGE_SIZE_DEFAULT } from "@/features/delivery/pickup-locations/types";
import { DELIVERY_CONFIG_MANAGE } from "@/features/delivery/shared";
import { hasPermission, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Pickup locations · Build360 Admin",
};

export default async function PickupLocationsPage({
  searchParams,
}: PageProps<"/delivery/pickup-locations">) {
  // The layout already gated on `DELIVERY_CONFIG_VIEW`; this is only here for
  // the write grant, which decides whether the controls render.
  const user = await requireUser();

  const params = await searchParams;
  const raw = Array.isArray(params.page) ? params.page[0] : params.page;
  // The URL is 1-based for humans; the API is 0-based.
  const page = Math.max(1, Number(raw) || 1);

  const locations = await listPickupLocations({
    page: page - 1,
    size: PICKUP_LOCATION_PAGE_SIZE_DEFAULT,
  });

  // A page past the end comes back empty, which would render "No pickup
  // locations yet" over a list that has plenty. Send the visitor to the last
  // real page instead.
  if (
    locations.content.length === 0 &&
    locations.totalElements > 0 &&
    page > locations.totalPages
  ) {
    redirect(
      locations.totalPages > 1
        ? `/delivery/pickup-locations?page=${locations.totalPages}`
        : "/delivery/pickup-locations",
    );
  }

  return (
    <PickupLocationsView
      locations={locations}
      page={page}
      canManage={hasPermission(user, DELIVERY_CONFIG_MANAGE)}
    />
  );
}
