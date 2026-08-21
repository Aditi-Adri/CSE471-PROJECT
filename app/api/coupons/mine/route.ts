import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db";
import { checkCouponEligibility } from "@/lib/coupons/couponEligibility";
import { withErrorHandling } from "@/lib/api/withErrorHandling";

/**
 * GET /api/coupons/mine — coupons this account can still use right
 * now: private ones issued straight to them (referral rewards) plus
 * any public admin coupon, minus whichever they've already exhausted.
 * Powers the "My coupons" page (components/coupons/MyCouponsList.tsx).
 */
export const GET = withErrorHandling(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "You must be signed in." }, { status: 401 });
  }
  const userId = session.user.id;

  const coupons = await prisma.coupon.findMany({
    where: {
      isActive: true,
      OR: [{ issuedToUserId: userId }, { issuedToUserId: null }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      redemptions: { where: { userId }, select: { id: true } },
      _count: { select: { redemptions: true } },
    },
  });

  // Reuses the exact same eligibility check checkout uses (see its own
  // doc comment) rather than a second, ad hoc filter that could drift
  // from it — orderTotalBdt is passed as Infinity since this is a
  // listing, not a real cart: a coupon with a minimum spend is still
  // "available", just not usable on every order.
  const usable = coupons
    .filter(
      (coupon) =>
        checkCouponEligibility({
          coupon,
          userId,
          orderTotalBdt: Number.POSITIVE_INFINITY,
          totalRedemptions: coupon._count.redemptions,
          userRedemptions: coupon.redemptions.length,
        }).eligible
    )
    .map((coupon) => ({
      code: coupon.code,
      discountType: coupon.discountType,
      value: coupon.value,
      maxDiscountBdt: coupon.maxDiscountBdt,
      minOrderBdt: coupon.minOrderBdt,
      expiresAt: coupon.expiresAt,
      source: coupon.source,
    }));

  return Response.json({ coupons: usable });
});
