import { forbidden } from "next/navigation";

import { DeliveryNav } from "@/features/delivery/delivery-nav";
import { DELIVERY_VIEW } from "@/features/delivery/shared";
import { hasPermission, requireUser } from "@/lib/auth/dal";

/**
 * The delivery section.
 *
 * `DELIVERY_CONFIG_VIEW` gates every screen under here, so the check lives on
 * the layout rather than being repeated five times. The two write grants —
 * `DELIVERY_CONFIG_MANAGE` and `DELIVERY_CALENDAR_MANAGE` — are read per page,
 * because they cover different halves of the section and neither implies the
 * other.
 */
export default async function DeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  if (!hasPermission(user, DELIVERY_VIEW)) forbidden();

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <DeliveryNav />
      {children}
    </div>
  );
}
