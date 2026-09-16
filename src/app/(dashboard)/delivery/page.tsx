import type { Metadata } from "next";

import { listDeliveryMethods } from "@/features/delivery/methods/api";
import { MethodsView } from "@/features/delivery/methods/methods-view";
import { DELIVERY_CONFIG_MANAGE } from "@/features/delivery/shared";
import { hasPermission, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Delivery · Build360 Admin",
};

export default async function DeliveryMethodsPage() {
  // The layout already gated on `DELIVERY_CONFIG_VIEW`; this is only here for
  // the write grant, which decides whether the controls render.
  const user = await requireUser();

  const methods = await listDeliveryMethods();

  return (
    <MethodsView
      methods={methods}
      canManage={hasPermission(user, DELIVERY_CONFIG_MANAGE)}
    />
  );
}
