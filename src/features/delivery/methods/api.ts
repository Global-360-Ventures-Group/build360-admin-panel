/**
 * The five `/admin/delivery/methods` endpoints.
 *
 * Reads need `DELIVERY_CONFIG_VIEW`; the update and the activate/deactivate
 * pair need `DELIVERY_CONFIG_MANAGE`.
 */

import { authedRequestData } from "@/lib/api/authed";

import { sortDeliveryMethods, type DeliveryMethod, type DeliveryMethodCode } from "./types";

/** Raw `AdminDeliveryMethodResponse`, as loose as the spec declares it. */
type AdminDeliveryMethodResponse = {
  id?: string;
  code?: DeliveryMethodCode;
  name?: string;
  description?: string;
  badge?: string;
  requiresPickupLocation?: boolean;
  active?: boolean;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
};

/** What `PUT /admin/delivery/methods/{id}` accepts — display fields only. */
export type DeliveryMethodInput = {
  name?: string;
  description?: string;
  badge?: string;
  displayOrder?: number;
};

/** `GET /admin/delivery/methods` — all three, in display order. */
export async function listDeliveryMethods(): Promise<DeliveryMethod[]> {
  const methods =
    await authedRequestData<AdminDeliveryMethodResponse[]>("/admin/delivery/methods");

  return sortDeliveryMethods(
    methods.flatMap((raw) => {
      const method = toDeliveryMethod(raw);
      return method ? [method] : [];
    }),
  );
}

/** `GET /admin/delivery/methods/{id}`. */
export async function getDeliveryMethod(id: string): Promise<DeliveryMethod | null> {
  return toDeliveryMethod(
    await authedRequestData<AdminDeliveryMethodResponse>(
      `/admin/delivery/methods/${id}`,
    ),
  );
}

/** `PUT /admin/delivery/methods/{id}` — name, description, badge, order. */
export function updateDeliveryMethod(
  id: string,
  input: DeliveryMethodInput,
): Promise<DeliveryMethod | null> {
  return authedRequestData<AdminDeliveryMethodResponse>(
    `/admin/delivery/methods/${id}`,
    { method: "PUT", body: input },
  ).then(toDeliveryMethod);
}

/**
 * `POST /admin/delivery/methods/{id}/activate` or `/deactivate`.
 *
 * Deactivating takes the method off the storefront. It does not touch the
 * calendar: the days and bookable slots already created for it stay, and come
 * back the moment it is activated again.
 */
export function setDeliveryMethodActive(
  id: string,
  active: boolean,
): Promise<DeliveryMethod | null> {
  return authedRequestData<AdminDeliveryMethodResponse>(
    `/admin/delivery/methods/${id}/${active ? "activate" : "deactivate"}`,
    { method: "POST" },
  ).then(toDeliveryMethod);
}

/** Narrow a raw response, or null when it lacks the id every action needs. */
function toDeliveryMethod(
  raw: AdminDeliveryMethodResponse,
): DeliveryMethod | null {
  if (!raw.id) return null;

  return {
    id: raw.id,
    code: raw.code ?? "STANDARD",
    name: raw.name ?? "",
    description: raw.description ?? "",
    badge: raw.badge ?? "",
    requiresPickupLocation: raw.requiresPickupLocation ?? false,
    // Absent reads as off rather than on: showing a method as live when the
    // API did not say so is the more dangerous guess.
    active: raw.active ?? false,
    displayOrder: raw.displayOrder ?? 0,
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? "",
  };
}
