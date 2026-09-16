/**
 * The six `/admin/delivery/pickup-locations` endpoints.
 *
 * Reads need `DELIVERY_CONFIG_VIEW`; create, update and the
 * activate/deactivate pair need `DELIVERY_CONFIG_MANAGE`.
 */

import { authedRequestData } from "@/lib/api/authed";
import { fetchAllPages } from "@/lib/api/paging";

import type { PageResponse } from "../shared";
import {
  PICKUP_LOCATION_PAGE_SIZE_DEFAULT,
  PICKUP_LOCATION_PAGE_SIZE_MAX,
  type PickupLocation,
  type PickupLocationPage,
} from "./types";

/** Raw `AdminPickupLocationResponse`, as loose as the spec declares it. */
type AdminPickupLocationResponse = {
  id?: string;
  name?: string;
  addressLine?: string;
  division?: string;
  district?: string;
  upazila?: string;
  contactPhone?: string;
  latitude?: number | null;
  longitude?: number | null;
  active?: boolean;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * What create and update accept.
 *
 * Only `name` is required on create; update takes the same fields with
 * everything optional. One type covers both, and callers send the whole record
 * either way because update replaces rather than patches.
 */
export type PickupLocationInput = {
  name: string;
  addressLine?: string;
  division?: string;
  district?: string;
  upazila?: string;
  contactPhone?: string;
  latitude?: number;
  longitude?: number;
  displayOrder?: number;
};

/**
 * `GET /admin/delivery/pickup-locations` — one page.
 *
 * `size` is clamped to the API's maximum of 50; asking for more is a 400
 * rather than a truncated page, so it is clamped here instead of trusting the
 * caller. There is no search or status parameter — only paging.
 */
export async function listPickupLocations(
  query: { page?: number; size?: number } = {},
): Promise<PickupLocationPage> {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(0, query.page ?? 0)));
  params.set(
    "size",
    String(
      Math.min(
        PICKUP_LOCATION_PAGE_SIZE_MAX,
        Math.max(1, query.size ?? PICKUP_LOCATION_PAGE_SIZE_DEFAULT),
      ),
    ),
  );

  const page = await authedRequestData<PageResponse<AdminPickupLocationResponse>>(
    `/admin/delivery/pickup-locations?${params}`,
  );

  const content = (page.content ?? []).flatMap((raw) => {
    const location = toPickupLocation(raw);
    return location ? [location] : [];
  });

  return {
    content,
    page: page.page ?? 0,
    size: page.size ?? PICKUP_LOCATION_PAGE_SIZE_DEFAULT,
    totalElements: page.totalElements ?? content.length,
    totalPages: page.totalPages ?? 1,
    first: page.first ?? true,
    last: page.last ?? true,
  };
}

/**
 * Every pickup location, rather than one page.
 *
 * The calendar needs this: a Click & Collect slot must name a location, and a
 * picker that shows only the first twenty would silently hide valid choices.
 */
export async function listAllPickupLocations(): Promise<{
  locations: PickupLocation[];
  truncated: boolean;
}> {
  const { items, truncated } = await fetchAllPages(
    (page) => listPickupLocations({ page, size: PICKUP_LOCATION_PAGE_SIZE_MAX }),
    (location) => location.id,
  );

  return { locations: items, truncated };
}

/** `GET /admin/delivery/pickup-locations/{id}`. */
export async function getPickupLocation(
  id: string,
): Promise<PickupLocation | null> {
  return toPickupLocation(
    await authedRequestData<AdminPickupLocationResponse>(
      `/admin/delivery/pickup-locations/${id}`,
    ),
  );
}

/** `POST /admin/delivery/pickup-locations`. */
export function createPickupLocation(
  input: PickupLocationInput,
): Promise<PickupLocation | null> {
  return authedRequestData<AdminPickupLocationResponse>(
    "/admin/delivery/pickup-locations",
    { method: "POST", body: input },
  ).then(toPickupLocation);
}

/** `PUT /admin/delivery/pickup-locations/{id}`. */
export function updatePickupLocation(
  id: string,
  input: PickupLocationInput,
): Promise<PickupLocation | null> {
  return authedRequestData<AdminPickupLocationResponse>(
    `/admin/delivery/pickup-locations/${id}`,
    { method: "PUT", body: input },
  ).then(toPickupLocation);
}

/**
 * `POST /admin/delivery/pickup-locations/{id}/activate` or `/deactivate`.
 *
 * The only removal there is. Calendar slots already pointing at a deactivated
 * location keep pointing at it.
 */
export function setPickupLocationActive(
  id: string,
  active: boolean,
): Promise<PickupLocation | null> {
  return authedRequestData<AdminPickupLocationResponse>(
    `/admin/delivery/pickup-locations/${id}/${active ? "activate" : "deactivate"}`,
    { method: "POST" },
  ).then(toPickupLocation);
}

/** Narrow a raw response, or null when it lacks the id every action needs. */
function toPickupLocation(
  raw: AdminPickupLocationResponse,
): PickupLocation | null {
  if (!raw.id) return null;

  return {
    id: raw.id,
    name: raw.name ?? "",
    addressLine: raw.addressLine ?? "",
    division: raw.division ?? "",
    district: raw.district ?? "",
    upazila: raw.upazila ?? "",
    contactPhone: raw.contactPhone ?? "",
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    active: raw.active ?? false,
    displayOrder: raw.displayOrder ?? 0,
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? "",
  };
}
