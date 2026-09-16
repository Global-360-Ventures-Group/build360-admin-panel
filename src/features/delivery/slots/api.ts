/**
 * The six `/admin/delivery/slots` endpoints.
 *
 * Reads need `DELIVERY_CONFIG_VIEW`; create, update and the
 * activate/deactivate pair need `DELIVERY_CONFIG_MANAGE`.
 */

import { authedRequestData } from "@/lib/api/authed";

import { sortDeliverySlots, type DayPart, type DeliverySlot } from "./types";

/** Raw `AdminDeliverySlotResponse`, as loose as the spec declares it. */
type AdminDeliverySlotResponse = {
  id?: string;
  name?: string;
  startTime?: string;
  endTime?: string;
  dayPart?: DayPart;
  displayOrder?: number;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * What create and update accept.
 *
 * Create requires `name`, `startTime` and `endTime`; update takes the same
 * fields with everything optional. One type covers both, and the callers send
 * the whole record either way.
 */
export type DeliverySlotInput = {
  name: string;
  /** `"HH:mm:ss"` — see `fromTimeInput` in `../shared`. */
  startTime: string;
  endTime: string;
  dayPart?: DayPart;
  displayOrder?: number;
};

/** `GET /admin/delivery/slots` — every slot, active or not, in day order. */
export async function listDeliverySlots(): Promise<DeliverySlot[]> {
  const slots =
    await authedRequestData<AdminDeliverySlotResponse[]>("/admin/delivery/slots");

  return sortDeliverySlots(
    slots.flatMap((raw) => {
      const slot = toDeliverySlot(raw);
      return slot ? [slot] : [];
    }),
  );
}

/** `GET /admin/delivery/slots/{id}`. */
export async function getDeliverySlot(id: string): Promise<DeliverySlot | null> {
  return toDeliverySlot(
    await authedRequestData<AdminDeliverySlotResponse>(
      `/admin/delivery/slots/${id}`,
    ),
  );
}

/** `POST /admin/delivery/slots`. */
export function createDeliverySlot(
  input: DeliverySlotInput,
): Promise<DeliverySlot | null> {
  return authedRequestData<AdminDeliverySlotResponse>("/admin/delivery/slots", {
    method: "POST",
    body: input,
  }).then(toDeliverySlot);
}

/** `PUT /admin/delivery/slots/{id}`. */
export function updateDeliverySlot(
  id: string,
  input: DeliverySlotInput,
): Promise<DeliverySlot | null> {
  return authedRequestData<AdminDeliverySlotResponse>(
    `/admin/delivery/slots/${id}`,
    { method: "PUT", body: input },
  ).then(toDeliverySlot);
}

/**
 * `POST /admin/delivery/slots/{id}/activate` or `/deactivate`.
 *
 * The only removal there is — no slot is ever deleted, so the calendar days
 * already built on one keep working.
 */
export function setDeliverySlotActive(
  id: string,
  active: boolean,
): Promise<DeliverySlot | null> {
  return authedRequestData<AdminDeliverySlotResponse>(
    `/admin/delivery/slots/${id}/${active ? "activate" : "deactivate"}`,
    { method: "POST" },
  ).then(toDeliverySlot);
}

/** Narrow a raw response, or null when it lacks the id every action needs. */
function toDeliverySlot(raw: AdminDeliverySlotResponse): DeliverySlot | null {
  if (!raw.id) return null;

  return {
    id: raw.id,
    name: raw.name ?? "",
    startTime: raw.startTime ?? "",
    endTime: raw.endTime ?? "",
    dayPart: raw.dayPart ?? "",
    displayOrder: raw.displayOrder ?? 0,
    active: raw.active ?? false,
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? "",
  };
}
