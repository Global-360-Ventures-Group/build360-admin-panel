/**
 * The four `/admin/delivery/restrictions` endpoints.
 *
 * Reads need `DELIVERY_CONFIG_VIEW`; create and delete need
 * `DELIVERY_CALENDAR_MANAGE` — the calendar grant, not the config one.
 *
 * Note the missing verb: there is no PUT. A restriction is created and
 * deleted, never edited.
 */

import { authedRequest, authedRequestData } from "@/lib/api/authed";

import {
  sortRestrictions,
  type DeliveryRestriction,
  type RestrictionType,
} from "./types";

/** Raw `AdminDeliveryRestrictionResponse`, as loose as the spec declares it. */
type AdminDeliveryRestrictionResponse = {
  id?: string;
  name?: string;
  restrictionType?: RestrictionType;
  startDate?: string;
  endDate?: string;
  deliveryMethodId?: string | null;
  remarks?: string;
  slotIds?: string[];
  createdAt?: string;
  updatedAt?: string;
};

/**
 * What `POST /admin/delivery/restrictions` accepts.
 *
 * Omitting `deliveryMethodId` blocks every method; omitting `slotIds` blocks
 * the whole day. Both are "everything" rather than "nothing" — send them only
 * when narrowing.
 */
export type RestrictionInput = {
  name: string;
  restrictionType: RestrictionType;
  startDate: string;
  endDate: string;
  deliveryMethodId?: string;
  remarks?: string;
  slotIds?: string[];
};

/** `GET /admin/delivery/restrictions` — all of them, soonest first. */
export async function listRestrictions(): Promise<DeliveryRestriction[]> {
  const restrictions = await authedRequestData<
    AdminDeliveryRestrictionResponse[]
  >("/admin/delivery/restrictions");

  return sortRestrictions(
    restrictions.flatMap((raw) => {
      const restriction = toRestriction(raw);
      return restriction ? [restriction] : [];
    }),
  );
}

/** `GET /admin/delivery/restrictions/{id}`. */
export async function getRestriction(
  id: string,
): Promise<DeliveryRestriction | null> {
  return toRestriction(
    await authedRequestData<AdminDeliveryRestrictionResponse>(
      `/admin/delivery/restrictions/${id}`,
    ),
  );
}

/** `POST /admin/delivery/restrictions`. */
export function createRestriction(
  input: RestrictionInput,
): Promise<DeliveryRestriction | null> {
  return authedRequestData<AdminDeliveryRestrictionResponse>(
    "/admin/delivery/restrictions",
    { method: "POST", body: input },
  ).then(toRestriction);
}

/**
 * `DELETE /admin/delivery/restrictions/{id}` — un-blocks.
 *
 * A genuine delete, and the only one in this API: everywhere else the word
 * means archive or deactivate, and the record comes back. This one does not.
 *
 * Returns nothing — `ApiResponseVoid` — so it uses `authedRequest` rather than
 * the variant that insists on a payload.
 */
export async function deleteRestriction(id: string): Promise<void> {
  await authedRequest(`/admin/delivery/restrictions/${id}`, {
    method: "DELETE",
  });
}

/** Narrow a raw response, or null when it lacks the id every action needs. */
function toRestriction(
  raw: AdminDeliveryRestrictionResponse,
): DeliveryRestriction | null {
  if (!raw.id) return null;

  return {
    id: raw.id,
    name: raw.name ?? "",
    restrictionType: raw.restrictionType ?? "MANUAL_BLOCK",
    startDate: raw.startDate ?? "",
    endDate: raw.endDate ?? "",
    deliveryMethodId: raw.deliveryMethodId ?? "",
    remarks: raw.remarks ?? "",
    slotIds: (raw.slotIds ?? []).filter(Boolean),
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? "",
  };
}
