/**
 * Click & Collect pickup points, mirroring `AdminPickupLocationResponse`.
 *
 * These are only reachable through the Click & Collect method: a calendar slot
 * on a method with `requiresPickupLocation` must name one of these, and no
 * other method may.
 *
 * There is no delete — a closed branch is deactivated, which leaves the
 * calendar slots that already point at it intact.
 */

export type PickupLocation = {
  id: string;
  name: string;
  addressLine: string;
  division: string;
  district: string;
  upazila: string;
  contactPhone: string;
  /** Null rather than 0 when unset: 0°N is a real place off the coast of Africa. */
  latitude: number | null;
  longitude: number | null;
  active: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** One page, mirroring `PageResponseAdminPickupLocationResponse`. */
export type PickupLocationPage = {
  content: PickupLocation[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

/** What the create/edit form collects. Numbers stay strings until validated. */
export type PickupLocationFormValues = {
  name: string;
  addressLine: string;
  division: string;
  district: string;
  upazila: string;
  contactPhone: string;
  latitude: string;
  longitude: string;
  displayOrder: string;
};

export const emptyPickupLocationForm: PickupLocationFormValues = {
  name: "",
  addressLine: "",
  division: "",
  district: "",
  upazila: "",
  contactPhone: "",
  latitude: "",
  longitude: "",
  displayOrder: "",
};

/** Field limits taken from `PickupLocationCreateRequest`. */
export const PICKUP_LOCATION_LIMITS = {
  name: 150,
  addressLine: 2000,
  division: 100,
  district: 100,
  upazila: 100,
  contactPhone: 20,
} as const;

/** Largest `size` the list endpoint accepts; anything more is a 400. */
export const PICKUP_LOCATION_PAGE_SIZE_MAX = 50;
export const PICKUP_LOCATION_PAGE_SIZE_DEFAULT = 20;

/** `"Mirpur, Dhaka, Dhaka"` — the parts that are actually set, in order. */
export function pickupLocationArea(location: PickupLocation): string {
  return [location.upazila, location.district, location.division]
    .filter(Boolean)
    .join(", ");
}

/** True when both coordinates are set, so a map link is worth offering. */
export function hasCoordinates(
  location: PickupLocation,
): location is PickupLocation & { latitude: number; longitude: number } {
  return location.latitude !== null && location.longitude !== null;
}
