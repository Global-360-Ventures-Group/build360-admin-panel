import type { Metadata } from "next";

import { DELIVERY_CONFIG_MANAGE } from "@/features/delivery/shared";
import { listDeliverySlots } from "@/features/delivery/slots/api";
import { SlotsView } from "@/features/delivery/slots/slots-view";
import { hasPermission, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Time slots · Build360 Admin",
};

export default async function DeliverySlotsPage() {
  // The layout already gated on `DELIVERY_CONFIG_VIEW`; this is only here for
  // the write grant, which decides whether the controls render.
  const user = await requireUser();

  const slots = await listDeliverySlots();

  return (
    <SlotsView
      slots={slots}
      canManage={hasPermission(user, DELIVERY_CONFIG_MANAGE)}
    />
  );
}
