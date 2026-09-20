import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CouponDetailView } from "@/features/coupons/coupon-detail-view";
import { findSampleCoupon } from "@/features/coupons/sample-data";
import { listSampleOrdersForVoucher } from "@/features/orders/sample-data";
import { requireUser } from "@/lib/auth/dal";

export async function generateMetadata({
  params,
}: PageProps<"/coupons/[id]">): Promise<Metadata> {
  const { id } = await params;
  const coupon = findSampleCoupon(id);

  return {
    title: coupon
      ? `${coupon.code} · Build360 Admin`
      : "Coupon · Build360 Admin",
  };
}

/**
 * One coupon, with the orders that redeemed it.
 *
 * The join happens here rather than in either fixture: the coupon fixture has
 * no idea which orders used a code, and giving it one would tie two
 * independent fixtures together for the sake of one table.
 */
export default async function CouponPage({
  params,
}: PageProps<"/coupons/[id]">) {
  await requireUser();

  const { id } = await params;
  const coupon = findSampleCoupon(id);

  if (!coupon) notFound();

  return (
    <CouponDetailView
      coupon={coupon}
      orders={listSampleOrdersForVoucher(coupon.code)}
    />
  );
}
