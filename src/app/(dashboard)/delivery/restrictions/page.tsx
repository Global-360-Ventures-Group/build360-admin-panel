import type { Metadata } from "next";

import { listDeliveryMethods } from "@/features/delivery/methods/api";
import { listRestrictions } from "@/features/delivery/restrictions/api";
import { RestrictionsView } from "@/features/delivery/restrictions/restrictions-view";
import { DELIVERY_CALENDAR_MANAGE } from "@/features/delivery/shared";
import { listDeliverySlots } from "@/features/delivery/slots/api";
import { hasPermission, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Restrictions · Build360 Admin",
};

export default async function DeliveryRestrictionsPage() {
  // The layout already gated on `DELIVERY_CONFIG_VIEW`; this is only here for
  // the write grant, which for restrictions is the *calendar* one.
  const user = await requireUser();

  // A restriction names a method and time slots by id, so both lists are
  // needed to render it — and to fill the create dialog's pickers. Fetched
  // together rather than in series.
  const [restrictions, methods, slots] = await Promise.all([
    listRestrictions(),
    listDeliveryMethods(),
    listDeliverySlots(),
  ]);

  return (
    <RestrictionsView
      restrictions={restrictions}
      methods={methods}
      slots={slots}
      canManage={hasPermission(user, DELIVERY_CALENDAR_MANAGE)}
    />
  );
}
